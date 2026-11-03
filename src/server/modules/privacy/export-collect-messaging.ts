import "server-only";
import { asc, eq, inArray, or } from "drizzle-orm";
import { decryptOptional } from "../../crypto";
import { db } from "../../db";
import { blocks, communityProfiles, contactRelationships, conversations, messages } from "../../db/schema";
import { iso } from "./export-format";

/**
 * Export: Kontakte, Gespräche und Blockierungen (PRI03). Rechte Dritter: von der Gegenseite
 * nur Pseudonym und die Nachrichten, die sie dieser Person geschickt hat; entfernte Texte
 * erscheinen als «entfernt» ohne Inhalt.
 */
export async function collectMessaging(accountId: string) {
  const [rels, blockRows] = await Promise.all([
    db
      .select({
        id: contactRelationships.id,
        low: contactRelationships.accountLow,
        high: contactRelationships.accountHigh,
        initiatorId: contactRelationships.initiatorId,
        status: contactRelationships.status,
        requestedAt: contactRelationships.requestedAt,
        endedAt: contactRelationships.endedAt,
        createdAt: contactRelationships.createdAt,
      })
      .from(contactRelationships)
      .where(or(eq(contactRelationships.accountLow, accountId), eq(contactRelationships.accountHigh, accountId))),
    db
      .select({ blockedId: blocks.blockedId, createdAt: blocks.createdAt, liftedAt: blocks.liftedAt })
      .from(blocks)
      .where(eq(blocks.blockerId, accountId)),
  ]);

  const otherOf = (r: { low: string; high: string }) => (r.low === accountId ? r.high : r.low);
  const otherIds = [...new Set([...rels.map(otherOf), ...blockRows.map((b) => b.blockedId)])];
  const names = new Map<string, string>();
  if (otherIds.length > 0) {
    const rows = await db
      .select({ id: communityProfiles.accountId, pseudonym: communityProfiles.pseudonym })
      .from(communityProfiles)
      .where(inArray(communityProfiles.accountId, otherIds));
    for (const r of rows) names.set(r.id, r.pseudonym);
  }
  const nameOf = (id: string) => names.get(id) ?? "Ehemaliges Mitglied";

  const convs = rels.length
    ? await db
        .select({ id: conversations.id, relationshipId: conversations.relationshipId })
        .from(conversations)
        .where(inArray(conversations.relationshipId, rels.map((r) => r.id)))
    : [];
  const msgs = convs.length
    ? await db
        .select({
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          seq: messages.seq,
          bodyEncrypted: messages.bodyEncrypted,
          deletedAt: messages.deletedAt,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(inArray(messages.conversationId, convs.map((c) => c.id)))
        .orderBy(asc(messages.conversationId), asc(messages.seq))
    : [];

  return {
    kontakte: rels.map((r) => ({
      pseudonym: nameOf(otherOf(r)),
      status: r.status,
      angefragt_von: r.initiatorId === accountId ? "ich" : "gegenseite",
      angefragt_utc: iso(r.requestedAt ?? r.createdAt),
      beendet_utc: iso(r.endedAt),
    })),
    gespraeche: convs.flatMap((c) => {
      const rel = rels.find((r) => r.id === c.relationshipId);
      if (!rel) return [];
      return [
        {
          gegenseite: nameOf(otherOf(rel)),
          nachrichten: msgs
            .filter((m) => m.conversationId === c.id)
            .map((m) => ({
              nummer: m.seq,
              von: m.senderId === accountId ? "ich" : "gegenseite",
              zeitpunkt_utc: iso(m.createdAt),
              text: m.bodyEncrypted ? decryptOptional(m.bodyEncrypted) : null,
              entfernt: !m.bodyEncrypted || m.deletedAt !== null,
            })),
        },
      ];
    }),
    blockierungen: blockRows.map((b) => ({
      pseudonym: nameOf(b.blockedId),
      seit_utc: iso(b.createdAt),
      aufgehoben_utc: iso(b.liftedAt),
    })),
  };
}
