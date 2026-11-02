import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BookmarkSlot } from "@/components/content/bookmark-slot";
import { ArticleCardLink, VerifiedBadge } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { RichText } from "@/components/content/rich-text";
import { Icon } from "@/components/ui/icon";
import { BackLink, Card, ExternalLink, Notice, PageSkeleton, Skeleton } from "@/components/ui/primitives";
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
    <div className="flex flex-col gap-12">
      <article aria-labelledby="artikel-titel" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-4">
            <BackLink href={`/wissen/thema/${article.topicSlug}`}>{article.topicName}</BackLink>
            <div className="flex flex-wrap items-center gap-2">
              <VerifiedBadge label={article.isMedical ? "Fachlich geprüft" : "Redaktionell geprüft"} />
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
                <Icon name="clock" className="size-4" />
                {article.readingMinutes} Min. Lesezeit
              </span>
            </div>
            <h1 id="artikel-titel" className="text-3xl font-[650] tracking-[-0.025em] text-ink sm:text-[2.5rem] sm:leading-[1.08]">
              {article.title}
            </h1>
            <p className="text-base text-ink-2">
              Von {article.authorDisplay}
              {article.publishedAt && <> · publiziert am {formatDate(article.publishedAt)}</>}
            </p>
          </header>

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

          <section aria-labelledby="kurzfassung" className="rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            <h2 id="kurzfassung" className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">
              Das Wichtigste in Kürze
            </h2>
            <p className="text-lg leading-relaxed text-ink">{article.summary}</p>
          </section>

          <RichText text={article.body} />

          <Notice tone="neutral" title="Allgemeine Information, ersetzt keine Beratung">
            Dieser Artikel erklärt allgemeine Zusammenhänge. Für Entscheidungen zu deiner Behandlung sprich mit deinen
            behandelnden Fachpersonen. Bei akuten Beschwerden findest du Hilfewege unter{" "}
            <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
          </Notice>

          <section aria-labelledby="quellen" className="flex flex-col gap-4">
            <h2 id="quellen" className="text-xl font-[650] text-ink">
              Quellen
            </h2>
            {article.sources.length === 0 ? (
              <p className="text-base text-ink-2">Für diesen Artikel sind keine externen Quellen hinterlegt.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {article.sources.map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-[16px] border border-line bg-surface p-4">
                    <span className="tabular font-mono text-sm font-medium text-ink-3" aria-hidden="true">
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

        <aside aria-label="Prüfung und Aktionen" className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card tone="verified" className="flex flex-col gap-3">
            <p className="inline-flex items-center gap-2 font-semibold text-verified">
              <Icon name="shield-check" className="size-5" />
              {article.isMedical ? "Fachliche Prüfung" : "Redaktionelle Prüfung"}
            </p>
            <dl className="flex flex-col divide-y divide-verified/15">
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
                <div key={k} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-sm font-semibold text-ink-2">{k}</dt>
                  <dd className="text-base text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="flex flex-col gap-4">
            <Suspense fallback={<Skeleton className="h-10 w-40 rounded-[10px]" />}>
              <BookmarkSlot targetType="article" targetId={article.id} returnTo={returnTo} />
            </Suspense>
            <Link
              href={`/kontakt?ref=article&id=${article.id}`}
              className="inline-flex min-h-10 w-fit items-center gap-2 text-base font-medium text-ink underline underline-offset-4"
            >
              <Icon name="flag" className="size-4" />
              Fehler im Artikel melden
            </Link>
            <p className="text-sm text-ink-2">
              Das hier ist geprüftes Fachwissen. Erfahrungen von Mitgliedern findest du getrennt davon in der Community.
            </p>
          </Card>
        </aside>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="weiterlesen">
          <h2 id="weiterlesen" className="mb-4 text-xl font-[650] text-ink">
            Mehr zum Thema {article.topicName}
          </h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {related.map((a) => (
              <li key={a.id}>
                <ArticleCardLink article={a} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
