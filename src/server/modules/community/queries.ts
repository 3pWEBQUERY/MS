import "server-only";
import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { ROLE_LABELS } from "@/lib/catalog";
import type { Viewer } from "../../auth/viewer";
import { recordDenied } from "../../audit";
import { db, type Executor } from "../../db";
import {
  articles,
  articleVersions,
  bookmarks,
  comments,
  communityProfiles,
  groupMemberships,
  groups,
  posts,
  supportOffers,
  topics,
} from "../../db/schema";

/**
 * Lesende Community-Abfragen mit Rechteprüfung bei jedem Abruf (PRD 03, COM01–COM08).
 * Jede Abfrage filtert selbst nach Gruppenmitgliedschaft, Blockierung und Status.
 * Nie E-Mail oder Kontodaten ausser Pseudonym und Rolle.
 */

type ViewerRef = Pick<Viewer, "accountId">;

export const PAGE_SIZE = 20;
export const POST_MAX = 5000;
export const POST_TITLE_MAX = 120;
export const COMMENT_MAX = 2000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/* ───────────────────────── Rechte-Bausteine (SQL) ───────────────────────── */

/** SAF01: aktive Blockierung in beide Richtungen zwischen Viewer und einem Konto. */
export function blockedWith(viewerId: string, other: AnyPgColumn | SQL): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from messaging.blocks b
    where b.lifted_at is null
      and ((b.blocker_id = ${viewerId} and b.blocked_id = ${other})
        or (b.blocker_id = ${other} and b.blocked_id = ${viewerId}))
  )`;
}

export function notBlockedWith(viewerId: string, other: AnyPgColumn | SQL): SQL {
  return sql`not ${blockedWith(viewerId, other)}`;
}

/** COM07: Rechte an Gruppeninhalten entstehen nur aus aktiver Mitgliedschaft. */
export function activeMemberOf(accountId: string | AnyPgColumn, groupCol: AnyPgColumn | SQL): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from community.group_memberships gm
    where gm.group_id = ${groupCol} and gm.account_id = ${accountId} and gm.status = 'active'
  )`;
}

