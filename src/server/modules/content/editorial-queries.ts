import "server-only";
import { and, asc, desc, eq, inArray, sql as dsql } from "drizzle-orm";
import type { Viewer } from "../../auth/viewer";
import { db } from "../../db";
import {
  accounts,
  articles,
  articleVersions,
  auditEvents,
  communityProfiles,
  contactMessages,
  editorialReviews,
  knowledgeTopics,
  mediaAssets,
  sourceReferences,
} from "../../db/schema";
import type { ArticleStatus } from "./shared";

/**
 * Redaktion und Prüfung (S56, CON02, CON03). Nur für Mitarbeitende mit passender Rolle –
 * die Seiten rufen requireStaff, die Aktionen actionStaff auf.
 */

export type { ArticleStatus };
export { ARTICLE_STATUS_LABEL, EDITABLE_STATUSES } from "./shared";

/** Aktionen, die eine Person zur (Mit-)Autorin einer Version machen – für die Vieraugenprüfung (CON02). */
export const AUTHORING_ACTIONS = [
  "article.created",
  "article.version_created",
  "article.version_saved",
  "article.source_added",
  "article.source_removed",
];

export type StaffArticleRow = {
  id: string;
  slug: string;
  topicName: string;
  latestVersionId: string;
  latestVersionNo: number;
  latestTitle: string;
  latestStatus: ArticleStatus;
  latestUpdatedAt: Date;
  publicStatus: ArticleStatus | null;
  publicReviewDueAt: Date | null;
  publicWithdrawnAt: Date | null;
  publicWithdrawReason: string | null;
};

export async function listArticlesForStaff(): Promise<StaffArticleRow[]> {
  const rows = (await db.execute(dsql`
    select a.id, a.slug, t.name as topic_name,
      lv.id as latest_version_id, lv.version_no as latest_version_no, lv.title as latest_title,
      lv.status as latest_status, lv.updated_at as latest_updated_at,
      pv.status as public_status, pv.review_due_at as public_review_due_at,
      pv.withdrawn_at as public_withdrawn_at, pv.withdraw_reason as public_withdraw_reason
    from content.articles a
    join content.knowledge_topics t on t.id = a.topic_id
    join lateral (
      select v.id, v.version_no, v.title, v.status, v.updated_at from content.article_versions v
      where v.article_id = a.id order by v.version_no desc limit 1
    ) lv on true
    left join content.article_versions pv on pv.id = a.published_version_id
    order by lv.updated_at desc
    limit 500
  `)) as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    topicName: r.topic_name as string,
    latestVersionId: r.latest_version_id as string,
    latestVersionNo: Number(r.latest_version_no),
    latestTitle: r.latest_title as string,
    latestStatus: r.latest_status as ArticleStatus,
    latestUpdatedAt: new Date(r.latest_updated_at as string),
    publicStatus: (r.public_status as ArticleStatus | null) ?? null,
    publicReviewDueAt: r.public_review_due_at ? new Date(r.public_review_due_at as string) : null,
    publicWithdrawnAt: r.public_withdrawn_at ? new Date(r.public_withdrawn_at as string) : null,
    publicWithdrawReason: (r.public_withdraw_reason as string | null) ?? null,
  }));
}

/** Öffentliche Sichtbarkeit aus Sicht der Redaktion (CON03-Arbeitsvorrat). */
export function publicState(r: Pick<StaffArticleRow, "publicStatus" | "publicReviewDueAt">, now = new Date()) {
  if (!r.publicStatus) return "none" as const;
  if (r.publicStatus === "withdrawn") return "withdrawn" as const;
  if (r.publicStatus !== "published") return "none" as const;
  if (!r.publicReviewDueAt || r.publicReviewDueAt <= now) return "overdue" as const;
  if (r.publicReviewDueAt.getTime() - now.getTime() < 30 * 86400_000) return "due_soon" as const;
  return "live" as const;
}

export async function listKnowledgeTopicsForStaff() {
  return db
    .select({ id: knowledgeTopics.id, slug: knowledgeTopics.slug, name: knowledgeTopics.name })
    .from(knowledgeTopics)
    .orderBy(asc(knowledgeTopics.sort), asc(knowledgeTopics.name));
}

export async function listMediaOptions() {
  return db
    .select({ id: mediaAssets.id, filename: mediaAssets.filename, altText: mediaAssets.altText })
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(100);
}

