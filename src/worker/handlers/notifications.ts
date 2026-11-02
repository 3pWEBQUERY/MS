import { and, asc, eq, inArray, lte, or, sql as dsql } from "drizzle-orm";
import { db } from "@/server/db";
import { accounts, deliveryJobs, notifications, sanctions, userPreferences } from "@/server/db/schema";
import { env } from "@/server/env";
import { sendMail } from "@/server/mailer";
import { addDays, DEFAULT_TZ, inQuietHours, localDateString, zonedToUtc } from "@/lib/time";
import { expirePendingRequests } from "@/server/modules/messaging/access";
import { resolveNotificationTarget } from "@/server/modules/messaging/targets";
import type { Handler, PeriodicTask } from "../types";

/**
 * Zustellung sozialer E-Mail-Hinweise (MSG07, MSG08, AT06).
 * – Vor jedem Versand erneut prüfen: Empfänger aktiv, E-Mail-Hinweise aktiv, Mitteilung
 *   existiert, ist nicht gelesen/abgelaufen, Akteur nicht blockiert, Ziel noch berechtigt.
 * – Ruhezeit und Pause beachten; danach höchstens EINE neutrale Sammelmail pro lokalem Tag.
 * – Fehler → failed mit Retry-Zähler und Backoff, nach Ausschöpfen dead (betrieblicher Fehler).
 * – Nie doppelt: der Tages-Sammelauftrag wird vor dem Versand als «in Zustellung» markiert;
 *   ein unklarer Ausgang wird nicht wiederholt, sondern als betrieblicher Fehler abgelegt.
 * Die E-Mail-Adresse wird ausschliesslich hier aus identity.accounts gelesen.
 */

const MAX_ATTEMPTS = 5;
/** Kurze Sammelfrist: wer den Hinweis in der App liest, erhält keine E-Mail. */
const GRACE_MS = 15 * 60 * 1000;
const DIGEST_CHANNEL = "email_digest";
const IN_FLIGHT = "in_flight";
const IN_FLIGHT_STALE_MS = 5 * 60 * 1000;

type Prefs = {
  emailSocial: boolean;
  quietStart: string;
  quietEnd: string;
  pausedUntil: Date | null;
  timezone: string;
};

/** Nächster Zeitpunkt, an dem die Ruhezeit endet (lokale Wandzeit → UTC). */
function quietEndAfter(now: Date, prefs: Prefs): Date {
  const tz = prefs.timezone || DEFAULT_TZ;
  const today = localDateString(now, tz);
  const candidate = zonedToUtc(today, prefs.quietEnd, tz);
  return candidate > now ? candidate : zonedToUtc(addDays(today, 1), prefs.quietEnd, tz);
}

/** Beginn des nächsten Zustellfensters am Folgetag (nach Ende der Ruhezeit). */
function nextDayWindow(now: Date, prefs: Prefs): Date {
  const tz = prefs.timezone || DEFAULT_TZ;
  const tomorrow = addDays(localDateString(now, tz), 1);
  const start = prefs.quietStart === prefs.quietEnd ? "08:00" : prefs.quietEnd;
  return zonedToUtc(tomorrow, start, tz);
}

const backoff = (attempts: number) => new Date(Date.now() + Math.min(6 * 3600, 2 ** attempts * 60) * 1000);

async function skip(ids: string[], code: string) {
  if (ids.length === 0) return;
  await db
    .update(deliveryJobs)
    .set({ status: "skipped", lastErrorCode: code })
    .where(and(inArray(deliveryJobs.id, ids), inArray(deliveryJobs.status, ["pending", "failed"])));
}

async function postpone(ids: string[], until: Date) {
  if (ids.length === 0) return;
  await db
    .update(deliveryJobs)
    .set({ nextRunAt: until })
    .where(and(inArray(deliveryJobs.id, ids), inArray(deliveryJobs.status, ["pending", "failed"])));
}

async function recipientUsable(accountId: string): Promise<{ email: string } | null> {
  const [acc] = await db
    .select({ email: accounts.email, status: accounts.status, verified: accounts.emailVerifiedAt, deactivatedAt: accounts.deactivatedAt })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (!acc || !acc.verified || acc.deactivatedAt || (acc.status !== "active" && acc.status !== "restricted")) return null;
  const [suspended] = await db
    .select({ id: sanctions.id })
    .from(sanctions)
    .where(
      and(
        eq(sanctions.accountId, accountId),
        eq(sanctions.kind, "account_suspend"),
        dsql`${sanctions.liftedAt} is null`,
        dsql`(${sanctions.endsAt} is null or ${sanctions.endsAt} > now())`,
      ),
    )
    .limit(1);
  return suspended ? null : { email: acc.email };
}

