import "server-only";
import { and, desc, eq, gt, isNull, lt, notInArray, or, sql as dsql } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { UserError } from "@/server/action";
import { db } from "@/server/db";
import { deliveryJobs, notifications, userPreferences } from "@/server/db/schema";
import { DEFAULT_TZ, localDateString, zonedToUtc, addDays } from "@/lib/time";
import { notify, type NotificationType } from "./notify";
import { blockedIdsFor } from "./blocks";
import { resolveNotificationTarget } from "./targets";

/**
 * Benachrichtigungszentrale (S28, MSG07, MSG08) und Einstellungen (S14).
 * Mitteilungen sind neutral: keine Inhalte, keine Vorschauen, nur sichere Zielreferenzen.
 */

/** Neutrale Bezeichnungen je Ereignistyp (MSG07). */
export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  contact_request: "Neue Kontaktanfrage",
  contact_accepted: "Deine Kontaktanfrage wurde angenommen",
  comment_reply: "Neue Antwort auf deinen Beitrag",
  group_decision: "Entscheidung zu deiner Gruppenmitgliedschaft",
  new_message: "Neue Nachricht",
  moderation_decision: "Entscheidung der Moderation",
  security: "Sicherheitshinweis zu deinem Konto",
  system: "Hinweis der Plattform",
};

/** Abschaltbare soziale In-App-Typen (S14). Moderation, Sicherheit und System bleiben immer aktiv. */
export const SOCIAL_TYPES = [
  ["contact_request", "Kontaktanfragen", "Wenn dir jemand eine Kontaktanfrage sendet."],
  ["contact_accepted", "Angenommene Anfragen", "Wenn jemand deine Kontaktanfrage annimmt."],
  ["new_message", "Neue Nachrichten", "Höchstens ein Hinweis je Gespräch, bis du es geöffnet hast."],
  ["comment_reply", "Antworten auf deine Beiträge", "Wenn jemand auf deinen Beitrag antwortet."],
  ["group_decision", "Gruppenentscheidungen", "Wenn über deine Anfrage für eine geschlossene Gruppe oder deine Mitgliedschaft entschieden wurde."],
] as const satisfies readonly (readonly [NotificationType, string, string])[];

export type NotificationItem = {
  id: string;
  type: NotificationType;
  label: string;
  createdAt: Date;
  read: boolean;
};

const PAGE = 20;

/** Eigene, nicht abgelaufene Mitteilungen; Hinweise blockierter Akteure fehlen (SAF01). */
export async function listNotifications(
  viewer: Viewer,
  cursor?: string | null,
): Promise<{ items: NotificationItem[]; nextCursor: string | null; unread: number }> {
  const me = viewer.accountId;
  const now = new Date();
  const blocked = await blockedIdsFor(me);
  let cursorDate: Date | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const [ts, id] = cursor.split("_");
    const d = new Date(Number(ts));
    if (!Number.isNaN(d.getTime()) && id && /^[0-9a-f-]{36}$/i.test(id)) {
      cursorDate = d;
      cursorId = id;
    }
  }
  const base = and(
    eq(notifications.accountId, me),
    or(isNull(notifications.expiresAt), gt(notifications.expiresAt, now)),
    blocked.length > 0
      ? or(isNull(notifications.actorId), notInArray(notifications.actorId, blocked))
      : undefined,
  );
  const rows = await db
    .select({ id: notifications.id, type: notifications.type, createdAt: notifications.createdAt, readAt: notifications.readAt })
    .from(notifications)
    .where(
      and(
        base,
        cursorDate && cursorId
          ? or(
              lt(notifications.createdAt, cursorDate),
              and(eq(notifications.createdAt, cursorDate), lt(notifications.id, cursorId)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(PAGE + 1);
  const [u] = await db
    .select({ c: dsql<number>`count(*)::int` })
    .from(notifications)
    .where(and(base, isNull(notifications.readAt)));

  const items = rows.slice(0, PAGE).map((r) => ({
    id: r.id,
    type: r.type as NotificationType,
    label: NOTIFICATION_LABELS[r.type as NotificationType] ?? "Hinweis",
    createdAt: r.createdAt,
    read: r.readAt !== null,
  }));
  const last = rows.length > PAGE ? items[items.length - 1] : null;
  return {
    items,
    nextCursor: last ? `${last.createdAt.getTime()}_${last.id}` : null,
    unread: Number(u?.c ?? 0),
  };
}

/**
 * Öffnet eine Mitteilung: als gelesen markieren und Ziel erneut prüfen (MSG08).
 * null = unbekannt/fremd (neutral 404).
 */
export async function openNotification(viewer: Viewer, id: string): Promise<{ href: string | null } | null> {
  const [n] = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      targetType: notifications.targetType,
      targetId: notifications.targetId,
      actorId: notifications.actorId,
      readAt: notifications.readAt,
      expiresAt: notifications.expiresAt,
    })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.accountId, viewer.accountId)));
  if (!n) return null;
  if (!n.readAt) await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, n.id));
  if (n.expiresAt && n.expiresAt <= new Date()) return { href: null };
  const target = await resolveNotificationTarget(viewer.accountId, n);
  return { href: target.ok ? target.href : null };
}

export async function markNotificationRead(viewer: Viewer, id: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.accountId, viewer.accountId), isNull(notifications.readAt)));
}

export async function markAllNotificationsRead(viewer: Viewer): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.accountId, viewer.accountId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  return rows.length;
}

