import "server-only";
import { and, asc, desc, eq, gt, inArray, sql as dsql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { db } from "../../db";
import {
  articles,
  articleVersions,
  editorialReviews,
  knowledgeTopics,
  mediaAssets,
  sourceReferences,
} from "../../db/schema";

/**
 * Öffentliche Wissensbibliothek (CON01–CON03, S44, S46).
 * Öffentlich ist nur, was ausdrücklich publiziert ist: Artikel mit gesetzter
 * publishedVersionId, Version im Status «published» und Prüftermin in der Zukunft.
 * Zurückgezogene oder überfällige Artikel verschwinden aus Ansicht, Suche und Empfehlungen (CON03, AT08).
 *
 * Die gecachten Funktionen filtern bereits in SQL; weil der Cache bis zu einer Stunde alt sein
 * kann und der Worker kein updateTag auslösen kann, prüfen die Aufrufer den Prüftermin zusätzlich
 * zur Anzeigezeit.
 */

export type TopicSummary = { slug: string; name: string; description: string; articleCount: number };

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  topicName: string;
  readingMinutes: number;
  isMedical: boolean;
  publishedAt: string | null;
  reviewDueAt: string;
};

export type ArticleDetail = ArticleCard & {
  versionId: string;
  versionNo: number;
  body: string;
  authorDisplay: string;
  review: {
    reviewerDisplay: string;
    specialty: string;
    reviewedAt: string;
  } | null;
  sources: { title: string; publisher: string; url: string | null; publishedOn: string | null; rightsNote: string | null }[];
  cover: { url: string; alt: string; width: number | null; height: number | null } | null;
};

/** SQL-Bedingung für öffentlich sichtbare Artikelversionen (CON01, CON03). */
export const articleVisibleSql = and(
  eq(articles.publishedVersionId, articleVersions.id),
  eq(articleVersions.status, "published"),
  gt(articleVersions.reviewDueAt, dsql`now()`),
);

/** Zweite Prüfung zur Anzeigezeit – der Cache kann älter sein als der Prüftermin. */
export function stillValid(reviewDueAt: string | null | undefined, now = Date.now()): boolean {
  return Boolean(reviewDueAt) && new Date(reviewDueAt as string).getTime() > now;
}