/** Verarbeitet alle fälligen Aufträge eines Kontos. */
async function processAccount(accountId: string): Promise<void> {
  const now = new Date();
  const due = await db
    .select({ id: deliveryJobs.id, notificationId: deliveryJobs.notificationId, createdAt: deliveryJobs.createdAt })
    .from(deliveryJobs)
    .where(
      and(
        eq(deliveryJobs.accountId, accountId),
        eq(deliveryJobs.channel, "email"),
        inArray(deliveryJobs.status, ["pending", "failed"]),
        lte(deliveryJobs.nextRunAt, now),
      ),
    )
    .orderBy(asc(deliveryJobs.createdAt))
    .limit(200);
  if (due.length === 0) return;
  const allIds = due.map((d) => d.id);

  const recipient = await recipientUsable(accountId);
  if (!recipient) return skip(allIds, "recipient_inactive");

  const [p] = await db
    .select({
      emailSocial: userPreferences.emailSocial,
      quietStart: userPreferences.quietStart,
      quietEnd: userPreferences.quietEnd,
      pausedUntil: userPreferences.pausedUntil,
      timezone: userPreferences.timezone,
    })
    .from(userPreferences)
    .where(eq(userPreferences.accountId, accountId));
  const prefs: Prefs = {
    emailSocial: p?.emailSocial ?? false,
    quietStart: p?.quietStart ?? "20:00",
    quietEnd: p?.quietEnd ?? "08:00",
    pausedUntil: p?.pausedUntil ?? null,
    timezone: p?.timezone ?? DEFAULT_TZ,
  };
  if (!prefs.emailSocial) return skip(allIds, "opted_out");

  // Jede Mitteilung erneut berechtigen (MSG08).
  const notes = await db
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
    .where(
      and(
        eq(notifications.accountId, accountId),
        inArray(
          notifications.id,
          due.map((d) => d.notificationId).filter((v): v is string => Boolean(v)),
        ),
      ),
    );
  const byId = new Map(notes.map((n) => [n.id, n]));
  const valid: typeof due = [];
  const invalid: string[] = [];
  for (const job of due) {
    const n = job.notificationId ? byId.get(job.notificationId) : undefined;
    if (!n || n.readAt || (n.expiresAt && n.expiresAt <= now)) {
      invalid.push(job.id);
      continue;
    }
    const target = await resolveNotificationTarget(accountId, n);
    if (!target.ok) invalid.push(job.id);
    else valid.push(job);
  }
  await skip(invalid, "stale_or_unauthorized");
  if (valid.length === 0) return;
  const validIds = valid.map((v) => v.id);

  if (prefs.pausedUntil && prefs.pausedUntil > now) return postpone(validIds, prefs.pausedUntil);
  if (inQuietHours(prefs.quietStart, prefs.quietEnd, now, prefs.timezone)) return postpone(validIds, quietEndAfter(now, prefs));
  // Sammelfrist: erst senden, wenn der jüngste Hinweis nicht sofort in der App gelesen wurde.
  const oldest = valid[0]!.createdAt;
  if (now.getTime() - oldest.getTime() < GRACE_MS) return postpone(validIds, new Date(oldest.getTime() + GRACE_MS));

  // Höchstens eine Sammelmail pro lokalem Tag (MSG08).
  const day = localDateString(now, prefs.timezone);
  const digestKey = `digest:${accountId}:${day}`;
  await db
    .insert(deliveryJobs)
    .values({ accountId, channel: DIGEST_CHANNEL, status: "pending", dedupeKey: digestKey, nextRunAt: now })
    .onConflictDoNothing({ target: deliveryJobs.dedupeKey });
  const [digest] = await db
    .select({
      id: deliveryJobs.id,
      status: deliveryJobs.status,
      lastErrorCode: deliveryJobs.lastErrorCode,
      nextRunAt: deliveryJobs.nextRunAt,
      updatedAt: deliveryJobs.updatedAt,
    })
    .from(deliveryJobs)
    .where(eq(deliveryJobs.dedupeKey, digestKey));
  if (!digest) return;

  if (digest.status === "sent" || digest.status === "dead" || digest.status === "skipped") {
    // Heute bereits zugestellt (oder betrieblicher Fehler) → morgen nach der Ruhezeit.
    return postpone(validIds, nextDayWindow(now, prefs));
  }
  if (digest.lastErrorCode === IN_FLIGHT) {
    // Ein anderer Lauf stellt gerade zu → nichts tun.
    if (now.getTime() - digest.updatedAt.getTime() < IN_FLIGHT_STALE_MS) return;
    // Unklarer Ausgang eines früheren Versuchs: nicht erneut senden (nie doppelte Mail).
    await db.update(deliveryJobs).set({ status: "dead", lastErrorCode: "unknown_outcome" }).where(eq(deliveryJobs.id, digest.id));
    console.error(`[worker] Sammelmail ${digest.id}: unklarer Zustellausgang → Fehlerwarteschlange`);
    return postpone(validIds, nextDayWindow(now, prefs));
  }
  if (digest.nextRunAt > now) return postpone(validIds, digest.nextRunAt);

  // Vor dem Versand als «in Zustellung» markieren (Claim mit Bedingung gegen Parallelität).
  const claimed = await db
    .update(deliveryJobs)
    .set({ attempts: dsql`${deliveryJobs.attempts} + 1`, lastErrorCode: IN_FLIGHT })
    .where(
      and(
        eq(deliveryJobs.id, digest.id),
        inArray(deliveryJobs.status, ["pending", "failed"]),
        or(dsql`${deliveryJobs.lastErrorCode} is null`, dsql`${deliveryJobs.lastErrorCode} <> ${IN_FLIGHT}`),
      ),
    )
    .returning({ attempts: deliveryJobs.attempts });
  if (claimed.length === 0) return;
  const attempts = claimed[0]!.attempts;

  try {
    await sendMail(recipient.email, { kind: "social_digest", count: valid.length, link: `${env.appUrl}/mitteilungen` });
  } catch (err) {
    const dead = attempts >= MAX_ATTEMPTS;
    const code = err instanceof Error ? err.name : "error";
    const retryAt = backoff(attempts);
    await db
      .update(deliveryJobs)
      .set({ status: dead ? "dead" : "failed", lastErrorCode: code, nextRunAt: retryAt })
      .where(eq(deliveryJobs.id, digest.id));
    if (dead) {
      await db
        .update(deliveryJobs)
        .set({ status: "dead", lastErrorCode: "digest_failed" })
        .where(inArray(deliveryJobs.id, validIds));
      // Betrieblicher Fehler ohne Inhalte oder Adressen (NFR15)
      console.error(`[worker] Sammelmail ${digest.id} nach ${attempts} Versuchen fehlgeschlagen → Fehlerwarteschlange`);
    } else {
      await db
        .update(deliveryJobs)
        .set({ status: "failed", attempts: dsql`${deliveryJobs.attempts} + 1`, lastErrorCode: code, nextRunAt: retryAt })
        .where(inArray(deliveryJobs.id, validIds));
    }
    return;
  }

  await db.update(deliveryJobs).set({ status: "sent", lastErrorCode: null }).where(eq(deliveryJobs.id, digest.id));
  await db
    .update(deliveryJobs)
    .set({ status: "sent", lastErrorCode: null, attempts: dsql`${deliveryJobs.attempts} + 1` })
    .where(inArray(deliveryJobs.id, validIds));
}

