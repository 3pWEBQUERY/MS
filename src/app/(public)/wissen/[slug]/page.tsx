import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { UsefulActionSlot } from "@/components/analytics/useful-action-slot";
import { BookmarkSlot } from "@/components/content/bookmark-slot";
import { ArticleColumns, VerifiedBadge } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { RichText } from "@/components/content/rich-text";
import { Icon } from "@/components/ui/icon";
import { BackLink, ExternalLink, Notice, PageSkeleton, Skeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { getArticleMeta, getPublicArticle, listPublicArticles } from "@/server/modules/content/articles";

export async function generateMetadata({ params }: PageProps<"/wissen/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getArticleMeta(slug);
  return meta ? { title: meta.title, description: meta.summary } : { title: "Wissen" };
}

/**
 * S46 Wissensartikel (CON01–CON03, US21): Kurzfassung, Volltext, Autorenschaft, fachliche Prüfung,
 * Quellen, Publikations- und Prüfdatum. Nur sichtbar, solange publiziert und nicht überfällig.
 */
export default function ArticlePage({ params }: PageProps<"/wissen/[slug]">) {
  return (
    <PageContainer>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <ArticleContent params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function ArticleContent({ params }: { params: PageProps<"/wissen/[slug]">["params"] }) {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  // CON03/AT08: zurückgezogen oder überfällig → neutral nicht verfügbar, kein alter Text.
  if (!article) notFound();
  const related = (await listPublicArticles({ topicSlug: article.topicSlug })).filter((a) => a.id !== article.id).slice(0, 3);
  const returnTo = `/wissen/${article.slug}`;

  return (
    <div className="flex flex-col gap-20 lg:gap-28">
      <article aria-labelledby="artikel-titel" className="flex flex-col gap-10 sm:gap-14">
        {/* Kopf wie ein Magazin: Prüfung und Lesezeit in Mono, grosser Serif-Titel, Byline */}
        <header className="flex flex-col gap-6 border-b border-line pb-10 sm:pb-14">
          <BackLink href={`/wissen/thema/${article.topicSlug}`}>{article.topicName}</BackLink>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <VerifiedBadge label={article.isMedical ? "Fachlich geprüft" : "Redaktionell geprüft"} />
            <span className="inline-flex items-center gap-1.5 font-display font-extrabold text-xs uppercase tracking-[0.12em] text-ink-2">
              <Icon name="clock" className="size-4" />
              <span className="tabular">{article.readingMinutes} Min. Lesezeit</span>
            </span>
          </div>
          <h1 id="artikel-titel" className="display-lg max-w-5xl">
            {article.title}
          </h1>
          <p className="font-mono text-sm text-ink-2">
            Von {article.authorDisplay}
            {article.publishedAt && <> · publiziert am {formatDate(article.publishedAt)}</>}
          </p>
        </header>

        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:gap-20">
          <div className="flex min-w-0 flex-col gap-12">
            {article.cover && (
              <figure className="overflow-hidden rounded-[20px] bg-sunk">
                {/* Bild aus der eigenen Medienbibliothek; Alt-Text ist Pflicht (A01). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.cover.url}
                  alt={article.cover.alt}
                  width={article.cover.width ?? undefined}
                  height={article.cover.height ?? undefined}
                  className="h-auto w-full"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            )}

            {/* Kurzfassung als Lead (CON01) */}
            <section aria-labelledby="kurzfassung" className="flex max-w-[68ch] flex-col gap-4">
              <h2 id="kurzfassung" className="eyebrow">
                Das Wichtigste in Kürze
              </h2>
              <p className="font-display text-[1.5rem] leading-[1.35] tracking-[-0.01em] text-ink sm:text-[1.75rem]">
                {article.summary}
              </p>
            </section>

            <RichText text={article.body} />

            <div className="max-w-[68ch]">
              <Notice tone="neutral" title="Allgemeine Information, ersetzt keine Beratung">
                Dieser Artikel erklärt allgemeine Zusammenhänge. Für Entscheidungen zu deiner Behandlung sprich mit deinen
                behandelnden Fachpersonen. Bei akuten Beschwerden findest du Hilfewege unter{" "}
                <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
              </Notice>
            </div>

            <section aria-labelledby="quellen" className="flex max-w-[68ch] flex-col gap-5">
              <h2 id="quellen" className="display-sm">
                Quellen
              </h2>
              {article.sources.length === 0 ? (
                <p className="text-base text-ink-2">Für diesen Artikel sind keine externen Quellen hinterlegt.</p>
              ) : (
                <ol className="border-t border-ink">
                  {article.sources.map((s, i) => (
                    <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-b border-line py-5">
                      <span className="tabular pt-0.5 font-mono text-sm font-medium text-accent-ink" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-semibold text-ink">{s.title}</p>
                        <p className="text-sm text-ink-2">
                          {s.publisher}
                          {s.publishedOn && <> · {s.publishedOn}</>}
                        </p>
                        {s.url && (
                          <ExternalLink href={s.url} className="w-fit break-all text-sm">
                            {s.url.replace(/^https:\/\//, "")}
                          </ExternalLink>
                        )}
                        {s.rightsNote && <p className="text-sm text-ink-2">{s.rightsNote}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <aside aria-label="Prüfung und Aktionen" className="flex flex-col gap-10 lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-col gap-4 border-t border-ink pt-5">
              <p className="inline-flex items-center gap-2 font-semibold text-verified">
                <Icon name="shield-check" className="size-5" />
                {article.isMedical ? "Fachliche Prüfung" : "Redaktionelle Prüfung"}
              </p>
              <dl className="flex flex-col divide-y divide-line">
                {(
                  [
                    ["Autorenschaft", article.authorDisplay],
                    [
                      "Geprüft von",
                      article.review ? (
                        <>
                          {article.review.reviewerDisplay}
                          <span className="block text-sm text-ink-2">Fachgebiet: {article.review.specialty}</span>
                        </>
                      ) : (
                        "Redaktion"
                      ),
                    ],
                    ["Prüfdatum", article.review ? formatDate(article.review.reviewedAt) : "–"],
                    ["Publiziert", article.publishedAt ? formatDate(article.publishedAt) : "–"],
                    ["Nächster Prüftermin", formatDate(article.reviewDueAt)],
                    ["Version", <span key="v" className="tabular">{article.versionNo}</span>],
                  ] as [string, ReactNode][]
                ).map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <dt className="font-display font-extrabold text-xs uppercase tracking-[0.1em] text-ink-2">{k}</dt>
                    <dd className="text-base text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-col gap-4 border-t border-ink pt-5">
              <Suspense fallback={<Skeleton className="h-10 w-40 rounded-[10px]" />}>
                <BookmarkSlot targetType="article" targetId={article.id} returnTo={returnTo} />
              </Suspense>
              <Suspense fallback={null}>
                {/* PRD 15: nur mit Einwilligung, ohne Objekt-ID */}
                <UsefulActionSlot action="article_opened" />
              </Suspense>
              <Link
                href={`/kontakt?ref=article&id=${article.id}`}
                className="link-quiet inline-flex min-h-11 w-fit items-center gap-2 text-base font-medium text-ink"
              >
                <Icon name="flag" className="size-4" />
                Fehler im Artikel melden
              </Link>
              <p className="text-sm text-ink-2">
                Das hier ist geprüftes Fachwissen. Erfahrungen von Mitgliedern findest du getrennt davon in der Community.
              </p>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="weiterlesen" className="flex flex-col gap-8">
          <h2 id="weiterlesen" className="display-md">
            Mehr zum Thema <em>{article.topicName}</em>
          </h2>
          <ArticleColumns articles={related} />
        </section>
      )}
    </div>
  );
}
