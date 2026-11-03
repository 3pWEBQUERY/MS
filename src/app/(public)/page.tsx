import type { Metadata } from "next";
import Link from "next/link";
import { FiberField } from "@/components/three";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name} – Leben mit MS in der Schweiz` },
  description: site.description,
};

const MOMENTS = [
  {
    href: "/registrieren?ziel=festhalten",
    title: "Etwas festhalten",
    text: "Energie, Stimmung, Fatigue oder Symptome – freiwillig und nur für dich sichtbar.",
  },
  {
    href: "/registrieren?ziel=austausch",
    title: "Austausch finden",
    text: "Moderierte Gruppen und Gespräche, die erst nach gegenseitiger Zustimmung beginnen.",
  },
  {
    href: "/wissen",
    title: "Wissen oder Hilfe finden",
    text: "Fachlich geprüfte Artikel und Schweizer Hilfsangebote – auch ohne Konto.",
  },
];

const PRINCIPLES = [
  ["Keine Streaks", "Du musst nicht täglich kommen. Pausen sind normal und bleiben ohne Folgen."],
  ["Keine Pflichtangaben", "Kein Diagnosenachweis, keine Angaben zum Verlauf. Community funktioniert ohne Tagebuch."],
  ["Kein Datenverkauf", "Keine Werbung, keine Tracker von Dritten, keine Weitergabe. Nutzungsstatistik nur, wenn du sie selbst einschaltest."],
  ["Keine Interpretation", "Deine Einträge werden nicht bewertet, nicht verglichen und nicht ausgewertet."],
];

const AREAS = [
  { title: "Heute", text: "Dein ruhiger Startpunkt: «Mein Moment», Schnellzugriffe und – wenn du willst – deine letzten Einträge. Ohne Warnpunkte, ohne Aufgabenliste.", note: "Höchstens drei nächste Schritte" },
  { title: "Mein MS", text: "Kurzer Check-in ohne Pflichtfelder. Symptome, Fatigue und Notizen mit Verlauf als Datentabelle.", note: "Nur für dich sichtbar" },
  { title: "Community", text: "Chronologischer Feed ohne Rankings. Betreute offene und geschlossene Gruppen.", note: "Moderiert" },
  { title: "Wissen", text: "Artikel mit Kurzfassung, Quellen, Autorenschaft und fachlicher Prüfung.", note: "Ohne Konto lesbar" },
  { title: "Hilfe", text: "Schweizer Angebote nach Thema und Kanton – ohne Standortfreigabe.", note: "Ohne Konto lesbar" },
];

const VISIBILITY = [
  { title: "Dein Tagebuch", who: "Nur du", text: "Check-ins, Symptome und Notizen sind privat. Keine Freigabe an Kontakte, Redaktion oder Fachpersonen." },
  { title: "Dein Profil", who: "Angemeldete Mitglieder", text: "Pseudonym, ausgewählte Interessen und – wenn du willst – dein Kanton. Nie deine E-Mail-Adresse." },
  { title: "Deine Nachrichten", who: "Du und dein Kontakt", text: "Erst nach beidseitiger Freigabe. Jederzeit beendbar, blockierbar und meldbar." },
];

const LIMITS = [
  ["Kein Notfalldienst", `Die Moderation ist ${site.moderationHours} erreichbar – nicht rund um die Uhr.`],
  ["Keine Diagnose", "Keine Schuberkennung, keine Prognosen, keine Risikowerte."],
  ["Keine Therapieempfehlung", "Erfahrungen sind willkommen, individuelle Anweisungen nicht."],
];

const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
const two = (i: number) => String(i + 1).padStart(2, "0");

/** S01 Startseite: Nutzen, Grenzen, Wissen öffnen, registrieren – keine sensiblen Vorschauen. */
export default function HomePage() {
  return (
    <>
      {/* Hero: Frage in der Display-Serif, Faserfeld als Signatur */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute right-0 top-0 hidden h-[calc(100%-15rem)] w-[54%] lg:block" aria-hidden="true">
          <FiberField className="size-full" />
        </div>
        <div className={`${wrap} relative grid min-h-[calc(100dvh-76px)] content-between gap-12 pb-10 pt-14 sm:pt-20 lg:min-h-[720px] lg:pb-14 lg:pt-28`}>
          <div className="flex max-w-[42rem] flex-col gap-8">
            <p className="eyebrow">
              <span className="index">01</span> Für Erwachsene mit MS · Deutschschweiz
            </p>
            <h1 className="display-xl">
              Was brauchst du <em>gerade?</em>
            </h1>
            <p className="max-w-xl text-xl leading-relaxed text-ink-2">
              Eine ruhige Plattform, die sich nach deiner Energie richtet – nicht umgekehrt. Festhalten, austauschen,
              informiert sein. Alles freiwillig.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/registrieren" size="lg" iconRight={<Icon name="arrow-right" className="nudge size-5" />} className="group">
                Kostenlos registrieren
              </ButtonLink>
              <ButtonLink href="/wissen" size="lg" variant="secondary">
                Wissen ohne Konto lesen
              </ButtonLink>
            </div>
          </div>

          <div className="relative -mx-4 h-56 sm:-mx-6 lg:hidden" aria-hidden="true">
            <FiberField className="size-full" />
          </div>

          {/* Mein Moment: drei Einstiege als nummerierte Spalten */}
          <nav aria-label="Mein Moment – Einstieg" className="lg:max-w-[64rem]">
            <p className="eyebrow mb-4">Mein Moment · höchstens drei nächste Schritte</p>
            <ol className="grid border-t border-ink sm:grid-cols-3">
              {MOMENTS.map((m, i) => (
                <li key={m.title} className="border-b border-line sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
                  <Link href={m.href} className="group flex h-full flex-col gap-3 py-5 sm:py-6" data-focus-inset>
                    <span className="flex items-center justify-between font-mono text-sm text-ink-3">
                      {two(i)}
                      <Icon name="arrow-right" className="nudge size-5 text-ink-3 group-hover:text-accent-ink" />
                    </span>
                    <span className="font-display text-[1.625rem] leading-tight tracking-[-0.015em] text-ink underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 group-hover:decoration-current">
                      {m.title}
                    </span>
                    <span className="text-base text-ink-2">{m.text}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* Prinzipien */}
      <section aria-labelledby="prinzipien" className={`${wrap} py-20 lg:py-28`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">
              <span className="index">02</span> Ruhig statt fordernd
            </p>
            <h2 id="prinzipien" className="display-lg">
              Gebaut für Tage mit <em>wenig Energie.</em>
            </h2>
          </div>
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {PRINCIPLES.map(([title, text], i) => (
              <li key={title} className="flex flex-col gap-3 border-t border-line py-7">
                <span className="font-mono text-sm text-accent-ink">{two(i)}</span>
                <h3 className="display-sm">{title}</h3>
                <p className="text-base text-ink-2">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bereiche: tiefe Fläche, Index */}
      <section aria-labelledby="bereiche" className="bg-deep text-on-deep">
        <div className={`${wrap} py-20 lg:py-28`}>
          <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-5">
              <p className="eyebrow !text-on-deep-2">
                <span className="index !text-deep-accent">03</span> Fünf Bereiche
              </p>
              <h2 id="bereiche" className="display-lg !text-on-deep [&_em]:!text-deep-accent">
                Alles an einem Ort. <em>Nichts muss.</em>
              </h2>
            </div>
            <p className="max-w-sm text-lg text-on-deep-2">
              Jeder Bereich ist direkt erreichbar – mit oder ohne Tagebuch, mit oder ohne Austausch.
            </p>
          </div>
          <ol className="border-t border-deep-line">
            {AREAS.map((a, i) => (
              <li key={a.title} className="grid gap-x-8 gap-y-2 border-b border-deep-line py-7 md:grid-cols-[4rem_minmax(0,14rem)_minmax(0,1fr)_auto] md:items-baseline">
                <span className="font-mono text-sm text-on-deep-2">{two(i)}</span>
                <h3 className="font-display text-[2rem] leading-none tracking-[-0.02em]">{a.title}</h3>
                <p className="max-w-xl text-base text-on-deep-2">{a.text}</p>
                <span className="font-display font-semibold text-xs uppercase tracking-[0.12em] text-deep-accent">{a.note}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sichtbarkeit */}
      <section aria-labelledby="sichtbarkeit" className={`${wrap} py-20 lg:py-28`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div className="flex flex-col gap-5">
            <p className="eyebrow">
              <span className="index">04</span> Privatsphäre
            </p>
            <h2 id="sichtbarkeit" className="display-lg">
              Du weisst immer, <em>wer was sieht.</em>
            </h2>
            <p className="text-lg text-ink-2">
              Gesundheitsdaten und Community sind technisch getrennt. Es gibt keine «Teilen»-Taste im Tagebuch und keine
              Vorschläge auf Basis deiner Einträge.
            </p>
            <Link href="/datenschutz" className="group link-quiet inline-flex w-fit items-center gap-1.5 font-semibold text-ink">
              Datenschutzinformation lesen <Icon name="arrow-right" className="nudge size-4" />
            </Link>
          </div>
          <dl className="border-t border-ink">
            {VISIBILITY.map((v) => (
              <div key={v.title} className="grid gap-x-8 gap-y-2 border-b border-line py-6 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                <dt className="flex flex-col gap-2">
                  <span className="text-lg font-semibold">{v.title}</span>
                  <span className="w-fit font-display font-semibold text-xs uppercase tracking-[0.12em] text-accent-ink">{v.who}</span>
                </dt>
                <dd className="text-base text-ink-2">{v.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Grenzen und Notruf */}
      <section aria-labelledby="grenzen" className="border-y border-line bg-surface">
        <div className={`${wrap} py-20 lg:py-24`}>
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="eyebrow">
              <span className="index">05</span> Ehrliche Grenzen
            </p>
            <h2 id="grenzen" className="display-lg">
              Was diese Plattform <em>nicht</em> ist.
            </h2>
            <p className="text-lg text-ink-2">
              Wir dokumentieren selbst berichtete Beobachtungen und erleichtern Austausch. Für medizinische Fragen sind
              deine behandelnden Fachpersonen da.
            </p>
          </div>
          <ul className="mt-12 grid gap-x-10 md:grid-cols-3">
            {LIMITS.map(([t, d]) => (
              <li key={t} className="flex flex-col gap-2 border-t border-line py-6">
                <p className="text-lg font-semibold">{t}</p>
                <p className="text-ink-2">{d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-6 rounded-[28px] bg-danger-soft p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-10">
            <p className="font-display text-[4.5rem] leading-none tracking-[-0.04em] text-danger tabular" aria-hidden="true">
              144
            </p>
            <p className="text-lg font-semibold text-ink">
              Akute Gefahr? Sanitätsnotruf <span className="tabular">144</span>, allgemeiner Notruf <span className="tabular">112</span>.
            </p>
            <ButtonLink href="/sicherheit" variant="secondary" icon={<Icon name="lifebuoy" className="size-5" />}>
              Alle Hilfewege
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Abschluss */}
      <section className={`${wrap} py-20 lg:py-28`}>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-5">
            <h2 className="display-xl">
              Bereit, wenn <em>du</em> es bist.
            </h2>
            <p className="text-lg text-ink-2">Konto mit E-Mail und Passwort. Ohne Diagnosenachweis. Jederzeit vollständig löschbar.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href="/registrieren" size="lg" variant="accent" iconRight={<Icon name="arrow-right" className="nudge size-5" />} className="group">
              Registrieren
            </ButtonLink>
            <ButtonLink href="/anmelden" size="lg" variant="secondary">
              Anmelden
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
