import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { articles, articleVersions, bookmarks, comments, groupMemberships, groups, posts, supportOffers } from "../../db/schema";
import { PAGE_SIZE, Paged, ViewerRef, activeMemberOf, beforeCursor, decodeCursor, encodeCursor, excerptOf, postVisibleTo } from "./sql-helpers";

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
              isNull(articleVersions.withdrawnAt),
              // CON03/AT08: ohne gültigen Prüftermin kein Titel
              sql`${articleVersions.reviewDueAt} is not null and ${articleVersions.reviewDueAt} > now()`,
            ),
          )
      : [],
    offerIds.length
      ? db
          .select({ id: supportOffers.id, slug: supportOffers.slug, title: supportOffers.title, org: supportOffers.organization })
          .from(supportOffers)
          .where(
            and(
              inArray(supportOffers.id, offerIds),
              eq(supportOffers.status, "published"),
              // CON05: abgelaufene Prüfung → nicht mehr verfügbar
              sql`${supportOffers.nextReviewAt} > now()`,
            ),
          )
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
