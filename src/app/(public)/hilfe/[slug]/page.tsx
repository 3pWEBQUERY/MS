import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UsefulActionSlot } from "@/components/analytics/useful-action-slot";
import { BookmarkSlot } from "@/components/content/bookmark-slot";
import { cantonList, OfferList } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { RichText } from "@/components/content/rich-text";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BackLink, ExternalLink, KeyValue, Notice, PageSkeleton, Skeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { languageLabel } from "@/server/modules/content/shared";
import { getPublicOffer, helpTopicName, listHelpTopics, offerAlternatives } from "@/server/modules/content/offers";

export const metadata: Metadata = { title: "Hilfsangebot" };

/**
 * S48 Unterstützungsangebot (CON04, CON05): Organisation, Zuständigkeit, Zielgruppe, Sprache,
 * Zugang, Kostenhinweis, Kontaktweg, geprüfter Link, Prüfdatum. Keine Bewertung, keine
 * Terminvermittlung. Abgelaufene Angebote zeigen keine Kontaktdaten, dafür Alternativen (F03).
 */
export default function OfferPage({ params }: PageProps<"/hilfe/[slug]">) {
  return (
    <PageContainer>
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <OfferContent params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function OfferContent({ params }: { params: PageProps<"/hilfe/[slug]">["params"] }) {
  const { slug } = await params;
  const [result, topics] = await Promise.all([getPublicOffer(slug), listHelpTopics()]);
  if (!result) notFound();
  const names = (s: string) => helpTopicName(topics, s);
  const alternatives = await offerAlternatives(result.offer, 3);

  if (result.state === "unavailable") {
    const o = result.offer;
    return (
      <div className="flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-line pb-10">
          <BackLink href="/hilfe">Hilfe finden</BackLink>
          <p className="eyebrow">{o.organization}</p>
          <h1 className="display-lg">{o.title}</h1>
        </header>
        <Notice tone="warning" title="Dieses Angebot ist derzeit nicht verfügbar">
          Die Angaben werden gerade überprüft. Bis die Prüfung abgeschlossen ist, zeigen wir keine Kontaktdaten an.
        </Notice>
        <Alternatives offers={alternatives} names={names} />
        <ButtonLink href="/hilfe" variant="secondary" className="w-fit">
          Alle Angebote ansehen
        </ButtonLink>
      </div>
    );
  }

  const o = result.offer;
  return (
    <div className="flex flex-col gap-20 lg:gap-28">
      <div className="flex flex-col gap-10 sm:gap-14">
        <header className="flex flex-col gap-6 border-b border-line pb-10 sm:pb-14">
          <BackLink href="/hilfe">Hilfe finden</BackLink>
          <p className="eyebrow">{o.organization}</p>
          <h1 className="display-lg max-w-5xl">{o.title}</h1>
          <p className="max-w-3xl text-xl leading-relaxed text-ink-2">{o.summary}</p>
        </header>

        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20">
          <div className="flex min-w-0 flex-col gap-14">
            <section aria-labelledby="beschreibung" className="flex flex-col gap-4">
              <h2 id="beschreibung" className="display-sm">
                Was das Angebot umfasst
              </h2>
              <RichText text={o.description} headingOffset={1} />
              <p className="max-w-[68ch] text-sm text-ink-2">
                Beschreibung gemäss Angaben des Anbieters. Keine Bewertung und keine Verfügbarkeitsgarantie.
              </p>
            </section>

            <section aria-labelledby="eckdaten" className="flex flex-col gap-4">
              <h2 id="eckdaten" className="display-sm">
                Eckdaten
              </h2>
              <KeyValue
                className="border-y border-line"
                items={[
                  ["Organisation", o.organization],
                  ["Zuständigkeit", o.responsibility],
                  ["Zielgruppe", o.audience],
                  ["Region", cantonList(o.cantons)],
                  ["Sprachen", o.languages.map(languageLabel).join(", ")],
                  ["Zugang", o.access],
                  ["Kosten", o.costNote],
                  ["Themen", o.topicSlugs.map(names).join(" · ")],
                ]}
              />
            </section>
          </div>

          <aside aria-label="Kontakt und Prüfung" className="flex flex-col gap-10 lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-col gap-4 border-t border-ink pt-5">
              <h2 className="display-sm">Kontakt</h2>
              <p className="text-lg text-ink">{o.contactWay}</p>
              {/* CON04: geprüfte URL, ohne angehängte Parameter, als extern erkennbar */}
              <ExternalLink href={o.url} className="min-h-11 w-fit break-words text-base">
                Website von {o.organization}
              </ExternalLink>
              <p className="text-sm text-ink-2">
                Du verlässt diese Plattform. Es werden keine Profil- oder Gesundheitsdaten übertragen.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-5">
              <p className="inline-flex items-center gap-2 font-semibold text-ink">
                <Icon name="check-circle" className="size-5 text-accent-ink" />
                Redaktionell geprüft
              </p>
              {o.reviewedAt && <p className="text-base text-ink-2">Geprüft am {formatDate(o.reviewedAt)}</p>}
              <p className="text-base text-ink-2">Nächste Prüfung spätestens {formatDate(o.nextReviewAt)}</p>
            </div>
            <div className="flex flex-col gap-4 border-t border-line pt-5">
              <Suspense fallback={<Skeleton className="h-10 w-40 rounded-[10px]" />}>
                <BookmarkSlot targetType="offer" targetId={o.id} returnTo={`/hilfe/${o.slug}`} />
              </Suspense>
              <Suspense fallback={null}>
                {/* PRD 15: nur mit Einwilligung, ohne Objekt-ID */}
                <UsefulActionSlot action="offer_opened" />
              </Suspense>
              <Link
                href={`/kontakt?ref=offer&id=${o.id}`}
                className="link-quiet inline-flex min-h-11 w-fit items-center gap-2 text-base font-medium text-ink"
              >
                <Icon name="flag" className="size-4" />
                Veraltete Angabe melden
              </Link>
            </div>
          </aside>
        </div>
      </div>
      <Alternatives offers={alternatives} names={names} title="Ähnliche Angebote" />
    </div>
  );
}

function Alternatives({
  offers,
  names,
  title = "Alternativen",
}: {
  offers: Awaited<ReturnType<typeof offerAlternatives>>;
  names: (s: string) => string;
  title?: string;
}) {
  if (offers.length === 0) return null;
  return (
    <section aria-labelledby="alternativen" className="flex flex-col gap-6">
      <h2 id="alternativen" className="display-md">
        {title}
      </h2>
      <OfferList offers={offers} topicNames={names} />
    </section>
  );
}