/** Konten in Löschung oder gelöscht erscheinen nicht mehr als Autor (PRI05). */
export function authorPresent(authorCol: AnyPgColumn): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from identity.accounts a
    where a.id = ${authorCol} and a.status not in ('deleted', 'deletion_pending')
  )`;
}

/** Aktive Rollen eines Kontos, damit Mitarbeitende als «Team» erkennbar sind (PRD 10 «Kalte Startphase»). */
export function rolesOf(accountCol: AnyPgColumn): SQL<string[] | null> {
  return sql<string[] | null>`(
    select array_agg(distinct ra.role::text) from identity.role_assignments ra
    where ra.account_id = ${accountCol} and ra.revoked_at is null and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
  )`;
}

const TEAM_ORDER = ["moderation_lead", "moderator", "editor", "medical_reviewer", "admin", "privacy_officer", "ops"];

/** «Moderation», «Redaktion» … oder null für Mitglieder. */
export function teamRole(roles: string[] | null | undefined): string | null {
  const r = TEAM_ORDER.find((o) => roles?.includes(o));
  return r ? (ROLE_LABELS[r] ?? null) : null;
}

/** Sichtbarkeit eines Beitrags für den Viewer (COM01, COM07, SAF01). */
export function postVisibleTo(viewerId: string): SQL {
  return and(
    eq(posts.status, "published"),
    or(isNull(posts.groupId), activeMemberOf(viewerId, posts.groupId)),
    notBlockedWith(viewerId, posts.authorId),
    authorPresent(posts.authorId),
  )!;
}

/* ───────────────────────── Cursor (COM01: stabiler Tie-Breaker) ───────────────────────── */

const TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?)?$/;

export function encodeCursor(ts: string, id: string): string {
  return Buffer.from(`${ts}|${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): { ts: string; id: string } | null {
  if (!cursor || cursor.length > 200) return null;
  try {
    const [ts, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (!ts || !TS_RE.test(ts) || !isUuid(id)) return null;
    return { ts, id };
  } catch {
    return null;
  }
}

/** (Zeitpunkt, id) < Cursor bei absteigender Sortierung; Text-Zeitstempel behält Mikrosekunden. */
function beforeCursor(tsCol: AnyPgColumn, idCol: AnyPgColumn, cursor: { ts: string; id: string } | null): SQL | undefined {
  if (!cursor) return undefined;
  return sql`(${tsCol}, ${idCol}) < (${cursor.ts}::timestamptz, ${cursor.id}::uuid)`;
}

/* ───────────────────────── Typen ───────────────────────── */

export type AuthorView = { id: string; pseudonym: string; team: string | null };

export type PostListItem = {
  id: string;
  title: string | null;
  excerpt: string;
  topic: { slug: string; name: string };
  group: { slug: string; title: string; type: "open" | "closed" } | null;
  author: AuthorView;
  publishedAt: Date;
  edited: boolean;
};

export type Paged<T> = { items: T[]; nextCursor: string | null };

export function excerptOf(body: string, max = 280): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()} …`;
}

/* ───────────────────────── Themen ───────────────────────── */

export async function listTopics(): Promise<{ id: string; slug: string; name: string }[]> {
  return db
    .select({ id: topics.id, slug: topics.slug, name: topics.name })
    .from(topics)
    .where(eq(topics.active, true))
    .orderBy(asc(topics.sort), asc(topics.name));
}

/* ───────────────────────── Feed (COM01) ───────────────────────── */

async function listPosts(
  viewer: ViewerRef,
  where: (SQL | undefined)[],
  cursor: string | null | undefined,
): Promise<Paged<PostListItem>> {
  const c = decodeCursor(cursor);
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: sql<string>`left(${posts.body}, 600)`,
      publishedAt: posts.publishedAt,
      cursorTs: sql<string>`${posts.publishedAt}::text`,
      editedAt: posts.editedAt,
      topicSlug: topics.slug,
      topicName: topics.name,
      groupSlug: groups.slug,
      groupTitle: groups.title,
      groupType: groups.type,
      authorId: posts.authorId,
      pseudonym: communityProfiles.pseudonym,
      roles: rolesOf(posts.authorId),
    })
    .from(posts)
    .innerJoin(topics, eq(topics.id, posts.topicId))
    .leftJoin(groups, eq(groups.id, posts.groupId))
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, posts.authorId))
    .where(and(postVisibleTo(viewer.accountId), beforeCursor(posts.publishedAt, posts.id, c), ...where))
    // COM01: chronologisch absteigend, stabiler Tie-Breaker id – keine Engagement-Sortierung.
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({
      id: r.id,
      title: r.title,
      excerpt: excerptOf(r.body),
      topic: { slug: r.topicSlug, name: r.topicName },
      group: r.groupSlug && r.groupTitle && r.groupType ? { slug: r.groupSlug, title: r.groupTitle, type: r.groupType } : null,
      author: { id: r.authorId, pseudonym: r.pseudonym, team: teamRole(r.roles) },
      publishedAt: r.publishedAt,
      edited: r.editedAt !== null,
    })),
    nextCursor: hasMore && last ? encodeCursor(last.cursorTs, last.id) : null,
  };
}

/** S29: Plattformbeiträge und Beiträge aus Gruppen mit aktiver Mitgliedschaft, ohne Blockierte. */
export async function getFeed(
  viewer: ViewerRef,
  opts: { topic?: string | null; cursor?: string | null } = {},
): Promise<Paged<PostListItem>> {
  return listPosts(viewer, [opts.topic ? eq(topics.slug, opts.topic) : undefined], opts.cursor);
}

/** S35: Beiträge einer Gruppe – die Mitgliedschaft wird in postVisibleTo erneut geprüft. */
export async function getGroupPosts(
  viewer: ViewerRef,
  groupId: string,
  cursor?: string | null,
): Promise<Paged<PostListItem>> {
  return listPosts(viewer, [eq(posts.groupId, groupId)], cursor);
}

/* ───────────────────────── Einzelbeitrag (S31) ───────────────────────── */

export type CommentView =
  | {
      kind: "visible";
      id: string;
      body: string;
      author: AuthorView;
      createdAt: Date;
      edited: boolean;
      own: boolean;
      version: number;
    }
  /** Blockierte Autoren oder von der Moderation ausgeblendete Antworten: neutraler Platzhalter */
  | { kind: "placeholder"; id: string; reason: "blocked" | "unavailable" };

export type PostDetail = {
  id: string;
  /** false = gelöscht/entfernt, aber mit Antworten → neutraler Platzhalter ohne Text und Autor (COM03) */
  available: boolean;
  title: string | null;
  body: string;
  topic: { id: string; slug: string; name: string };
  group: { id: string; slug: string; title: string; type: "open" | "closed"; archived: boolean; rulesVersion: string } | null;
  /** Gruppenregeln vom Viewer in aktueller Fassung bestätigt (SAF07) */
  groupRulesAccepted: boolean;
  author: AuthorView | null;
  own: boolean;
  publishedAt: Date;
  edited: boolean;
  version: number;
  bookmarked: boolean;
  comments: CommentView[];
  moreComments: boolean;
};

type PostAccessRow = {
  id: string;
  status: "published" | "hidden" | "deleted" | "removed";
  authorId: string;
  groupId: string | null;
  groupStatus: "active" | "archived" | null;
  groupRulesVersion: string | null;
  member: boolean;
  memberRulesVersion: string | null;
  blocked: boolean;
  authorPresent: boolean;
};

/** Rechte-Rohdaten eines Beitrags für Server Actions und Seiten. */
export async function loadPostAccess(viewer: ViewerRef, postId: string, executor: Executor = db): Promise<PostAccessRow | null> {
  if (!isUuid(postId)) return null;
  const [row] = await executor
    .select({
      id: posts.id,
      status: posts.status,
      authorId: posts.authorId,
      groupId: posts.groupId,
      groupStatus: groups.status,
      groupRulesVersion: groups.rulesVersion,
      member: activeMemberOf(viewer.accountId, posts.groupId),
      memberRulesVersion: sql<string | null>`(
        select gm.rules_version_accepted from community.group_memberships gm
        where gm.group_id = ${posts.groupId} and gm.account_id = ${viewer.accountId} and gm.status = 'active'
      )`,
      blocked: blockedWith(viewer.accountId, posts.authorId),
      authorPresent: authorPresent(posts.authorId),
    })
    .from(posts)
    .leftJoin(groups, eq(groups.id, posts.groupId))
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}

/** Kann der Viewer den Beitrag (mit Text) sehen? Blockierung, Mitgliedschaft und Status (COM01, COM07). */
export function canViewPost(
  viewer: ViewerRef,
  post: Pick<PostAccessRow, "status" | "groupId" | "member" | "blocked" | "authorPresent"> | null,
): boolean {
  void viewer;
  if (!post) return false;
  if (post.status !== "published" || !post.authorPresent || post.blocked) return false;
  if (post.groupId && !post.member) return false;
  return true;
}

/** Darf der Viewer den Beitragsbereich (auch einen Platzhalter) überhaupt betreten? */
function canEnterPostArea(post: PostAccessRow): boolean {
  if (post.groupId && !post.member) return false;
  // Blockierte Autoren: Beitrag gilt als nicht vorhanden (F04)
  if (post.blocked) return false;
  return true;
}

export async function getPostForViewer(
  viewer: ViewerRef,
  postId: string,
  opts: { commentLimit?: number } = {},
): Promise<PostDetail | null> {
  const access = await loadPostAccess(viewer, postId);
  if (!access) return null;
  if (!canEnterPostArea(access)) {
    // Fremdzugriff auf Gruppeninhalt ohne Mitgliedschaft protokollieren (AT03, AT04) – ohne Werte.
    if (access.groupId && !access.member) await recordDenied("community.post_denied", viewer.accountId, "post");
    return null;
  }

  const [row] = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      publishedAt: posts.publishedAt,
      editedAt: posts.editedAt,
      version: posts.version,
      topicId: topics.id,
      topicSlug: topics.slug,
      topicName: topics.name,
      groupId: groups.id,
      groupSlug: groups.slug,
      groupTitle: groups.title,
      groupType: groups.type,
      groupStatus: groups.status,
      groupRulesVersion: groups.rulesVersion,
      pseudonym: communityProfiles.pseudonym,
      roles: rolesOf(posts.authorId),
    })
    .from(posts)
    .innerJoin(topics, eq(topics.id, posts.topicId))
    .leftJoin(groups, eq(groups.id, posts.groupId))
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, posts.authorId))
    .where(eq(posts.id, access.id))
    .limit(1);
  if (!row) return null;

  const available = canViewPost(viewer, access);
  const limit = Math.min(Math.max(opts.commentLimit ?? 50, 1), 500);

  const commentRows = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      authorId: comments.authorId,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      version: comments.version,
      pseudonym: communityProfiles.pseudonym,
      roles: rolesOf(comments.authorId),
      blocked: blockedWith(viewer.accountId, comments.authorId),
    })
    .from(comments)
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, comments.authorId))
    .where(
      and(
        eq(comments.postId, access.id),
        // Gelöschte Antworten verschwinden vollständig (keine verschachtelten Antworten, COM02).
        inArray(comments.status, ["published", "hidden", "removed"]),
        authorPresent(comments.authorId),
      ),
    )
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .limit(limit + 1);

  // COM03: gelöschter Beitrag ohne Antworten verschwindet; mit Antworten bleibt ein Platzhalter.
  if (!available && !commentRows.some((c) => c.status === "published")) return null;

  const [bm] = available
    ? await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.accountId, viewer.accountId),
            eq(bookmarks.targetType, "post"),
            eq(bookmarks.targetId, access.id),
          ),
        )
        .limit(1)
    : [];

  const own = access.authorId === viewer.accountId;
  return {
    id: row.id,
    available,
    title: available ? row.title : null,
    body: available ? row.body : "",
    topic: { id: row.topicId, slug: row.topicSlug, name: row.topicName },
    group:
      row.groupId && row.groupSlug && row.groupTitle && row.groupType && row.groupRulesVersion
        ? {
            id: row.groupId,
            slug: row.groupSlug,
            title: row.groupTitle,
            type: row.groupType,
            archived: row.groupStatus === "archived",
            rulesVersion: row.groupRulesVersion,
          }
        : null,
    groupRulesAccepted: !access.groupId || access.memberRulesVersion === access.groupRulesVersion,
    author: available && row.pseudonym ? { id: access.authorId, pseudonym: row.pseudonym, team: teamRole(row.roles) } : null,
    own: available && own,
    publishedAt: row.publishedAt,
    edited: available && row.editedAt !== null,
    version: row.version,
    bookmarked: Boolean(bm),
    comments: commentRows.slice(0, limit).flatMap((c): CommentView[] => {
      const ownComment = c.authorId === viewer.accountId;
      if (c.blocked) return [{ kind: "placeholder", id: c.id, reason: "blocked" }];
      if (c.status !== "published") return [{ kind: "placeholder", id: c.id, reason: "unavailable" }];
      return [
        {
          kind: "visible",
          id: c.id,
          body: c.body,
          author: { id: c.authorId, pseudonym: c.pseudonym, team: teamRole(c.roles) },
          createdAt: c.createdAt,
          edited: c.editedAt !== null,
          own: ownComment,
          version: c.version,
        },
      ];
    }),
    moreComments: commentRows.length > limit,
  };
}

/** S32: Beitrag zum Bearbeiten – nur Autor, nur veröffentlicht, nur mit aktuellem Zugang. */
export async function getOwnPostForEdit(viewer: ViewerRef, postId: string) {
  const access = await loadPostAccess(viewer, postId);
  if (!access || access.authorId !== viewer.accountId || !canViewPost(viewer, access)) return null;
  const [row] = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      version: posts.version,
      topicSlug: topics.slug,
      groupSlug: groups.slug,
      groupTitle: groups.title,
      groupType: groups.type,
      groupStatus: groups.status,
    })
    .from(posts)
    .innerJoin(topics, eq(topics.id, posts.topicId))
    .leftJoin(groups, eq(groups.id, posts.groupId))
    .where(and(eq(posts.id, access.id), eq(posts.authorId, viewer.accountId)))
    .limit(1);
  if (!row) return null;
  const commentCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.postId, row.id), eq(comments.status, "published")))
    .then((r) => r[0]?.n ?? 0);
  return {
    ...row,
    archived: row.groupStatus === "archived",
    // Nur dem Autor zur Erklärung der Löschfolgen – keine öffentliche Zahl.
    hasComments: commentCount > 0,
  };
}

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
        sql`exists (select 1 from identity.accounts a where a.id = ${communityProfiles.accountId} and a.status in ('active', 'restricted'))`,
      ),
    )
    .orderBy(
      sql`case when ${communityProfiles.pseudonymNormalized} like ${`${escaped}%`} then 0 else 1 end`,
      asc(communityProfiles.pseudonymNormalized),
    )
    .limit(take);
  return rows.map((r) => ({ accountId: r.accountId, pseudonym: r.pseudonym, team: teamRole(r.roles) }));
}

/* ───────────────────────── Merkliste (S27, HOM04) ───────────────────────── */

export type BookmarkArea = "post" | "article" | "offer";

export type BookmarkView = {
  id: string;
  targetType: BookmarkArea;
  targetId: string;
  savedAt: Date;
  /** null = nicht mehr zugänglich → weder Titel noch Text */
  target: { title: string; href: string; context: string | null } | null;
};

/** Titel nur, wenn das Ziel aktuell zugänglich ist; sonst neutraler Eintrag (HOM04). */
export async function getBookmarksForViewer(
  viewer: ViewerRef,
  opts: { area?: BookmarkArea | null; cursor?: string | null } = {},
): Promise<Paged<BookmarkView>> {
  const c = decodeCursor(opts.cursor);
  const rows = await db
    .select({
      id: bookmarks.id,
      targetType: bookmarks.targetType,
      targetId: bookmarks.targetId,
      createdAt: bookmarks.createdAt,
      cursorTs: sql<string>`${bookmarks.createdAt}::text`,
    })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.accountId, viewer.accountId),
        opts.area ? eq(bookmarks.targetType, opts.area) : undefined,
        beforeCursor(bookmarks.createdAt, bookmarks.id, c),
      ),
    )
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const ids = (t: BookmarkArea) => page.filter((r) => r.targetType === t).map((r) => r.targetId);
  const postIds = ids("post");
  const articleIds = ids("article");
  const offerIds = ids("offer");

  const [postRows, articleRows, offerRows] = await Promise.all([
    postIds.length
      ? db
          .select({ id: posts.id, title: posts.title, body: sql<string>`left(${posts.body}, 200)`, groupTitle: groups.title })
          .from(posts)
          .leftJoin(groups, eq(groups.id, posts.groupId))
          .where(and(inArray(posts.id, postIds), postVisibleTo(viewer.accountId)))
      : [],
    articleIds.length
      ? db
          .select({ id: articles.id, slug: articles.slug, title: articleVersions.title })
          .from(articles)
          .innerJoin(articleVersions, eq(articleVersions.id, articles.publishedVersionId))
          .where(
            and(
              inArray(articles.id, articleIds),
              eq(articleVersions.status, "published"),
              or(isNull(articleVersions.reviewDueAt), sql`${articleVersions.reviewDueAt} > now()`),
            ),
          )
      : [],
    offerIds.length
      ? db
          .select({ id: supportOffers.id, slug: supportOffers.slug, title: supportOffers.title, org: supportOffers.organization })
          .from(supportOffers)
          .where(and(inArray(supportOffers.id, offerIds), eq(supportOffers.status, "published")))
      : [],
  ]);

  const postMap = new Map(postRows.map((p) => [p.id, p]));
  const articleMap = new Map(articleRows.map((a) => [a.id, a]));
  const offerMap = new Map(offerRows.map((o) => [o.id, o]));
  const last = page[page.length - 1];

  return {
    items: page.map((r) => {
      let target: BookmarkView["target"] = null;
      if (r.targetType === "post") {
        const p = postMap.get(r.targetId);
        if (p) target = { title: p.title ?? excerptOf(p.body, 90), href: `/community/beitrag/${p.id}`, context: p.groupTitle ? `Gruppe ${p.groupTitle}` : "Community" };
      } else if (r.targetType === "article") {
        const a = articleMap.get(r.targetId);
        if (a) target = { title: a.title, href: `/wissen/${a.slug}`, context: "Wissen" };
      } else {
        const o = offerMap.get(r.targetId);
        if (o) target = { title: o.title, href: `/hilfe/${o.slug}`, context: o.org };
      }
      return { id: r.id, targetType: r.targetType, targetId: r.targetId, savedAt: r.createdAt, target };
    }),
    nextCursor: hasMore && last ? encodeCursor(last.cursorTs, last.id) : null,
  };
}

/* ───────────────────────── Eigene Reste in verlassenen Gruppen (COM08, AT04) ───────────────────────── */

/**
 * Isolierte Eigenverwaltung: nur eigene Texte aus Gruppen ohne aktive Mitgliedschaft –
 * keine fremden Beiträge, keine Antworten anderer, kein Gruppeninhalt.
 */
export async function getOwnLeftoversInLeftGroups(viewer: ViewerRef) {
  const notMember = sql`not ${activeMemberOf(viewer.accountId, posts.groupId)}`;
  const [ownPosts, ownComments] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        body: sql<string>`left(${posts.body}, 400)`,
        publishedAt: posts.publishedAt,
        groupTitle: groups.title,
      })
      .from(posts)
      .innerJoin(groups, eq(groups.id, posts.groupId))
      .where(and(eq(posts.authorId, viewer.accountId), eq(posts.status, "published"), notMember))
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(100),
    db
      .select({
        id: comments.id,
        body: sql<string>`left(${comments.body}, 400)`,
        createdAt: comments.createdAt,
        groupTitle: groups.title,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .innerJoin(groups, eq(groups.id, posts.groupId))
      .where(and(eq(comments.authorId, viewer.accountId), eq(comments.status, "published"), notMember))
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(100),
  ]);
  return {
    posts: ownPosts.map((p) => ({ ...p, excerpt: excerptOf(p.body, 240) })),
    comments: ownComments.map((c) => ({ ...c, excerpt: excerptOf(c.body, 240) })),
  };
}

/** Gruppen, in die der Viewer schreiben darf (S30 Zielbereich). */
export async function listWritableGroups(viewer: ViewerRef) {
  return db
    .select({
      id: groups.id,
      slug: groups.slug,
      title: groups.title,
      type: groups.type,
      topicId: groups.topicId,
      rulesVersion: groups.rulesVersion,
      acceptedVersion: groupMemberships.rulesVersionAccepted,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(
      and(
        eq(groupMemberships.accountId, viewer.accountId),
        eq(groupMemberships.status, "active"),
        eq(groups.status, "active"),
      ),
    )
    .orderBy(asc(groups.title));
}