export async function getArticleForStaff(articleId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(articleId)) return null;
  const [article] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      topicId: articles.topicId,
      topicName: knowledgeTopics.name,
      publishedVersionId: articles.publishedVersionId,
    })
    .from(articles)
    .innerJoin(knowledgeTopics, eq(knowledgeTopics.id, articles.topicId))
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!article) return null;

  const versions = await db
    .select({
      id: articleVersions.id,
      versionNo: articleVersions.versionNo,
      title: articleVersions.title,
      summary: articleVersions.summary,
      body: articleVersions.body,
      authorId: articleVersions.authorId,
      authorDisplay: articleVersions.authorDisplay,
      status: articleVersions.status,
      isMedical: articleVersions.isMedical,
      readingMinutes: articleVersions.readingMinutes,
      coverMediaId: articleVersions.coverMediaId,
      reviewDueAt: articleVersions.reviewDueAt,
      publishedAt: articleVersions.publishedAt,
      withdrawnAt: articleVersions.withdrawnAt,
      withdrawReason: articleVersions.withdrawReason,
      updatedAt: articleVersions.updatedAt,
      version: articleVersions.version,
    })
    .from(articleVersions)
    .where(eq(articleVersions.articleId, articleId))
    .orderBy(desc(articleVersions.versionNo));

  const ids = versions.map((v) => v.id);
  const [sources, reviews] = ids.length
    ? await Promise.all([
        db
          .select({
            id: sourceReferences.id,
            versionId: sourceReferences.versionId,
            title: sourceReferences.title,
            publisher: sourceReferences.publisher,
            url: sourceReferences.url,
            publishedOn: sourceReferences.publishedOn,
            rightsNote: sourceReferences.rightsNote,
          })
          .from(sourceReferences)
          .where(inArray(sourceReferences.versionId, ids))
          .orderBy(asc(sourceReferences.sort), asc(sourceReferences.title)),
        db
          .select({
            id: editorialReviews.id,
            versionId: editorialReviews.versionId,
            reviewerDisplay: editorialReviews.reviewerDisplay,
            specialty: editorialReviews.specialty,
            decision: editorialReviews.decision,
            comment: editorialReviews.comment,
            nextReviewDueAt: editorialReviews.nextReviewDueAt,
            createdAt: editorialReviews.createdAt,
          })
          .from(editorialReviews)
          .where(inArray(editorialReviews.versionId, ids))
          .orderBy(desc(editorialReviews.createdAt)),
      ])
    : [[], []];

  return { article, versions, sources, reviews };
}

export type StaffArticle = NonNullable<Awaited<ReturnType<typeof getArticleForStaff>>>;

/** Hat die Person an dieser Version mitgeschrieben? Dann ist Prüfung ausgeschlossen (CON02). */
export async function isVersionAuthor(versionId: string, authorId: string | null, accountId: string): Promise<boolean> {
  if (authorId === accountId) return true;
  const [row] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.actorId, accountId),
        eq(auditEvents.objectType, "article_version"),
        eq(auditEvents.objectId, versionId),
        inArray(auditEvents.action, AUTHORING_ACTIONS),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Prüfvorrat: Versionen in Prüfung, die die Person nicht selbst geschrieben hat (S56). */
export async function listReviewQueue(viewer: Viewer) {
  const rows = await db
    .select({
      articleId: articles.id,
      versionId: articleVersions.id,
      versionNo: articleVersions.versionNo,
      title: articleVersions.title,
      isMedical: articleVersions.isMedical,
      authorId: articleVersions.authorId,
      authorDisplay: articleVersions.authorDisplay,
      updatedAt: articleVersions.updatedAt,
      topicName: knowledgeTopics.name,
    })
    .from(articleVersions)
    .innerJoin(articles, eq(articles.id, articleVersions.articleId))
    .innerJoin(knowledgeTopics, eq(knowledgeTopics.id, articles.topicId))
    .where(eq(articleVersions.status, "in_review"))
    .orderBy(asc(articleVersions.updatedAt));
  const out = [];
  for (const r of rows) {
    out.push({ ...r, ownVersion: await isVersionAuthor(r.versionId, r.authorId, viewer.accountId) });
  }
  return out;
}

export async function staffDisplayName(accountId: string): Promise<string> {
  const [row] = await db
    .select({ pseudonym: communityProfiles.pseudonym })
    .from(accounts)
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, accounts.id))
    .where(eq(accounts.id, accountId))
    .limit(1);
  return row?.pseudonym ?? "Redaktion";
}

/** Eingegangene Hinweise; Datenschutzanliegen nur für Datenschutzstelle und Administration. */
export async function listContactMessages(viewer: Viewer, opts: { status?: "open" | "done"; refType?: "article" | "offer" } = {}) {
  const privacy = viewer.roles.some((r) => r === "privacy_officer" || r === "admin");
  const conds = [eq(contactMessages.status, opts.status ?? "open")];
  if (!privacy) conds.push(dsql`${contactMessages.category} <> 'datenschutz'`);
  if (opts.refType) conds.push(eq(contactMessages.refType, opts.refType));
  return db
    .select({
      id: contactMessages.id,
      category: contactMessages.category,
      messageEncrypted: contactMessages.messageEncrypted,
      replyEmailEncrypted: contactMessages.replyEmailEncrypted,
      refType: contactMessages.refType,
      refId: contactMessages.refId,
      status: contactMessages.status,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .where(and(...conds))
    .orderBy(desc(contactMessages.createdAt))
    .limit(100);
}
