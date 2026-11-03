import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { communityProfiles, groups, posts, topics } from "../../db/schema";
import { ViewerRef, authorPresent, blockedWith, excerptOf, isUuid, notBlockedWith, postVisibleTo, qcol, rolesOf, teamRole } from "./sql-helpers";

/* ───────────────────────── Mitgliederprofil (S10, COM05) ───────────────────────── */

export type MemberProfileView = {
  accountId: string;
  pseudonym: string;
  interests: string[];
  canton: string | null;
  team: string | null;
  self: boolean;
};

/** Nur Pseudonym, freigegebene Interessen, optional Kanton. Blockiert → null (neutrale 404). */
export async function getMemberProfileForViewer(viewer: ViewerRef, accountId: string): Promise<MemberProfileView | null> {
  if (!isUuid(accountId)) return null;
  const [row] = await db
    .select({
      accountId: communityProfiles.accountId,
      pseudonym: communityProfiles.pseudonym,
      interests: communityProfiles.interests,
      canton: communityProfiles.canton,
      roles: rolesOf(communityProfiles.accountId),
      blocked: blockedWith(viewer.accountId, communityProfiles.accountId),
    })
    .from(communityProfiles)
    .where(
      and(
        eq(communityProfiles.accountId, accountId),
        sql`${communityProfiles.onboardingCompletedAt} is not null`,
        authorPresent(communityProfiles.accountId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const self = row.accountId === viewer.accountId;
  if (row.blocked && !self) return null;
  return {
    accountId: row.accountId,
    pseudonym: row.pseudonym,
    interests: row.interests,
    canton: row.canton,
    team: teamRole(row.roles),
    self,
  };
}

/* ───────────────────────── Suche (für das Such-Modul) ───────────────────────── */

export type CommunitySearchHit = {
  id: string;
  title: string | null;
  snippet: string;
  topic: string;
  group: { slug: string; title: string } | null;
  author: string;
  publishedAt: Date;
};

/**
 * Volltext auf Beiträgen (COM01, AT04): Rechte (Mitgliedschaft, Blockierung, Status) gelten
 * im WHERE, also vor Trefferanzahl, Ranking und Ausschnitt. Verborgene/fremde Gruppen fehlen.
 */
export async function searchCommunityForViewer(viewer: ViewerRef, q: string, limit = 20): Promise<CommunitySearchHit[]> {
  const query = q.trim().slice(0, 200);
  if (query.length < 2) return [];
  const take = Math.min(Math.max(limit, 1), 20);
  const doc = sql`to_tsvector('german', coalesce(${posts.title}, '') || ' ' || ${posts.body})`;
  const tsq = sql`websearch_to_tsquery('german', ${query})`;
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      snippet: sql<string>`ts_headline('german', ${posts.body}, ${tsq}, 'StartSel="",StopSel="",MaxWords=30,MinWords=12,ShortWord=2')`,
      topic: topics.name,
      groupSlug: groups.slug,
      groupTitle: groups.title,
      author: communityProfiles.pseudonym,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .innerJoin(topics, eq(topics.id, posts.topicId))
    .leftJoin(groups, eq(groups.id, posts.groupId))
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, posts.authorId))
    .where(and(postVisibleTo(viewer.accountId), sql`${doc} @@ ${tsq}`))
    .orderBy(sql`ts_rank(${doc}, ${tsq}) desc`, desc(posts.publishedAt), desc(posts.id))
    .limit(take);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    snippet: excerptOf(r.snippet, 240),
    topic: r.topic,
    group: r.groupSlug && r.groupTitle ? { slug: r.groupSlug, title: r.groupTitle } : null,
    author: r.author,
    publishedAt: r.publishedAt,
  }));
}

export type MemberSearchHit = { accountId: string; pseudonym: string; team: string | null };

/** COM05: nur nach Pseudonym, nur auffindbare Profile, ohne Blockierte, höchstens 20 Treffer. */
export async function searchMembersForViewer(viewer: ViewerRef, q: string, limit = 20): Promise<MemberSearchHit[]> {
  const query = q.trim().toLowerCase().slice(0, 40);
  if (query.length < 2) return [];
  const take = Math.min(Math.max(limit, 1), 20);
  const escaped = query.replace(/[\\%_]/g, (m) => `\\${m}`);
  const rows = await db
    .select({
      accountId: communityProfiles.accountId,
      pseudonym: communityProfiles.pseudonym,
      roles: rolesOf(communityProfiles.accountId),
    })
    .from(communityProfiles)
    .where(
      and(
        eq(communityProfiles.discoverable, true),
        sql`${communityProfiles.onboardingCompletedAt} is not null`,
        sql`${communityProfiles.accountId} <> ${viewer.accountId}`,
        sql`${communityProfiles.pseudonymNormalized} like ${`%${escaped}%`}`,
        notBlockedWith(viewer.accountId, communityProfiles.accountId),
        sql`exists (select 1 from identity.accounts a where a.id = ${qcol(communityProfiles.accountId)} and a.status in ('active', 'restricted'))`,
      ),
    )
    .orderBy(
      sql`case when ${communityProfiles.pseudonymNormalized} like ${`${escaped}%`} then 0 else 1 end`,
      asc(communityProfiles.pseudonymNormalized),
    )
    .limit(take);
  return rows.map((r) => ({ accountId: r.accountId, pseudonym: r.pseudonym, team: teamRole(r.roles) }));
}
