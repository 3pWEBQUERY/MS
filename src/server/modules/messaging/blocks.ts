import "server-only";
import { and, desc, eq, inArray, isNull, or, sql as dsql } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { UserError } from "@/server/action";
import { db, type Executor } from "@/server/db";
import { blocks, communityProfiles, contactRelationships, conversations, deliveryJobs, notifications } from "@/server/db/schema";
import { isBlockedBetween, orderPair } from "./access";

export { isBlockedBetween };

/**
 * Blockieren (SAF01): gerichtete Entscheidung, die beidseitig sperrt.
 * Aktiv = lifted_at is null. Die blockierte Person erfährt weder Grund noch Blockierung.
 */

/**
 * Alle Konten, deren Inhalte für accountId ausgeblendet werden müssen – eigene
 * Blockierungen und Blockierungen durch andere (beidseitig, SAF01, COM01).
 */
export async function blockedIdsFor(accountId: string, executor: Executor = db): Promise<string[]> {
  const rows = await executor
    .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
    .from(blocks)
    .where(and(isNull(blocks.liftedAt), or(eq(blocks.blockerId, accountId), eq(blocks.blockedId, accountId))));
  const out = new Set<string>();
  for (const r of rows) out.add(r.blockerId === accountId ? r.blockedId : r.blockerId);
  return [...out];
}

/** Hat der Viewer diese Person selbst blockiert? (für eigene Hinweise, nie für die Gegenseite) */
export async function hasBlocked(blockerId: string, blockedId: string, executor: Executor = db): Promise<boolean> {
  const rows = await executor
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(isNull(blocks.liftedAt), eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Entwertet ausstehende Mitteilungen und Zustellaufträge zwischen zwei Personen
 * (MSG08, AT06). Mitteilungen laufen sofort ab, wartende E-Mail-Aufträge werden übersprungen.
 */
export async function invalidateNotificationsBetween(a: string, b: string, executor: Executor = db) {
  const now = new Date();
  const affected = await executor
    .update(notifications)
    .set({ expiresAt: now })
    .where(
      or(
        and(eq(notifications.accountId, a), eq(notifications.actorId, b)),
        and(eq(notifications.accountId, b), eq(notifications.actorId, a)),
      ),
    )
    .returning({ id: notifications.id });
  const ids = affected.map((r) => r.id);
  if (ids.length > 0) {
    await executor
      .update(deliveryJobs)
      .set({ status: "skipped", lastErrorCode: "blocked" })
      .where(and(inArray(deliveryJobs.notificationId, ids), inArray(deliveryJobs.status, ["pending", "failed"])));
  }
}

export type BlockListItem = {
  id: string;
  pseudonym: string;
  createdAt: Date;
  conversationId: string | null;
};

/** S41: nur eigene Entscheidungen (AT06). */
export async function listMyBlocks(viewer: Viewer): Promise<BlockListItem[]> {
  const me = viewer.accountId;
  const rows = await db
    .select({
      id: blocks.id,
      blockedId: blocks.blockedId,
      createdAt: blocks.createdAt,
      pseudonym: communityProfiles.pseudonym,
    })
    .from(blocks)
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, blocks.blockedId))
    .where(and(eq(blocks.blockerId, me), isNull(blocks.liftedAt)))
    .orderBy(desc(blocks.createdAt))
    .limit(200);

  // Ausgeblendete Gespräche bleiben für eigene Meldung und Export erreichbar (F05).
  const convRows =
    rows.length === 0
      ? []
      : await db
          .select({ id: conversations.id, low: contactRelationships.accountLow, high: contactRelationships.accountHigh })
          .from(conversations)
          .innerJoin(contactRelationships, eq(contactRelationships.id, conversations.relationshipId))
          .where(
            or(
              ...rows.map((r) => {
                const { low, high } = orderPair(me, r.blockedId);
                return and(eq(contactRelationships.accountLow, low), eq(contactRelationships.accountHigh, high));
              }),
            ),
          );
  const convByOther = new Map(convRows.map((c) => [c.low === me ? c.high : c.low, c.id]));

  return rows.map((r) => ({
    id: r.id,
    pseudonym: r.pseudonym ?? "Ehemaliges Mitglied",
    createdAt: r.createdAt,
    conversationId: convByOther.get(r.blockedId) ?? null,
  }));
}

/**
 * Blockieren (SAF01): beendet die Kontaktbeziehung atomar (gleiche Zeilensperre wie
 * Senden, AT05), verhindert Anfragen/Nachrichten beidseitig und entwertet Mitteilungen.
 */
export async function blockMember(viewer: Viewer, targetId: string): Promise<void> {
  const me = viewer.accountId;
  if (targetId === me) throw new UserError("Du kannst dich nicht selbst blockieren.");

  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: communityProfiles.accountId })
      .from(communityProfiles)
      .where(eq(communityProfiles.accountId, targetId));
    if (!target) throw new UserError("Diese Person ist nicht verfügbar.");

    await tx.insert(blocks).values({ blockerId: me, blockedId: targetId }).onConflictDoNothing();

    const { low, high } = orderPair(me, targetId);
    const [rel] = await tx
      .select({ id: contactRelationships.id, status: contactRelationships.status, initiatorId: contactRelationships.initiatorId })
      .from(contactRelationships)
      .where(and(eq(contactRelationships.accountLow, low), eq(contactRelationships.accountHigh, high)))
      .for("update");

    if (rel && (rel.status === "active" || rel.status === "pending")) {
      const now = new Date();
      // Ausstehend → abgelehnt bzw. zurückgezogen; aktiv → beendet. Beide Zustimmungen entfallen.
      const status = rel.status === "active" ? "ended" : rel.initiatorId === me ? "withdrawn" : "declined";
      await tx
        .update(contactRelationships)
        .set({
          status,
          lowConsentAt: null,
          highConsentAt: null,
          endedAt: now,
          endedBy: me,
          expiresAt: null,
          version: dsql`${contactRelationships.version} + 1`,
        })
        .where(eq(contactRelationships.id, rel.id));
    }

    await invalidateNotificationsBetween(me, targetId, tx);
  });
}

/** Aufheben stellt keinen Kontakt wieder her (SAF01, AT06). */
export async function unblock(viewer: Viewer, blockId: string): Promise<void> {
  const res = await db
    .update(blocks)
    .set({ liftedAt: new Date() })
    .where(and(eq(blocks.id, blockId), eq(blocks.blockerId, viewer.accountId), isNull(blocks.liftedAt)))
    .returning({ id: blocks.id });
  if (res.length === 0) throw new UserError("Diese Blockierung besteht nicht mehr.");
}

/** Für S41 «Blockieren bestätigen»: Pseudonym des Ziels, sofern ein Profil besteht. */
export async function getBlockTarget(viewer: Viewer, targetId: string) {
  if (targetId === viewer.accountId) return null;
  const [row] = await db
    .select({ accountId: communityProfiles.accountId, pseudonym: communityProfiles.pseudonym })
    .from(communityProfiles)
    .where(eq(communityProfiles.accountId, targetId));
  if (!row) return null;
  return { accountId: row.accountId, pseudonym: row.pseudonym, alreadyBlocked: await hasBlocked(viewer.accountId, targetId) };
}
