import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { recordDenied } from "../../audit";
import { db, type Executor } from "../../db";
import { bookmarks, comments, communityProfiles, groups, posts, topics } from "../../db/schema";
import { AuthorView, PAGE_SIZE, Paged, PostListItem, ViewerRef, activeMemberOf, authorPresent, beforeCursor, blockedWith, decodeCursor, encodeCursor, excerptOf, isUuid, postVisibleTo, qcol, rolesOf, teamRole } from "./sql-helpers";

export * from "./sql-helpers";
export * from "./profile-queries";
export * from "./personal-queries";

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
        where gm.group_id = ${qcol(posts.groupId)} and gm.account_id = ${viewer.accountId} and gm.status = 'active'
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
