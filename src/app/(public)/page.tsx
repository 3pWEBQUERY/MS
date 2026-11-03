import type { Metadata } from "next";
import Link from "next/link";
import { MomentField } from "@/components/three";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name} – Leben mit MS in der Schweiz` },
  description: site.description,
};

const MOMENTS: { href: string; title: string; text: string; icon: IconName }[] = [
  {
    href: "/registrieren?ziel=festhalten",
    title: "Etwas festhalten",
    text: "Energie, Stimmung, Fatigue oder Symptome – freiwillig und nur für dich sichtbar.",
    icon: "notebook",
  },
  {
    href: "/registrieren?ziel=austausch",
    title: "Austausch finden",
    text: "Moderierte Gruppen und Gespräche, die erst nach gegenseitiger Zustimmung beginnen.",
    icon: "users",
  },
  {
    href: "/wissen",
    title: "Wissen oder Hilfe finden",
    text: "Fachlich geprüfte Artikel und Schweizer Hilfsangebote – auch ohne Konto.",
    icon: "book",
  },
];

const PRINCIPLES = [
  ["Keine Streaks", "Du musst nicht täglich kommen. Pausen sind normal und bleiben ohne Folgen."],
  ["Keine Pflichtangaben", "Kein Diagnosenachweis, keine Angaben zum Verlauf. Community funktioniert ohne Tagebuch."],
  ["Kein Datenverkauf", "Keine Werbung, keine Tracker von Dritten, keine Weitergabe. Nutzungsstatistik nur, wenn du sie selbst einschaltest."],
  ["Keine Interpretation", "Deine Einträge werden nicht bewertet, nicht verglichen und nicht ausgewertet."],
];

const VISIBILITY: { title: string; who: string; text: string; icon: IconName }[] = [
  {
    title: "Dein Tagebuch",
    who: "Nur du",
    text: "Check-ins, Symptome und Notizen sind privat. Keine Freigabe an Kontakte, Redaktion oder Fachpersonen.",
    icon: "lock",
  },
  {
    title: "Dein Profil",
    who: "Angemeldete Mitglieder",
    text: "Pseudonym, ausgewählte Interessen und – wenn du willst – dein Kanton. Nie deine E-Mail-Adresse.",
    icon: "user",
  },
  {
    title: "Deine Nachrichten",
    who: "Du und dein Kontakt",
    text: "Erst nach beidseitiger Freigabe. Jederzeit beendbar, blockierbar und meldbar.",
    icon: "chat",
  },
];

/** S01 Startseite: Nutzen, Grenzen, Wissen öffnen, registrieren – keine sensiblen Vorschauen. */
export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
          <div className="flex flex-col justify-center gap-10">
            <div className="flex flex-col gap-6">
              <p className="inline-flex w-fit items-center gap-2 rounded-[10px] bg-surface px-3 py-1.5 text-sm font-semibold text-ink-2 ring-1 ring-line">
                <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                Für Erwachsene mit MS in der Deutschschweiz
              </p>
              <h1 className="text-[2.75rem] font-[680] leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[4.5rem]">
                Was brauchst du gerade?
              </h1>
              <p className="max-w-xl text-xl leading-relaxed text-ink-2">
                Eine ruhige Plattform, die sich nach deiner Energie richtet – nicht umgekehrt. Festhalten, austauschen,
                informiert sein. Alles freiwillig.
              </p>
            </div>

            <nav aria-label="Mein Moment – Einstieg" className="flex flex-col gap-2">
              {MOMENTS.map((m) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group flex items-center gap-4 rounded-[20px] border border-line bg-surface p-3 pr-5 transition-colors hover:border-line-2 hover:bg-raised"
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-[12px] bg-sunk text-ink transition-colors group-hover:bg-ink group-hover:text-ink-inverse">
                    <Icon name={m.icon} className="size-6" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-lg font-semibold text-ink">{m.title}</span>
                    <span className="text-base text-ink-2">{m.text}</span>
                  </span>
                  <Icon name="arrow-right" className="size-5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/registrieren" size="lg">
                Kostenlos registrieren
              </ButtonLink>
              <ButtonLink href="/wissen" size="lg" variant="secondary">
                Wissen ohne Konto lesen
              </ButtonLink>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[28px] bg-sunk lg:min-h-[640px]">
            <div className="absolute inset-0">
              <MomentField className="size-full" />
            </div>
            <div className="absolute inset-x-2 bottom-2 flex flex-col gap-3 rounded-[20px] bg-surface p-5 sm:inset-x-3 sm:bottom-3 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">Mein Moment</p>
                <p className="text-lg font-semibold leading-snug text-ink">
                  Höchstens drei nächste Schritte.
                  <br className="hidden sm:block" /> Nie eine Bewertung.
                </p>
              </div>
              <div className="flex gap-1.5" aria-hidden="true">
                {["Festhalten", "Austausch", "Wissen"].map((l, i) => (
                  <span
                    key={l}
                    className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${i === 0 ? "bg-ink text-ink-inverse" : "bg-sunk text-ink-2"}`}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prinzipien */}
      <section aria-labelledby="prinzipien" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-12 flex max-w-3xl flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent-ink">Ruhig statt fordernd</p>
            <h2 id="prinzipien" className="text-3xl font-[650] tracking-[-0.025em] sm:text-4xl">
              Gebaut für Tage mit wenig Energie.
            </h2>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map(([title, text], i) => (
              <li key={title} className="flex flex-col gap-4 bg-surface p-6 sm:p-7">
                <span className="tabular font-mono text-sm font-medium text-ink-3">0{i + 1}</span>
                <h3 className="text-xl font-[650]">{title}</h3>
                <p className="text-base text-ink-2">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bereiche */}
      <section aria-labelledby="bereiche" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent-ink">Fünf Bereiche</p>
            <h2 id="bereiche" className="text-3xl font-[650] tracking-[-0.025em] sm:text-4xl">
              Alles an einem Ort. Nichts muss.
            </h2>
          </div>
          <p className="max-w-md text-lg text-ink-2">
            Jeder Bereich ist direkt erreichbar – mit oder ohne Tagebuch, mit oder ohne Austausch.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-6">
          <article className="flex flex-col justify-between gap-10 rounded-[28px] bg-ink p-7 text-ink-inverse md:col-span-3 md:row-span-2 sm:p-9">
            <div className="flex flex-col gap-4">
              <span className="flex size-12 items-center justify-center rounded-[12px] bg-ink-inverse/10">
                <Icon name="home" className="size-6" />
              </span>
              <h3 className="text-3xl font-[650] tracking-[-0.02em]">Heute</h3>
              <p className="max-w-md text-lg opacity-80">
                Dein ruhiger Startpunkt: «Mein Moment», Schnellzugriffe und – wenn du willst – deine letzten Einträge.
                Ohne Warnpunkte, ohne Aufgabenliste.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2">
              {[
                ["≤ 3", "nächste Schritte"],
                ["1", "Klick zur Sicherheitsseite"],
                ["0", "Pflichtfelder"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-[16px] bg-ink-inverse/10 p-4">
                  <dt className="sr-only">{l}</dt>
                  <dd className="flex flex-col gap-1">
                    <span className="tabular text-2xl font-bold">{v}</span>
                    <span className="text-sm opacity-75">{l}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </article>
          {[
            { title: "Mein MS", icon: "notebook" as IconName, text: "Kurzer Check-in ohne Pflichtfelder. Symptome, Fatigue und Notizen mit Verlauf als Datentabelle.", tone: "bg-accent-soft" },
            { title: "Community", icon: "users" as IconName, text: "Chronologischer Feed ohne Rankings. Betreute offene und geschlossene Gruppen.", tone: "bg-surface border border-line" },
            { title: "Wissen", icon: "book" as IconName, text: "Artikel mit Kurzfassung, Quellen, Autorenschaft und fachlicher Prüfung.", tone: "bg-verified-soft" },
            { title: "Hilfe", icon: "lifebuoy" as IconName, text: "Schweizer Angebote nach Thema und Kanton – ohne Standortfreigabe.", tone: "bg-sunk" },
          ].map((m) => (
            <article key={m.title} className={`flex flex-col gap-4 rounded-[28px] p-7 md:col-span-3 lg:col-span-3 ${m.tone}`}>
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-[11px] bg-surface text-ink ring-1 ring-line">
                  <Icon name={m.icon} className="size-5" />
                </span>
                <h3 className="text-xl font-[650]">{m.title}</h3>
              </div>
              <p className="text-base text-ink-2">{m.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Sichtbarkeit */}
      <section aria-labelledby="sichtbarkeit" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8 lg:py-24">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent-ink">Privatsphäre</p>
            <h2 id="sichtbarkeit" className="text-3xl font-[650] tracking-[-0.025em] sm:text-4xl">
              Du weisst immer, wer was sieht.
            </h2>
            <p className="text-lg text-ink-2">
              Gesundheitsdaten und Community sind technisch getrennt. Es gibt keine «Teilen»-Taste im Tagebuch und keine
              Vorschläge auf Basis deiner Einträge.
            </p>
            <Link href="/datenschutz" className="inline-flex items-center gap-1.5 font-semibold text-ink underline underline-offset-4">
              Datenschutzinformation lesen <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {VISIBILITY.map((v) => (
              <li key={v.title} className="grid gap-4 rounded-[20px] border border-line p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-sunk">
                  <Icon name={v.icon} className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">{v.title}</h3>
                  <p className="text-base text-ink-2">{v.text}</p>
                </div>
                <span className="w-fit rounded-[10px] bg-ink px-3 py-1.5 text-sm font-semibold text-ink-inverse">{v.who}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Grenzen */}
      <section aria-labelledby="grenzen" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-8 rounded-[28px] border border-line bg-surface p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:p-12">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-danger">Ehrliche Grenzen</p>
            <h2 id="grenzen" className="text-3xl font-[650] tracking-[-0.025em]">
              Was diese Plattform nicht ist.
            </h2>
            <p className="text-lg text-ink-2">
              Wir dokumentieren selbst berichtete Beobachtungen und erleichtern Austausch. Für medizinische Fragen sind
              deine behandelnden Fachpersonen da.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {[
              ["Kein Notfalldienst", "Die Moderation ist " + site.moderationHours + " erreichbar – nicht rund um die Uhr."],
              ["Keine Diagnose", "Keine Schuberkennung, keine Prognosen, keine Risikowerte."],
              ["Keine Therapieempfehlung", "Erfahrungen sind willkommen, individuelle Anweisungen nicht."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <Icon name="minus" className="mt-1 size-5 shrink-0 text-ink-3" />
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-ink-2">{d}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4 rounded-[20px] bg-danger-soft p-5 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
            <p className="text-lg font-semibold text-ink">
              Akute Gefahr? Sanitätsnotruf <span className="tabular">144</span>, allgemeiner Notruf <span className="tabular">112</span>.
            </p>
            <ButtonLink href="/sicherheit" variant="secondary" size="sm" icon={<Icon name="lifebuoy" className="size-4" />}>
              Alle Hilfewege
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Abschluss */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-8 rounded-[28px] bg-ink p-8 text-ink-inverse sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-3xl font-[650] tracking-[-0.025em] sm:text-4xl">Bereit, wenn du es bist.</h2>
            <p className="text-lg opacity-80">Konto mit E-Mail und Passwort. Ohne Diagnosenachweis. Jederzeit vollständig löschbar.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/registrieren" size="lg" variant="accent">
              Registrieren
            </ButtonLink>
            <ButtonLink href="/anmelden" size="lg" className="bg-ink-inverse/10 text-ink-inverse hover:bg-ink-inverse/20">
              Anmelden
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
