import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/content/page-container";
import { Icon } from "@/components/ui/icon";
import { ExternalLink, Notice, PageHeader } from "@/components/ui/primitives";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/time";
import { getSafetyContacts, telHref, type SafetyContact } from "@/server/modules/content/safety";

export const metadata: Metadata = {
  title: "Sicherheit und akute Hilfe",
  description: "Notrufnummern und Hilfewege in der Schweiz sowie die Grenzen dieser Plattform. Ohne Anmeldung lesbar.",
};

/**
 * S49 Sicherheit und akute Hilfe (SAF06, AT10). Reine Server-Komponente ohne Sitzungszugriff:
 * lesbar ohne Login, ohne JavaScript, bei gesperrtem Konto und während einer Community-Störung.
 * Kontakte gecacht aus der Datenbank, mit statischem Rückfall.
 */
export default async function SafetyPage() {
  const { source, contacts } = await getSafetyContacts();
  return (
    <PageContainer narrow>
      <PageHeader
        eyebrow="Sicherheit"
        title="Sicherheit und akute Hilfe"
        description="Diese Seite ist immer ohne Anmeldung erreichbar. Sie nennt Hilfewege in der Schweiz und erklärt ehrlich, was diese Plattform leisten kann – und was nicht."
      />

      <div className="flex flex-col gap-12">
        <section aria-labelledby="akut" className="flex flex-col gap-5 rounded-[28px] bg-danger-soft p-6 sm:p-8">
          <div className="flex flex-col gap-2">
            <h2 id="akut" className="text-2xl font-[650] tracking-[-0.02em] text-ink">
              Bei akuter Lebensgefahr
            </h2>
            <p className="text-lg text-ink">
              Ruf sofort den Sanitätsnotruf an. Warte nicht auf eine Antwort in der Community – hier liest niemand rund um die Uhr mit.
            </p>
          </div>
          <a
            href="tel:144"
            className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-[16px] bg-danger px-6 text-xl font-semibold text-white transition-colors duration-150 hover:bg-danger/90 sm:w-fit dark:text-ink-inverse"
          >
            <Icon name="phone" className="size-6" />
            144 anrufen
          </a>
        </section>

        <section aria-labelledby="hilfewege" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="hilfewege" className="text-xl font-[650] text-ink">
              Hilfewege in der Schweiz
            </h2>
            <p className="text-base text-ink-2">Mit Erreichbarkeit, Region und Datum der letzten Prüfung.</p>
          </div>
          {source === "fallback" && (
            <Notice tone="warning" title="Die gepflegte Liste ist gerade nicht abrufbar">
              Wir zeigen die allgemein bekannten Schweizer Notrufnummern. Sie gelten in der ganzen Schweiz und sind kostenlos.
            </Notice>
          )}
          <ul className="flex flex-col gap-3">
            {contacts.map((c) => (
              <li key={c.id}>
                <ContactCard contact={c} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="grenzen" className="flex flex-col gap-4">
          <h2 id="grenzen" className="text-xl font-[650] text-ink">
            Was diese Plattform nicht ist
          </h2>
          <ul className="flex flex-col divide-y divide-line rounded-[20px] border border-line bg-surface px-5 sm:px-6">
            {[
              ["Kein Notfalldienst", "Bei akuter Gefahr hilft nur der direkte Anruf bei einer der Nummern oben."],
              ["Keine Überwachung rund um die Uhr", `Die Moderation ist ${site.moderationHours} (Zeitzone Zürich) im Dienst. Ausserhalb dieser Zeiten liest niemand mit.`],
              ["Kein automatischer Notruf", "Meldungen, Beiträge oder Tagebucheinträge lösen nie einen Notruf aus."],
              ["Keine Ortung", "Wir kennen deinen Standort nicht und können niemanden zu dir schicken."],
              ["Keine Auswertung deines Tagebuchs", "Deine Einträge werden nicht gelesen, nicht bewertet und nicht auf Krisen geprüft."],
              ["Keine medizinische Beratung", "Für Fragen zu Beschwerden, Medikamenten oder Therapie sind deine behandelnden Fachpersonen da."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-4 py-4">
                <Icon name="minus" className="mt-1 size-5 shrink-0 text-ink-3" />
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-ink">{t}</p>
                  <p className="text-base text-ink-2">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="moderation" className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            <h2 id="moderation" className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <Icon name="clock" className="size-5" />
              Moderationszeiten
            </h2>
            <p className="text-base text-ink">
              Die Moderation ist <strong>{site.moderationHours}</strong> erreichbar, auch am Wochenende. Meldungen ausserhalb dieser
              Zeiten werden ab dem nächsten Dienstbeginn bearbeitet.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <Icon name="users" className="size-5" />
              Sorge um jemand anderen?
            </h2>
            <p className="text-base text-ink">
              Wenn du in der Community einen Beitrag siehst, der dir Sorgen macht, melde ihn über «Melden». Bei unmittelbarer Gefahr
              ruf selbst <a href="tel:144" className="font-semibold underline underline-offset-4">144</a> oder{" "}
              <a href="tel:117" className="font-semibold underline underline-offset-4">117</a> an.
            </p>
          </div>
        </section>

        <Notice tone="neutral" title="Hinweis zu den Angaben">
          Die Hilfewege werden vor der Veröffentlichung und danach monatlich fachlich geprüft. Siehst du einen Fehler?{" "}
          <Link href="/kontakt">Teile es uns mit</Link> – das Kontaktformular ist kein Notfallkanal.
        </Notice>
      </div>
    </PageContainer>
  );
}

function ContactCard({ contact: c }: { contact: SafetyContact }) {
  return (
    <article aria-labelledby={`k-${c.id}`} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="flex min-w-0 flex-col gap-2">
        <h3 id={`k-${c.id}`} className="text-lg font-semibold text-ink">
          {c.name}
        </h3>
        <p className="text-base text-ink">{c.description}</p>
        <dl className="flex flex-col gap-1 text-sm text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
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
          <ExternalLink href={c.url} className="w-fit text-base">
            {c.url.replace(/^https:\/\/(www\.)?/, "")}
          </ExternalLink>
        )}
      </div>
      {c.phone && (
        <a
          href={telHref(c.phone)}
          className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-line-2 bg-surface px-6 text-lg font-semibold text-ink transition-colors duration-150 hover:border-field hover:bg-raised"
        >
          <Icon name="phone" className="size-5" />
          <span className="tabular">{c.phone}</span>
          <span className="sr-only"> anrufen</span>
        </a>
      )}
    </article>
  );
}
