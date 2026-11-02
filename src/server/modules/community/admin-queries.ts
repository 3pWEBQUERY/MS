import "server-only";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { communityProfiles, groupMemberships, groups, roleAssignments, topics } from "../../db/schema";
import { isUuid, qcol } from "./queries";

/**
 * S55 Gruppenverwaltung (COM06–COM08). Nur für Seiten unter /verwaltung mit requireStaff.
 * Liefert Metadaten und Pseudonyme, keine Beitragsinhalte und keine E-Mail-Adressen.
 */

export async function listGroupsForAdmin() {
  return db
    .select({
      id: groups.id,
      slug: groups.slug,
      title: groups.title,
      type: groups.type,
      discoverable: groups.discoverable,
      status: groups.status,
      topic: topics.name,
      moderator: communityProfiles.pseudonym,
      pending: sql<number>`(select count(*)::int from community.group_memberships gm where gm.group_id = ${qcol(groups.id)} and gm.status = 'requested')`,
    })
    .from(groups)
    .leftJoin(topics, eq(topics.id, groups.topicId))
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, groups.moderatorAccountId))
    .orderBy(asc(groups.status), asc(groups.title));
}

export async function getGroupForAdmin(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      id: groups.id,
      slug: groups.slug,
      title: groups.title,
      description: groups.description,
      topicId: groups.topicId,
      topic: topics.name,
      type: groups.type,
      discoverable: groups.discoverable,
      rules: groups.rules,
      rulesVersion: groups.rulesVersion,
      status: groups.status,
      moderatorAccountId: groups.moderatorAccountId,
      moderator: communityProfiles.pseudonym,
      version: groups.version,
      updatedAt: groups.updatedAt,
    })
    .from(groups)
    .leftJoin(topics, eq(topics.id, groups.topicId))
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, groups.moderatorAccountId))
    .where(eq(groups.id, id))
    .limit(1);
  return row ?? null;
}

/** Ausstehende Aufnahmeanfragen – ohne Freitext (F04). */
export async function listPendingRequests(groupId: string) {
  return db
    .select({
      membershipId: groupMemberships.id,
      accountId: groupMemberships.accountId,
      pseudonym: communityProfiles.pseudonym,
      requestedAt: groupMemberships.updatedAt,
      version: groupMemberships.version,
    })
    .from(groupMemberships)
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, groupMemberships.accountId))
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.status, "requested")))
    .orderBy(asc(groupMemberships.updatedAt))
    .limit(200);
}

export async function listActiveMembers(groupId: string, after?: string | null) {
  const rows = await db
    .select({
      membershipId: groupMemberships.id,
      accountId: groupMemberships.accountId,
      pseudonym: communityProfiles.pseudonym,
      normalized: communityProfiles.pseudonymNormalized,
      since: groupMemberships.decidedAt,
      version: groupMemberships.version,
    })
    .from(groupMemberships)
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, groupMemberships.accountId))
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.status, "active"),
        after ? gt(communityProfiles.pseudonymNormalized, after) : undefined,
      ),
    )
    .orderBy(asc(communityProfiles.pseudonymNormalized))
    .limit(101);
  return { items: rows.slice(0, 100), next: rows.length > 100 ? rows[99].normalized : null };
}

/** Mitarbeitende mit Moderationsrolle für «verantwortliche Moderation» (COM06). */
export async function listModerators() {
  const now = new Date();
  return db
    .selectDistinct({ accountId: communityProfiles.accountId, pseudonym: communityProfiles.pseudonym })
    .from(roleAssignments)
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, roleAssignments.accountId))
    .where(
      and(
        inArray(roleAssignments.role, ["moderator", "moderation_lead"]),
        isNull(roleAssignments.revokedAt),
        sql`${roleAssignments.startsAt} <= now()`,
        or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, now)),
      ),
    )
    .orderBy(asc(communityProfiles.pseudonym));
}
