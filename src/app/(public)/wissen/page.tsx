import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArticleColumns, ArticleList } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { SearchForm } from "@/components/content/search-form";
import { Icon } from "@/components/ui/icon";
import { EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { listKnowledgeTopics, listPublicArticles } from "@/server/modules/content/articles";

export const metadata: Metadata = {
  title: "Wissen",
  description: "Fachlich geprüfte Artikel zu Multipler Sklerose – mit Kurzfassung, Quellen, Autorenschaft und Prüfdatum.",
};

/** Themenslug für den verständlichen Einstieg (S44). */
const START_TOPIC = "neu-mit-ms";

const two = (i: number) => String(i + 1).padStart(2, "0");

/** S44 Wissen Übersicht (CON01): Themen, Kurzbeschreibungen, Suche, verständlicher Einstieg. */
export default function KnowledgePage() {
  return (
    <PageContainer>
      <header className="grid gap-10 border-b border-line pb-10 sm:pb-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="eyebrow">
            <span className="index" aria-hidden="true">
              01
            </span>{" "}
            Wissen
          </p>
          <h1 className="display-lg">
            Verständlich erklärt. <em>Fachlich geprüft.</em>
          </h1>
          <p className="max-w-2xl text-xl leading-relaxed text-ink-2">
            Allgemeine Informationen zu MS und zum Alltag damit – jeder Artikel nennt Autorenschaft, fachliche Prüfung, Quellen
            und den nächsten Prüftermin.
          </p>
        </div>
        <div className="lg:pb-1">
          <SearchForm scope="wissen" label="Im Wissen suchen" id="wissen-suche" />
        </div>
      </header>

      <div className="mt-12 flex flex-col gap-20 sm:mt-16 lg:gap-28">
        <Suspense fallback={<PageSkeleton rows={4} />}>
          <KnowledgeContent />
        </Suspense>

        {/* Abgrenzung: allgemeine Information, keine Beratung (CON01) */}
        <div className="grid gap-3 border-t border-line pt-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-16">
          <p className="inline-flex items-start gap-2 text-lg font-semibold text-ink">
            <Icon name="info" className="mt-1 size-5 shrink-0 text-ink-2" />
            Allgemeine Information, keine Beratung
          </p>
          <p className="max-w-3xl text-base text-ink-2">
            Die Artikel ersetzen keine ärztliche oder therapeutische Beratung. Für Fragen zu deiner Behandlung sind deine
            behandelnden Fachpersonen da. Erfahrungen anderer Mitglieder findest du getrennt davon in der Community – sie sind
            nicht fachlich geprüft.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}

async function KnowledgeContent() {
  const [topics, articles] = await Promise.all([listKnowledgeTopics(), listPublicArticles()]);
  if (articles.length === 0) {
    return (
      <EmptyState icon="book" title="Noch keine Artikel publiziert">
        Die Redaktion bereitet die ersten geprüften Artikel vor. Hilfsangebote findest du bereits unter{" "}
        <Link href="/hilfe" className="font-semibold text-ink underline underline-offset-4">
          Hilfe finden
        </Link>
        .
      </EmptyState>
    );
  }
  const start = articles.filter((a) => a.topicSlug === START_TOPIC).slice(0, 3);
  const latest = articles.slice(0, 6);
  const visibleTopics = topics.filter((t) => t.articleCount > 0);
  return (
    <>
      {/* Einzige tiefe Fläche der Seite: der ruhige Einstieg für neu Betroffene */}
      {start.length > 0 && (
        <section aria-labelledby="start" className="rounded-[28px] bg-deep text-on-deep">
          <div className="flex flex-col gap-10 p-6 sm:p-10 lg:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex max-w-2xl flex-col gap-4">
                <p className="eyebrow !text-on-deep-2">
                  <span className="index !text-deep-accent" aria-hidden="true">
                    02
                  </span>{" "}
                  Verständlicher Einstieg
                </p>
                <h2 id="start" className="display-md !text-on-deep [&_em]:!text-deep-accent">
                  Neu mit MS? <em>Starte hier.</em>
                </h2>
              </div>
              <p className="max-w-sm text-lg text-on-deep-2">
                Drei ruhige Texte für den Anfang. Du kannst jederzeit pausieren und später weiterlesen.
              </p>
            </div>
            <ArticleColumns articles={start} tone="deep" />
            <Link
              href={`/wissen/thema/${START_TOPIC}`}
              className="group inline-flex min-h-11 w-fit items-center gap-2 text-base font-semibold text-on-deep underline decoration-deep-line decoration-1 underline-offset-[0.25em] transition-colors duration-150 hover:decoration-current"
            >
              Alle Artikel für den Einstieg <Icon name="arrow-right" className="nudge size-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Themen als nummerierter Index */}
      <section aria-labelledby="themen" className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <span className="font-mono text-[0.8125rem] font-medium tracking-[0.12em] text-accent-ink" aria-hidden="true">
            03
          </span>
          <h2 id="themen" className="display-lg">
            Themen
          </h2>
          <p className="max-w-sm text-lg text-ink-2">Wähle ein Thema, das dich gerade beschäftigt.</p>
        </div>
        <ol className="border-t border-ink">
          {visibleTopics.map((t, i) => (
            <li key={t.slug} className="border-b border-line">
              <Link
                href={`/wissen/thema/${t.slug}`}
                data-focus-inset
                className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:py-6"
              >
                <span aria-hidden="true" className="hidden pt-2 font-mono text-sm text-ink-3 group-hover:text-accent-ink sm:block">
                  {two(i)}
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="font-display text-[1.75rem] font-bold leading-[1.1] tracking-[-0.02em] text-ink underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 group-hover:decoration-current">
                    {t.name}
                  </h3>
                  <span className="max-w-xl text-base text-ink-2">{t.description}</span>
                </div>
                <span className="flex items-center gap-4 pt-2">
                  <span className="tabular whitespace-nowrap font-display font-semibold text-xs uppercase tracking-[0.1em] text-ink-2">
                    {t.articleCount} Artikel
                  </span>
                  <Icon name="arrow-right" className="nudge size-5 shrink-0 text-ink-3 group-hover:text-ink" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Zuletzt publiziert als Editorial-Liste */}
      <section aria-labelledby="neu" className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[0.8125rem] font-medium tracking-[0.12em] text-accent-ink" aria-hidden="true">
            04
          </span>
          <h2 id="neu" className="display-lg">
            Zuletzt publiziert
          </h2>
        </div>
        <ArticleList articles={latest} />
      </section>
    </>
  );
}
