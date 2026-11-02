import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArticleCardLink } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { SearchForm } from "@/components/content/search-form";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { listKnowledgeTopics, listPublicArticles } from "@/server/modules/content/articles";

export const metadata: Metadata = {
  title: "Wissen",
  description: "Fachlich geprüfte Artikel zu Multipler Sklerose – mit Kurzfassung, Quellen, Autorenschaft und Prüfdatum.",
};

/** Themenslug für den verständlichen Einstieg (S44). */
const START_TOPIC = "neu-mit-ms";

/** S44 Wissen Übersicht (CON01): Themen, Kurzbeschreibungen, Suche, verständlicher Einstieg. */
export default function KnowledgePage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Wissen"
        title="Verständlich erklärt. Fachlich geprüft."
        description="Allgemeine Informationen zu MS und zum Alltag damit – jeder Artikel nennt Autorenschaft, fachliche Prüfung, Quellen und den nächsten Prüftermin."
      />
      <div className="flex flex-col gap-12">
        <div className="max-w-2xl">
          <SearchForm scope="wissen" label="Im Wissen suchen" id="wissen-suche" />
        </div>
        <Suspense fallback={<PageSkeleton rows={4} />}>
          <KnowledgeContent />
        </Suspense>
        <Notice tone="neutral" title="Allgemeine Information, keine Beratung">
          Die Artikel ersetzen keine ärztliche oder therapeutische Beratung. Für Fragen zu deiner Behandlung sind deine
          behandelnden Fachpersonen da. Erfahrungen anderer Mitglieder findest du getrennt davon in der Community – sie sind
          nicht fachlich geprüft.
        </Notice>
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
  return (
    <>
      {start.length > 0 && (
        <section aria-labelledby="start" className="rounded-[28px] border border-line bg-surface p-2">
          <div className="flex flex-col gap-6 rounded-[20px] bg-sunk p-5 sm:p-7">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">Verständlicher Einstieg</p>
              <h2 id="start" className="text-2xl font-[650] tracking-[-0.02em]">
                Neu mit MS? Starte hier.
              </h2>
              <p className="max-w-2xl text-base text-ink-2">
                Drei ruhige Texte für den Anfang. Du kannst jederzeit pausieren und später weiterlesen.
              </p>
            </div>
            <ul className="grid gap-3 md:grid-cols-3">
              {start.map((a) => (
                <li key={a.id}>
                  <ArticleCardLink article={a} />
                </li>
              ))}
            </ul>
            <Link
              href={`/wissen/thema/${START_TOPIC}`}
              className="inline-flex w-fit items-center gap-1.5 text-base font-semibold text-ink underline underline-offset-4"
            >
              Alle Artikel für den Einstieg <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="themen">
        <SectionHeader id="themen" title="Themen" description="Wähle ein Thema, das dich gerade beschäftigt." />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topics
            .filter((t) => t.articleCount > 0)
            .map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/wissen/thema/${t.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-2 hover:bg-raised"
                >
                  <h3 className="text-lg font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{t.name}</h3>
                  <p className="flex-1 text-base text-ink-2">{t.description}</p>
                  <p className="tabular text-sm font-semibold text-ink-2">
                    {t.articleCount} Artikel
                  </p>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <section aria-labelledby="neu">
        <SectionHeader id="neu" title="Zuletzt publiziert" />
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {latest.map((a) => (
            <li key={a.id}>
              <ArticleCardLink article={a} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
