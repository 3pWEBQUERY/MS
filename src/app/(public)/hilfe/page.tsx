import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { OfferCardLink } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { CANTONS, cantonName } from "@/lib/catalog";
import { filterPublicOffers, helpTopicName, listHelpTopics, type OfferCard } from "@/server/modules/content/offers";

export const metadata: Metadata = {
  title: "Hilfe finden",
  description: "Schweizer Unterstützungsangebote für Menschen mit MS – nach Thema und Kanton, ohne Standortfreigabe.",
};

/** S47 Hilfe-Übersicht (CON04, US22): Thema und Kanton wählen, keine Standortfreigabe nötig. */
export default function HelpPage({ searchParams }: PageProps<"/hilfe">) {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Hilfe finden"
        title="Unterstützung in der Schweiz"
        description="Beratung, Entlastung, Arbeit, Versicherungen und mehr. Wähle ein Thema und – wenn du willst – deinen Kanton. Wir fragen nicht nach deinem Standort."
      />
      <div className="flex flex-col gap-10">
        <Notice tone="danger" icon="lifebuoy" title="Akute Gefahr?">
          Sanitätsnotruf <strong className="tabular">144</strong>. Alle Hilfewege findest du unter{" "}
          <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
        </Notice>
        <Suspense fallback={<PageSkeleton rows={4} />}>
          <HelpContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function HelpContent({ searchParams }: { searchParams: PageProps<"/hilfe">["searchParams"] }) {
  const sp = await searchParams;
  const topics = await listHelpTopics();
  const topic = topics.some((t) => t.slug === one(sp.thema)) ? one(sp.thema) : null;
  const canton = CANTONS.some(([c]) => c === one(sp.kanton)) ? one(sp.kanton) : null;
  const { regional, national } = await filterPublicOffers(topic, canton);
  const names = (slug: string) => helpTopicName(topics, slug);
  const filtered = Boolean(topic || canton);
  const cantonLabel = canton ? cantonName(canton) : null;
  const topicLabel = topic ? names(topic) : null;
  const total = regional.length + national.length;

  return (
    <>
      <form method="get" action="/hilfe" className="grid gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor="thema" className="text-base font-semibold text-ink">
            Thema
          </label>
          <Select id="thema" name="thema" defaultValue={topic ?? ""}>
            <option value="">Alle Themen</option>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="kanton" className="text-base font-semibold text-ink">
            Kanton <span className="text-sm font-normal text-ink-2">(optional)</span>
          </label>
          <Select id="kanton" name="kanton" defaultValue={canton ?? ""}>
            <option value="">Ganze Schweiz</option>
            {CANTONS.map(([c, n]) => (
              <option key={c} value={c}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClass("primary", "md")}>
            Angebote anzeigen
          </button>
          {filtered && (
            <Link href="/hilfe" className={buttonClass("ghost", "md")}>
              Filter zurücksetzen
            </Link>
          )}
        </div>
      </form>

      {!topic && !canton && topics.length > 0 && (
        <section aria-labelledby="themen">
          <SectionHeader id="themen" title="Nach Thema" />
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/hilfe?thema=${t.slug}`}
                  className="inline-flex min-h-11 items-center rounded-[12px] border border-line-2 bg-surface px-4 text-base font-medium text-ink transition-colors hover:border-field hover:bg-raised"
                >
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p role="status" className="text-base text-ink-2">
        <span className="tabular font-semibold text-ink">{total}</span> {total === 1 ? "Angebot" : "Angebote"}
        {topicLabel && <> zum Thema «{topicLabel}»</>}
        {cantonLabel && <> für {cantonLabel} und schweizweit</>}
      </p>

      {total === 0 ? (
        <EmptyState
          icon="filter"
          title="Keine passenden Angebote gefunden"
          action={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/hilfe" variant="secondary">
                Filter zurücksetzen
              </ButtonLink>
              {topic && canton && (
                <ButtonLink href={`/hilfe?kanton=${canton}`} variant="ghost">
                  Alle Themen in {cantonLabel}
                </ButtonLink>
              )}
            </div>
          }
        >
          Für diese Kombination ist noch kein geprüftes Angebot erfasst. Versuche ein breiteres Thema oder die ganze Schweiz.
        </EmptyState>
      ) : canton ? (
        <>
          <OfferSection id="regional" title={`In ${cantonLabel}`} offers={regional} names={names}>
            {regional.length === 0 && (
              <Notice tone="info" title={`Für ${cantonLabel} ist noch kein regionales Angebot erfasst`}>
                Die folgenden Angebote sind schweizweit verfügbar und stehen dir ebenfalls offen.
              </Notice>
            )}
          </OfferSection>
          {national.length > 0 && <OfferSection id="schweizweit" title="Schweizweit verfügbar" offers={national} names={names} />}
        </>
      ) : (
        <OfferSection id="angebote" title={topicLabel ? `Angebote zu «${topicLabel}»` : "Alle Angebote"} offers={[...national, ...regional]} names={names} />
      )}

      <Notice tone="neutral" title="So prüfen wir Angebote">
        Die Redaktion prüft jedes Angebot vor der Publikation beim Anbieter und spätestens nach sechs Monaten erneut. Leistungen und
        Kosten richten sich nach dem jeweiligen Anbieter. Wir vermitteln keine Termine und bewerten keine Behandlungen. Fehler
        oder veraltete Angaben? <Link href="/kontakt">Hinweis senden</Link>.
      </Notice>
    </>
  );
}

function OfferSection({
  id,
  title,
  offers,
  names,
  children,
}: {
  id: string;
  title: string;
  offers: OfferCard[];
  names: (slug: string) => string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-xl font-[650] text-ink">
        {title}
      </h2>
      {children}
      {offers.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <li key={o.id}>
              <OfferCardLink offer={o} topicNames={names} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
