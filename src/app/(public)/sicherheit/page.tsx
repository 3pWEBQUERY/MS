import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/content/page-container";
import { Icon } from "@/components/ui/icon";
import { ExternalLink, Notice, PageHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/time";
import { getSafetyContacts, telHref, type SafetyContact } from "@/server/modules/content/safety";

export const metadata: Metadata = {
  title: "Sicherheit und akute Hilfe",
  description: "Notrufnummern und Hilfewege in der Schweiz sowie die Grenzen dieser Plattform. Ohne Anmeldung lesbar.",
};

const LIMITS = [
  ["Kein Notfalldienst", "Bei akuter Gefahr hilft nur der direkte Anruf bei einer der Nummern oben."],
  ["Keine Überwachung rund um die Uhr", `Die Moderation ist ${site.moderationHours} (Zeitzone Zürich) im Dienst. Ausserhalb dieser Zeiten liest niemand mit.`],
  ["Kein automatischer Notruf", "Meldungen, Beiträge oder Tagebucheinträge lösen nie einen Notruf aus."],
  ["Keine Ortung", "Wir kennen deinen Standort nicht und können niemanden zu dir schicken."],
  ["Keine Auswertung deines Tagebuchs", "Deine Einträge werden nicht gelesen, nicht bewertet und nicht auf Krisen geprüft."],
  ["Keine medizinische Beratung", "Für Fragen zu Beschwerden, Medikamenten oder Therapie sind deine behandelnden Fachpersonen da."],
];

const two = (i: number) => String(i + 1).padStart(2, "0");

/**
 * S49 Sicherheit und akute Hilfe (SAF06, AT10). Reine Server-Komponente ohne Sitzungszugriff:
 * lesbar ohne Login, ohne JavaScript, bei gesperrtem Konto und während einer Community-Störung.
 * Kontakte gecacht aus der Datenbank, mit statischem Rückfall.
 */
export default async function SafetyPage() {
  const { source, contacts } = await getSafetyContacts();
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Sicherheit"
        title={
          <>
            Sicherheit und <em>akute Hilfe</em>
          </>
        }
        description="Diese Seite ist immer ohne Anmeldung erreichbar. Sie nennt Hilfewege in der Schweiz und erklärt ehrlich, was diese Plattform leisten kann – und was nicht."
      />

      <div className="flex flex-col gap-20 lg:gap-28">
        {/* Der wichtigste Moment der Seite: 144 typografisch gross, Anruf als grösste Fläche (SAF06) */}
        <section
          aria-labelledby="akut"
          className="grid gap-8 rounded-[28px] bg-danger-soft p-6 sm:p-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-16 lg:p-12"
        >
          <p
            className="font-display text-[6.5rem] leading-[0.85] tracking-[-0.05em] text-danger tabular sm:text-[9rem] lg:text-[11rem]"
            aria-hidden="true"
          >
            144
          </p>
          <div className="flex max-w-2xl flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 id="akut" className="display-md">
                Bei akuter Lebensgefahr
              </h2>
              <p className="text-lg text-ink">
                Ruf sofort den Sanitätsnotruf an. Warte nicht auf eine Antwort in der Community – hier liest niemand rund um die Uhr mit.
              </p>
            </div>
            <a
              href="tel:144"
              className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-[16px] bg-danger px-8 text-xl font-semibold text-white transition-colors duration-150 hover:bg-danger/90 sm:w-fit dark:text-ink-inverse"
            >
              <Icon name="phone" className="size-6" />
              144 anrufen
            </a>
          </div>
        </section>

        {/* Hilfewege als Nummern-Verzeichnis: Nummer zuerst, gross und direkt wählbar */}
        <section aria-labelledby="hilfewege" className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 id="hilfewege" className="display-lg">
              Hilfewege in der Schweiz
            </h2>
            <p className="text-lg text-ink-2">Mit Erreichbarkeit, Region und Datum der letzten Prüfung.</p>
          </div>
          {source === "fallback" && (
            <Notice tone="warning" title="Die gepflegte Liste ist gerade nicht abrufbar">
              Wir zeigen die allgemein bekannten Schweizer Notrufnummern. Sie gelten in der ganzen Schweiz und sind kostenlos.
            </Notice>
          )}
          <ul className="border-t border-ink">
            {contacts.map((c) => (
              <li key={c.id} className="border-b border-line">
                <ContactRow contact={c} />
              </li>
            ))}
          </ul>
        </section>

        {/* Ehrliche Grenzen im Raster der Startseite */}
        <section aria-labelledby="grenzen" className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <h2 id="grenzen" className="display-lg lg:sticky lg:top-28 lg:self-start">
            Was diese Plattform <em>nicht</em> ist
          </h2>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {LIMITS.map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-2 border-t border-line py-6">
                <span className="font-mono text-sm text-accent-ink" aria-hidden="true">
                  {two(i)}
                </span>
                <p className="text-lg font-semibold text-ink">{t}</p>
                <p className="text-base text-ink-2">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-x-10 gap-y-12 border-t border-ink pt-8 md:grid-cols-2">
          <section aria-labelledby="moderation" className="flex flex-col gap-3">
            <h2 id="moderation" className="display-sm inline-flex items-center gap-3">
              <Icon name="clock" className="size-6 shrink-0 text-accent-ink" />
              Moderationszeiten
            </h2>
            <p className="text-base text-ink">
              Die Moderation ist <strong>{site.moderationHours}</strong> erreichbar, auch am Wochenende. Meldungen ausserhalb dieser
              Zeiten werden ab dem nächsten Dienstbeginn bearbeitet.
            </p>
          </section>
          <section aria-labelledby="sorge" className="flex flex-col gap-3">
            <h2 id="sorge" className="display-sm inline-flex items-center gap-3">
              <Icon name="users" className="size-6 shrink-0 text-accent-ink" />
              Sorge um jemand anderen?
            </h2>
            <p className="text-base text-ink">
              Wenn du in der Community einen Beitrag siehst, der dir Sorgen macht, melde ihn über «Melden». Bei unmittelbarer Gefahr
              ruf selbst <a href="tel:144" className="font-semibold underline underline-offset-4">144</a> oder{" "}
              <a href="tel:117" className="font-semibold underline underline-offset-4">117</a> an.
            </p>
          </section>
        </div>

        <Notice tone="neutral" title="Hinweis zu den Angaben">
          Die Hilfewege werden vor der Veröffentlichung und danach monatlich fachlich geprüft. Siehst du einen Fehler?{" "}
          <Link href="/kontakt">Teile es uns mit</Link> – das Kontaktformular ist kein Notfallkanal.
        </Notice>
      </div>
    </PageContainer>
  );
}

function ContactRow({ contact: c }: { contact: SafetyContact }) {
  return (
    <article
      aria-labelledby={`k-${c.id}`}
      className="grid gap-x-12 gap-y-5 py-7 sm:py-8 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start"
    >
      {/* Nummer zuerst (auch für Tastatur und Screenreader): schnell erfassbar und direkt wählbar */}
      {c.phone && (
        <a
          href={telHref(c.phone)}
          className="group inline-flex min-h-16 w-full items-center justify-between gap-4 rounded-[16px] border border-line-2 bg-surface px-5 text-ink transition-colors duration-150 hover:border-field hover:bg-raised sm:w-fit sm:justify-start md:w-full"
        >
          {/* Kurznummern (144, 143 …) gross; längere Nummern kleiner, damit sie bei 320px nicht überlaufen */}
          <span
            className={cn(
              "tabular min-w-0 font-display leading-none tracking-[-0.03em]",
              c.phone.replace(/\s/g, "").length <= 4 ? "text-[2.5rem]" : "text-[1.5rem]",
            )}
          >
            {c.phone}
          </span>
          <span className="sr-only"> anrufen</span>
          <Icon name="phone" className="size-5 shrink-0 text-danger" />
        </a>
      )}
      <div className="flex min-w-0 flex-col gap-2 md:col-start-2 md:row-start-1">
        <h3 id={`k-${c.id}`} className="text-xl font-semibold text-ink">
          {c.name}
        </h3>
        <p className="max-w-2xl text-base text-ink">{c.description}</p>
        <dl className="mt-1 flex flex-col gap-1 text-sm text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
          <div className="flex gap-1.5">
            <dt className="font-semibold">Erreichbar:</dt>
            <dd>{c.availability}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-semibold">Region:</dt>
            <dd>{c.region}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-semibold">Geprüft:</dt>
            <dd>{c.verifiedAt ? `${formatDate(c.verifiedAt)}${c.verifiedBy ? `, ${c.verifiedBy}` : ""}` : "Prüfung ausstehend"}</dd>
          </div>
        </dl>
        {c.url && (
          <ExternalLink href={c.url} className="mt-1 w-fit text-base">
            {c.url.replace(/^https:\/\/(www\.)?/, "")}
          </ExternalLink>
        )}
      </div>
    </article>
  );
}
