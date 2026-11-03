import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { OfferList } from "@/components/content/cards";
import { EmergencyStrip } from "@/components/content/emergency-strip";
import { PageContainer } from "@/components/content/page-container";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
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
        title={
          <>
            Unterstützung in der <em>Schweiz</em>
          </>
        }
        description="Beratung, Entlastung, Arbeit, Versicherungen und mehr. Wähle ein Thema und – wenn du willst – deinen Kanton. Wir fragen nicht nach deinem Standort."
      />
      <div className="flex flex-col gap-14 sm:gap-16">
        <EmergencyStrip title="Akute Gefahr?">
          Sanitätsnotruf <strong className="tabular text-ink">144</strong>. Alle Hilfewege findest du unter{" "}
          <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
        </EmergencyStrip>
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
  // Trefferzahl als Live-Region (nach dem Filtern angekündigt), steht in der Kopfzeile der Ergebnisse
  const status = (
    <p role="status" className="text-base text-ink-2">
      <span className="tabular font-display text-[2rem] leading-none tracking-[-0.02em] text-ink">{total}</span>{" "}
      {total === 1 ? "Angebot" : "Angebote"}
      {topicLabel && <> zum Thema «{topicLabel}»</>}
      {cantonLabel && <> für {cantonLabel} und schweizweit</>}
    </p>
  );

  return (
    <>
      <form method="get" action="/hilfe" className="grid gap-5 border-t border-ink pt-6 md:grid-cols-[1fr_1fr_auto] md:items-end md:gap-6">
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
        <section aria-labelledby="themen" className="flex flex-col gap-6">
          <h2 id="themen" className="display-sm">
            Nach Thema
          </h2>
          {/* Themen als nummerierter Index in Spalten – ganze Zeile ist Link (≥ 44px) */}
          <ol className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
            {topics.map((t, i) => (
              <li key={t.slug} className="border-b border-line">
                <Link href={`/hilfe?thema=${t.slug}`} data-focus-inset className="group flex min-h-14 items-center gap-4 py-3">
                  <span aria-hidden="true" className="tabular w-6 shrink-0 font-mono text-sm text-ink-3 group-hover:text-accent-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-lg font-medium text-ink underline decoration-transparent decoration-1 underline-offset-[0.25em] transition-colors duration-150 group-hover:decoration-current">
                    {t.name}
                  </span>
                  <Icon name="arrow-right" className="nudge size-5 shrink-0 text-ink-3 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex flex-col gap-16">
        {total === 0 ? (
          <>
            {status}
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
          </>
        ) : canton ? (
          <>
            <OfferSection id="regional" title={`In ${cantonLabel}`} offers={regional} names={names} meta={status}>
              {regional.length === 0 && (
                <Notice tone="info" title={`Für ${cantonLabel} ist noch kein regionales Angebot erfasst`}>
                  Die folgenden Angebote sind schweizweit verfügbar und stehen dir ebenfalls offen.
                </Notice>
              )}
            </OfferSection>
            {national.length > 0 && <OfferSection id="schweizweit" title="Schweizweit verfügbar" offers={national} names={names} />}
          </>
        ) : (
          <OfferSection id="angebote" title={topicLabel ? `Angebote zu «${topicLabel}»` : "Alle Angebote"} offers={[...national, ...regional]} names={names} meta={status} />
        )}
      </div>

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
  meta,
  children,
}: {
  id: string;
  title: string;
  offers: OfferCard[];
  names: (slug: string) => string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h2 id={id} className="display-md">
          {title}
        </h2>
        {meta}
      </div>
      {children}
      {offers.length > 0 && <OfferList offers={offers} topicNames={names} />}
    </section>
  );
}