/** Medien werden ausschliesslich über die eigene Route ausgeliefert (kein direkter Bucket-Zugriff). */
export function mediaUrl(objectKey: string): string {
  return `/medien/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

async function cachedPublicArticles(): Promise<ArticleCard[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("minutes");
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articleVersions.title,
      summary: articleVersions.summary,
      topicSlug: knowledgeTopics.slug,
      topicName: knowledgeTopics.name,
      readingMinutes: articleVersions.readingMinutes,
      isMedical: articleVersions.isMedical,
      publishedAt: articleVersions.publishedAt,
      reviewDueAt: articleVersions.reviewDueAt,
    })
    .from(articles)
    .innerJoin(articleVersions, eq(articleVersions.id, articles.publishedVersionId))
    .innerJoin(knowledgeTopics, eq(knowledgeTopics.id, articles.topicId))
    .where(articleVisibleSql)
    .orderBy(desc(articleVersions.publishedAt), asc(articleVersions.title));
  return rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    reviewDueAt: r.reviewDueAt!.toISOString(),
  }));
}

async function cachedTopics(): Promise<Omit<TopicSummary, "articleCount">[]> {
  "use cache";
  cacheTag("articles");
  cacheLife("hours");
  return db
    .select({ slug: knowledgeTopics.slug, name: knowledgeTopics.name, description: knowledgeTopics.description })
    .from(knowledgeTopics)
    .orderBy(asc(knowledgeTopics.sort), asc(knowledgeTopics.name));
}

/** Alle sichtbaren Artikel, optional nach Thema. Muss innerhalb von Suspense aufgerufen werden. */
export async function listPublicArticles(opts: { topicSlug?: string; limit?: number } = {}): Promise<ArticleCard[]> {
  const all = await cachedPublicArticles();
  await connection();
  const now = Date.now();
  const list = all.filter((a) => stillValid(a.reviewDueAt, now) && (!opts.topicSlug || a.topicSlug === opts.topicSlug));
  return opts.limit ? list.slice(0, opts.limit) : list;
}

/** Themen mit Anzahl aktuell sichtbarer Artikel (S44). */
export async function listKnowledgeTopics(): Promise<TopicSummary[]> {
  const [topics, list] = await Promise.all([cachedTopics(), listPublicArticles()]);
  return topics.map((t) => ({ ...t, articleCount: list.filter((a) => a.topicSlug === t.slug).length }));
}

export async function getKnowledgeTopic(slug: string): Promise<Omit<TopicSummary, "articleCount"> | null> {
  const topics = await cachedTopics();
  return topics.find((t) => t.slug === slug) ?? null;
}

async function cachedArticle(slug: string): Promise<ArticleDetail | null> {
  "use cache";
  cacheTag("articles");
  cacheLife("minutes");
  const [row] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      versionId: articleVersions.id,
      versionNo: articleVersions.versionNo,
      title: articleVersions.title,
      summary: articleVersions.summary,
      body: articleVersions.body,
      authorDisplay: articleVersions.authorDisplay,
      topicSlug: knowledgeTopics.slug,
      topicName: knowledgeTopics.name,
      readingMinutes: articleVersions.readingMinutes,
      isMedical: articleVersions.isMedical,
      publishedAt: articleVersions.publishedAt,
      reviewDueAt: articleVersions.reviewDueAt,
      coverKey: mediaAssets.objectKey,
      coverAlt: mediaAssets.altText,
      coverWidth: mediaAssets.width,
      coverHeight: mediaAssets.height,
    })
    .from(articles)
    .innerJoin(articleVersions, eq(articleVersions.id, articles.publishedVersionId))
    .innerJoin(knowledgeTopics, eq(knowledgeTopics.id, articles.topicId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, articleVersions.coverMediaId))
    .where(and(eq(articles.slug, slug), articleVisibleSql))
    .limit(1);
  if (!row) return null;

  const [review] = await db
    .select({
      reviewerDisplay: editorialReviews.reviewerDisplay,
      specialty: editorialReviews.specialty,
      createdAt: editorialReviews.createdAt,
    })
    .from(editorialReviews)
    .where(and(eq(editorialReviews.versionId, row.versionId), eq(editorialReviews.decision, "approved")))
    .orderBy(desc(editorialReviews.createdAt))
    .limit(1);

  const sources = await db
    .select({
      title: sourceReferences.title,
      publisher: sourceReferences.publisher,
      url: sourceReferences.url,
      publishedOn: sourceReferences.publishedOn,
      rightsNote: sourceReferences.rightsNote,
    })
    .from(sourceReferences)
    .where(eq(sourceReferences.versionId, row.versionId))
    .orderBy(asc(sourceReferences.sort), asc(sourceReferences.title));

  return {
    id: row.id,
    slug: row.slug,
    versionId: row.versionId,
    versionNo: row.versionNo,
    title: row.title,
    summary: row.summary,
    body: row.body,
    authorDisplay: row.authorDisplay,
    topicSlug: row.topicSlug,
    topicName: row.topicName,
    readingMinutes: row.readingMinutes,
    isMedical: row.isMedical,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    reviewDueAt: row.reviewDueAt!.toISOString(),
    review: review
      ? { reviewerDisplay: review.reviewerDisplay, specialty: review.specialty, reviewedAt: review.createdAt.toISOString() }
      : null,
    sources,
    cover:
      row.coverKey && row.coverAlt
        ? { url: mediaUrl(row.coverKey), alt: row.coverAlt, width: row.coverWidth, height: row.coverHeight }
        : null,
  };
}

/** Artikel für S46 – null bei unbekannt, zurückgezogen oder überfällig (neutral, CON03). */
export async function getPublicArticle(slug: string): Promise<ArticleDetail | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const article = await cachedArticle(slug);
  await connection();
  if (!article || !stillValid(article.reviewDueAt)) return null;
  return article;
}

/**
 * Für Merkliste und andere Module (HOM04): liefert nur Titel/Link aktuell sichtbarer Artikel.
 * Unzugängliche Ziele fehlen in der Map und dürfen weder Titel noch Vorschau zeigen.
 */
export async function getVisibleArticleRefs(ids: string[]): Promise<Map<string, { title: string; href: string; summary: string }>> {
  const unique = [...new Set(ids)].filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: articles.id, slug: articles.slug, title: articleVersions.title, summary: articleVersions.summary })
    .from(articles)
    .innerJoin(articleVersions, eq(articleVersions.id, articles.publishedVersionId))
    .where(and(inArray(articles.id, unique), articleVisibleSql));
  return new Map(rows.map((r) => [r.id, { title: r.title, href: `/wissen/${r.slug}`, summary: r.summary }]));
}

/** Nur für Metadaten (Titel/Beschreibung): gecacht, ohne Laufzeitprüfung. */
export async function getArticleMeta(slug: string): Promise<{ title: string; summary: string } | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const a = await cachedArticle(slug);
  return a ? { title: a.title, summary: a.summary } : null;
}
