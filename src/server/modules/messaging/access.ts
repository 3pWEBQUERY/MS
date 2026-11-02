import "server-only";
import { and, eq, gt, inArray, isNull, lt, or, sql as dsql } from "drizzle-orm";
import { db, type Executor } from "@/server/db";
import {
  accounts,
  blocks,
  communityProfiles,
  contactRelationships,
  deliveryJobs,
  notifications,
  sanctions,
  sessions,
} from "@/server/db/schema";

/**
 * Gemeinsame, framework-freie Prüfungen für Kontakte, Gespräche und Zustellung.
 * Wird von Seiten, Server Actions, dem SSE-Endpunkt und dem Worker verwendet
 * (keine Imports aus next/*).
 */

/** Kanonisches Personenpaar: sortierte IDs, accountLow < accountHigh (MSG02, PRD 09). */
export function orderPair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Ausstehende Anfragen verfallen nach 14 Tagen (MSG02). */
export const REQUEST_TTL_MS = 14 * DAY_MS;
/** Neue Anfrage frühestens nach 30 Tagen (MSG02). */
export const REQUEST_COOLDOWN_MS = 30 * DAY_MS;
/** Höchstens 20 ausstehende Anfragen je Mitglied (MSG02). */
export const MAX_PENDING_OUTGOING = 20;
/** Nachrichtenlänge (MSG03). */
export const MESSAGE_MAX = 2000;

/**
 * Konto kann an Kontakt und Chat teilnehmen: aktiv (oder nur schreibbeschränkt),
 * nicht gelöscht/deaktiviert und ohne laufende Kontosperre (MSG04, ACC08).
 */
export async function accountsUsable(ids: string[], executor: Executor = db): Promise<boolean> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return true;
  const rows = await executor
    .select({ id: accounts.id })
    .from(accounts)
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, accounts.id))
    .where(
      and(
        inArray(accounts.id, unique),
        inArray(accounts.status, ["active", "restricted"]),
        isNull(accounts.deactivatedAt),
        dsql`not exists (
          select 1 from ${sanctions}
          where ${sanctions.accountId} = ${accounts.id}
            and ${sanctions.kind} = 'account_suspend'
            and ${sanctions.liftedAt} is null
            and ${sanctions.startsAt} <= now()
            and (${sanctions.endsAt} is null or ${sanctions.endsAt} > now())
        )`,
      ),
    );
  return rows.length === unique.length;
}

/** Aktive Schreibsperre durch Moderation (SAF04) – im Transaktionskontext geprüft. */
export async function hasWriteSuspension(accountId: string, executor: Executor = db): Promise<boolean> {
  const now = new Date();
  const rows = await executor
    .select({ id: sanctions.id })
    .from(sanctions)
    .where(
      and(
        eq(sanctions.accountId, accountId),
        eq(sanctions.kind, "write_suspend"),
        isNull(sanctions.liftedAt),
        or(isNull(sanctions.endsAt), gt(sanctions.endsAt, now)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Pseudonyme zu Konto-IDs (nie E-Mail, PRD 03). */
export async function pseudonymsFor(ids: string[], executor: Executor = db): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await executor
    .select({ accountId: communityProfiles.accountId, pseudonym: communityProfiles.pseudonym })
    .from(communityProfiles)
    .where(inArray(communityProfiles.accountId, unique));
  return new Map(rows.map((r) => [r.accountId, r.pseudonym]));
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/** Besteht zwischen a und b eine aktive Blockierung (in beliebiger Richtung)? (SAF01) */
export async function isBlockedBetween(a: string, b: string, executor: Executor = db): Promise<boolean> {
  if (a === b) return false;
  const rows = await executor
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      and(
        isNull(blocks.liftedAt),
        or(
          and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
          and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)),
        ),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Entwertet die Anfrage-Mitteilung beim Empfänger (MSG08: veraltete Hinweise entfallen). */
export async function retireRequestNotifications(executor: Executor, relationshipId: string) {
  const rows = await executor
    .update(notifications)
    .set({ expiresAt: new Date() })
    .where(and(eq(notifications.type, "contact_request"), eq(notifications.targetId, relationshipId)))
    .returning({ id: notifications.id });
  if (rows.length > 0)
    await executor
      .update(deliveryJobs)
      .set({ status: "skipped", lastErrorCode: "stale" })
      .where(
        and(
          inArray(
            deliveryJobs.notificationId,
            rows.map((r) => r.id),
          ),
          inArray(deliveryJobs.status, ["pending", "failed"]),
        ),
      );
}

/** Periodisch (Worker): abgelaufene Anfragen auf «expired» setzen, Sperrfrist 30 Tage (MSG02). */
export async function expirePendingRequests(executor: Executor = db): Promise<number> {
  const rows = await executor
    .update(contactRelationships)
    .set({
      status: "expired",
      lowConsentAt: null,
      highConsentAt: null,
      cooldownUntil: dsql`${contactRelationships.expiresAt} + interval '30 days'`,
      version: dsql`${contactRelationships.version} + 1`,
    })
    .where(and(eq(contactRelationships.status, "pending"), lt(contactRelationships.expiresAt, new Date())))
    .returning({ id: contactRelationships.id });
  for (const r of rows) await retireRequestNotifications(executor, r.id);
  return rows.length;
}

/**
 * Sitzung noch gültig? Ohne das Inaktivitätsfenster zu verlängern – ein offener
 * Gesprächskanal hält die Sitzung nicht künstlich am Leben (ACC03).
 */
export async function sessionStillValid(sessionId: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now), gt(sessions.idleExpiresAt, now)))
    .limit(1);
  return rows.length > 0;
}
