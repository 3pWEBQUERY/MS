import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UsefulActionSlot } from "@/components/analytics/useful-action-slot";
import { BookmarkSlot } from "@/components/content/bookmark-slot";
import { cantonList, OfferCardLink } from "@/components/content/cards";
import { PageContainer } from "@/components/content/page-container";
import { RichText } from "@/components/content/rich-text";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BackLink, Card, ExternalLink, KeyValue, Notice, PageSkeleton, Skeleton } from "@/components/ui/primitives";
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
        <header className="flex flex-col gap-4">
          <BackLink href="/hilfe">Hilfe finden</BackLink>
          <p className="text-sm font-semibold text-ink-2">{o.organization}</p>
          <h1 className="text-3xl font-[650] tracking-[-0.025em] text-ink sm:text-[2.5rem] sm:leading-[1.08]">{o.title}</h1>
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
    <div className="flex flex-col gap-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-4">
            <BackLink href="/hilfe">Hilfe finden</BackLink>
            <p className="text-base font-semibold text-ink-2">{o.organization}</p>
            <h1 className="text-3xl font-[650] tracking-[-0.025em] text-ink sm:text-[2.5rem] sm:leading-[1.08]">{o.title}</h1>
            <p className="max-w-3xl text-lg text-ink-2">{o.summary}</p>
          </header>

          <section aria-labelledby="beschreibung" className="flex flex-col gap-3">
            <h2 id="beschreibung" className="text-xl font-[650] text-ink">
              Was das Angebot umfasst
            </h2>
            <RichText text={o.description} className="text-base" headingOffset={1} />
            <p className="text-sm text-ink-2">Beschreibung gemäss Angaben des Anbieters. Keine Bewertung und keine Verfügbarkeitsgarantie.</p>
          </section>

          <section aria-labelledby="eckdaten">
            <h2 id="eckdaten" className="mb-2 text-xl font-[650] text-ink">
              Eckdaten
            </h2>
            <KeyValue
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

        <aside aria-label="Kontakt und Prüfung" className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-ink">Kontakt</h2>
            <p className="text-base text-ink">{o.contactWay}</p>
            {/* CON04: geprüfte URL, ohne angehängte Parameter, als extern erkennbar */}
            <ExternalLink href={o.url} className="w-fit break-all text-base">
              Website von {o.organization}
            </ExternalLink>
            <p className="text-sm text-ink-2">
              Du verlässt diese Plattform. Es werden keine Profil- oder Gesundheitsdaten übertragen.
            </p>
          </Card>
          <Card tone="sunk" className="flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 font-semibold text-ink">
              <Icon name="check-circle" className="size-5" />
              Redaktionell geprüft
            </p>
            {o.reviewedAt && <p className="text-base text-ink-2">Geprüft am {formatDate(o.reviewedAt)}</p>}
            <p className="text-base text-ink-2">Nächste Prüfung spätestens {formatDate(o.nextReviewAt)}</p>
          </Card>
          <Card className="flex flex-col gap-4">
            <Suspense fallback={<Skeleton className="h-10 w-40 rounded-[10px]" />}>
              <BookmarkSlot targetType="offer" targetId={o.id} returnTo={`/hilfe/${o.slug}`} />
            </Suspense>
            <Suspense fallback={null}>
              {/* PRD 15: nur mit Einwilligung, ohne Objekt-ID */}
              <UsefulActionSlot action="offer_opened" />
            </Suspense>
            <Link
              href={`/kontakt?ref=offer&id=${o.id}`}
              className="inline-flex min-h-10 w-fit items-center gap-2 text-base font-medium text-ink underline underline-offset-4"
            >
              <Icon name="flag" className="size-4" />
              Veraltete Angabe melden
            </Link>
          </Card>
        </aside>
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
    <section aria-labelledby="alternativen">
      <h2 id="alternativen" className="mb-4 text-xl font-[650] text-ink">
        {title}
      </h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {offers.map((a) => (
          <li key={a.id}>
            <OfferCardLink offer={a} topicNames={names} />
          </li>
        ))}
      </ul>
    </section>
  );
}