/** Alle Konten mit fälligen E-Mail-Aufträgen abarbeiten. */
async function deliverDue(): Promise<void> {
  const rows = await db
    .selectDistinct({ accountId: deliveryJobs.accountId })
    .from(deliveryJobs)
    .where(
      and(
        eq(deliveryJobs.channel, "email"),
        inArray(deliveryJobs.status, ["pending", "failed"]),
        lte(deliveryJobs.nextRunAt, new Date()),
      ),
    )
    .limit(500);
  for (const r of rows) {
    try {
      await processAccount(r.accountId);
    } catch (err) {
      console.error(`[worker] Zustellung fehlgeschlagen: ${err instanceof Error ? err.name : "error"}`);
    }
  }
}

/** Outbox-Typ «notification.deliver»: Konto-ID als aggregateId – verarbeitet dessen fällige Aufträge. */
export const notificationHandlers: Record<string, Handler> = {
  "notification.deliver": async ({ aggregateId }) => {
    await processAccount(aggregateId);
  },
};

export const notificationTasks: PeriodicTask[] = [
  { name: "notifications.deliver", everyMs: 60_000, run: deliverDue },
  {
    // MSG02: ausstehende Kontaktanfragen verfallen nach 14 Tagen.
    name: "contacts.expire",
    everyMs: 15 * 60_000,
    run: async () => {
      await expirePendingRequests();
    },
  },
];