/* ───────────────────────── Einstellungen (S14) ───────────────────────── */

export type NotificationPrefs = {
  inAppTypes: string[];
  emailSocial: boolean;
  quietStart: string;
  quietEnd: string;
  /** Lokales Datum (YYYY-MM-DD), bis zu dem E-Mail-Hinweise pausiert sind (inklusive) */
  pausedUntilDate: string | null;
  timezone: string;
  version: number;
};

const DEFAULT_IN_APP = ["contact_request", "contact_accepted", "comment_reply", "group_decision", "new_message", "moderation_decision"];

export async function getNotificationPrefs(viewer: Viewer): Promise<NotificationPrefs> {
  const [p] = await db
    .select({
      inAppTypes: userPreferences.inAppTypes,
      emailSocial: userPreferences.emailSocial,
      quietStart: userPreferences.quietStart,
      quietEnd: userPreferences.quietEnd,
      pausedUntil: userPreferences.pausedUntil,
      timezone: userPreferences.timezone,
      version: userPreferences.version,
    })
    .from(userPreferences)
    .where(eq(userPreferences.accountId, viewer.accountId));
  const tz = p?.timezone ?? DEFAULT_TZ;
  const paused = p?.pausedUntil && p.pausedUntil > new Date() ? p.pausedUntil : null;
  return {
    inAppTypes: p?.inAppTypes ?? DEFAULT_IN_APP,
    emailSocial: p?.emailSocial ?? false,
    quietStart: p?.quietStart ?? "20:00",
    quietEnd: p?.quietEnd ?? "08:00",
    // pausedUntil ist der Beginn des Folgetags → als letzter Pausentag anzeigen.
    pausedUntilDate: paused ? localDateString(new Date(paused.getTime() - 60_000), tz) : null,
    timezone: tz,
    version: p?.version ?? 0,
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateNotificationPrefs(
  viewer: Viewer,
  input: {
    inAppTypes: string[];
    emailSocial: boolean;
    quietStart: string;
    quietEnd: string;
    pausedUntilDate: string | null;
    version: number;
  },
): Promise<void> {
  const fieldErrors: Record<string, string> = {};
  if (!TIME_RE.test(input.quietStart)) fieldErrors.quietStart = "Bitte gib eine Uhrzeit im Format HH:MM an.";
  if (!TIME_RE.test(input.quietEnd)) fieldErrors.quietEnd = "Bitte gib eine Uhrzeit im Format HH:MM an.";
  const tz = viewer.prefs.timezone || DEFAULT_TZ;
  let pausedUntil: Date | null = null;
  if (input.pausedUntilDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.pausedUntilDate)) fieldErrors.pausedUntil = "Bitte wähle ein gültiges Datum.";
    else {
      const today = localDateString(new Date(), tz);
      const max = addDays(today, 365);
      if (input.pausedUntilDate < today) fieldErrors.pausedUntil = "Das Datum liegt in der Vergangenheit.";
      else if (input.pausedUntilDate > max) fieldErrors.pausedUntil = "Eine Pause ist höchstens ein Jahr möglich.";
      // Pause gilt bis und mit dem gewählten Tag (Ende = Beginn des Folgetags, lokale Zeit).
      else pausedUntil = zonedToUtc(addDays(input.pausedUntilDate, 1), "00:00", tz);
    }
  }
  if (Object.keys(fieldErrors).length > 0) throw new UserError("Bitte prüfe die markierten Angaben.", fieldErrors);

  const allowed = new Set<string>(SOCIAL_TYPES.map(([t]) => t));
  // Entscheidungen der Moderation bleiben immer aktiv (SAF05).
  const inAppTypes = [...new Set([...input.inAppTypes.filter((t) => allowed.has(t)), "moderation_decision"])];
  const values = {
    inAppTypes,
    emailSocial: input.emailSocial,
    quietStart: input.quietStart,
    quietEnd: input.quietEnd,
    pausedUntil,
  };

  if (input.version === 0) {
    const inserted = await db
      .insert(userPreferences)
      .values({ accountId: viewer.accountId, ...values })
      .onConflictDoNothing()
      .returning({ id: userPreferences.accountId });
    if (inserted.length > 0) return;
  }
  const res = await db
    .update(userPreferences)
    .set({ ...values, version: dsql`${userPreferences.version} + 1` })
    .where(and(eq(userPreferences.accountId, viewer.accountId), eq(userPreferences.version, Math.max(input.version, 1))))
    .returning({ v: userPreferences.version });
  if (res.length === 0)
    throw new UserError("Die Einstellungen wurden inzwischen an anderer Stelle geändert. Bitte lade die Seite neu.", undefined, {
      conflict: true,
    });

  // Abgeschaltete E-Mail-Hinweise: wartende Aufträge entfallen (MSG08).
  if (!input.emailSocial) {
    await db
      .update(deliveryJobs)
      .set({ status: "skipped", lastErrorCode: "opted_out" })
      .where(and(eq(deliveryJobs.accountId, viewer.accountId), or(eq(deliveryJobs.status, "pending"), eq(deliveryJobs.status, "failed"))));
  }
}

/** «Test ohne Inhaltsvorschau» (S14): legt einen neutralen System-Hinweis an. */
export async function createTestNotification(viewer: Viewer): Promise<void> {
  const minute = Math.floor(Date.now() / 60_000);
  await notify({
    accountId: viewer.accountId,
    type: "system",
    dedupeKey: `test:${viewer.accountId}:${minute}`,
  });
}
