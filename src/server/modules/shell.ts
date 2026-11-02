import "server-only";
import { and, count, eq, gt, isNull, or, sql as dsql } from "drizzle-orm";
import type { Viewer } from "../auth/viewer";
import { db } from "../db";
import { contactRelationships, conversations, conversationViews, notifications } from "../db/schema";

/**
 * Zähler für die Shell: ungelesene Hinweise und Gespräche mit neuen Nachrichten.
 * Keine Inhalte, nur Anzahlen des eigenen Kontos.
 */
export async function getShellCounts(viewer: Viewer): Promise<{ notifications: number; conversations: number }> {
  const now = new Date();
  const [n] = await db
    .select({ c: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.accountId, viewer.accountId),
        isNull(notifications.readAt),
        or(isNull(notifications.expiresAt), gt(notifications.expiresAt, now)),
      ),
    );

  const me = viewer.accountId;
  const rows = await db
    .select({ c: count() })
    .from(conversations)
    .innerJoin(contactRelationships, eq(contactRelationships.id, conversations.relationshipId))
    .leftJoin(
      conversationViews,
      and(eq(conversationViews.conversationId, conversations.id), eq(conversationViews.accountId, me)),
    )
    .where(
      and(
        or(eq(contactRelationships.accountLow, me), eq(contactRelationships.accountHigh, me)),
        eq(contactRelationships.status, "active"),
        isNull(conversationViews.hiddenAt),
        dsql`${conversations.lastSeq} > coalesce(${conversationViews.lastReadSeq}, 0)`,
        dsql`exists (select 1 from messaging.messages m where m.conversation_id = ${conversations.id} and m.sender_id <> ${me} and m.seq > coalesce(${conversationViews.lastReadSeq}, 0))`,
      ),
    );

  return { notifications: Number(n?.c ?? 0), conversations: Number(rows[0]?.c ?? 0) };
}
