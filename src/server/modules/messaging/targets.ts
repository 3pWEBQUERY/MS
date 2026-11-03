import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db, type Executor } from "@/server/db";
import {
  accounts,
  comments,
  contactRelationships,
  conversations,
  groupMemberships,
  groups,
  moderationCases,
  posts,
} from "@/server/db/schema";
import { isBlockedBetween } from "./access";

/**
 * Prüft bei jedem Aufruf erneut, ob ein Ziel für ein Konto noch zugänglich ist
 * (MSG07, MSG08: Ziel-Links und Zustellung). Framework-frei – auch im Worker nutzbar.
 */

/**
 * Darf accountId den Beitrag sehen? Gleiche Regeln wie der Feed (postVisibleTo, COM01/COM07/SAF01):
 * veröffentlicht, Gruppeninhalte nur mit aktiver Mitgliedschaft (offen wie geschlossen),
 * Autor nicht in Löschung und keine Blockierung zwischen den beiden Konten.
 */
export async function canSeePost(accountId: string, postId: string, executor: Executor = db): Promise<boolean> {
  const [p] = await executor
    .select({ status: posts.status, groupId: posts.groupId, authorId: posts.authorId, authorStatus: accounts.status })
    .from(posts)
    .innerJoin(accounts, eq(accounts.id, posts.authorId))
    .where(eq(posts.id, postId));
  if (!p || p.status !== "published") return false;
  if (p.authorStatus === "deleted" || p.authorStatus === "deletion_pending") return false;
  if (p.groupId) {
    const [m] = await executor
      .select({ status: groupMemberships.status })
      .from(groupMemberships)
      .where(and(eq(groupMemberships.groupId, p.groupId), eq(groupMemberships.accountId, accountId)));
    if (m?.status !== "active") return false;
  }
  if (p.authorId !== accountId && (await isBlockedBetween(accountId, p.authorId, executor))) return false;
  return true;
}

export async function canSeeComment(accountId: string, commentId: string, executor: Executor = db) {
  const [c] = await executor
    .select({ status: comments.status, postId: comments.postId, authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, commentId));
  if (!c || c.status !== "published") return false;
  if (c.authorId !== accountId && (await isBlockedBetween(accountId, c.authorId, executor))) return false;
  return canSeePost(accountId, c.postId, executor);
}

/** Gruppe sichtbar: auffindbar, offen oder eigene Mitgliedschaft/Anfrage (COM06). */
export async function canSeeGroup(accountId: string, groupId: string, executor: Executor = db) {
  const [g] = await executor
    .select({ type: groups.type, discoverable: groups.discoverable, status: groups.status })
    .from(groups)
    .where(eq(groups.id, groupId));
  if (!g) return false;
  const [m] = await executor
    .select({ status: groupMemberships.status })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.accountId, accountId)));
  // Archivierte Gruppen bleiben nur für aktive Mitglieder erreichbar (COM08, wie getGroupForViewer).
  if (g.status === "archived") return m?.status === "active";
  if (g.type === "open" || g.discoverable) return true;
  return Boolean(m);
}

export type ResolvedTarget = { ok: true; href: string } | { ok: false };

/**
 * Sicherer Ziel-Link einer Mitteilung. Nicht mehr zugängliche Ziele → { ok: false }
 * (neutral «nicht mehr verfügbar»).
 */
export async function resolveNotificationTarget(
  accountId: string,
  n: { type: string; targetType: string | null; targetId: string | null; actorId: string | null },
  executor: Executor = db,
): Promise<ResolvedTarget> {
  if (n.actorId && (await isBlockedBetween(accountId, n.actorId, executor))) return { ok: false };
  const id = n.targetId;
  switch (n.targetType) {
    case "conversation": {
      if (!id) return { ok: false };
      const [row] = await executor
        .select({ low: contactRelationships.accountLow, high: contactRelationships.accountHigh })
        .from(conversations)
        .innerJoin(contactRelationships, eq(contactRelationships.id, conversations.relationshipId))
        .where(
          and(
            eq(conversations.id, id),
            or(eq(contactRelationships.accountLow, accountId), eq(contactRelationships.accountHigh, accountId)),
          ),
        );
      if (!row) return { ok: false };
      const other = row.low === accountId ? row.high : row.low;
      if (await isBlockedBetween(accountId, other, executor)) return { ok: false };
      return { ok: true, href: `/community/gespraeche/${id}` };
    }
    case "contact": {
      if (!id) return { ok: false };
      const [rel] = await executor
        .select({
          status: contactRelationships.status,
          initiatorId: contactRelationships.initiatorId,
          expiresAt: contactRelationships.expiresAt,
          low: contactRelationships.accountLow,
          high: contactRelationships.accountHigh,
        })
        .from(contactRelationships)
        .where(eq(contactRelationships.id, id));
      if (!rel || (rel.low !== accountId && rel.high !== accountId)) return { ok: false };
      const open = rel.status === "pending" && (!rel.expiresAt || rel.expiresAt > new Date());
      if (n.type === "contact_request" && (!open || rel.initiatorId === accountId)) return { ok: false };
      return { ok: true, href: "/community/kontakte" };
    }
    case "post":
      if (!id || !(await canSeePost(accountId, id, executor))) return { ok: false };
      return { ok: true, href: `/community/beitrag/${id}` };
    case "group":
      if (!id || !(await canSeeGroup(accountId, id, executor))) return { ok: false };
      return { ok: true, href: "/community/meine-gruppen" };
    case "case": {
      if (!id) return { ok: true, href: "/meldungen" };
      const [c] = await executor
        .select({ subject: moderationCases.subjectAccountId })
        .from(moderationCases)
        .where(eq(moderationCases.id, id));
      // Entscheidungen zu eigenen Meldungen oder Fällen, die mich betreffen.
      return c ? { ok: true, href: "/meldungen" } : { ok: false };
    }
    case "account":
      return { ok: true, href: "/konto" };
    default:
      if (n.type === "system") return { ok: true, href: "/mitteilungen" };
      if (n.type === "security") return { ok: true, href: "/konto" };
      if (n.type === "moderation_decision") return { ok: true, href: "/meldungen" };
      return { ok: false };
  }
}
