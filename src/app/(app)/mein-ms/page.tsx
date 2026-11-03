import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EntryList } from "@/components/health/entry-list";
import { ActivatedNotice, HealthInactiveNotice, PrivacyHint, WriteDisabledNotice } from "@/components/health/health-notices";
import { MonthCalendar } from "@/components/health/month-calendar";
import { two } from "@/components/health/notebook";
import { Icon, type IconName } from "@/components/ui/icon";
import { IndexList, IndexRow, Notice, PageHeader, PageSkeleton, SectionHeader, SegmentNav } from "@/components/ui/primitives";
import { addDays, localDateString } from "@/lib/time";
import { requireHealthViewer } from "@/server/modules/health/guard";
import {
  getCalendarMonth,
  getTodayCheckIn,
  hasHealthData,
  healthWriteEnabled,
  listEntriesBetween,
} from "@/server/modules/health/queries";
import { resolveMonth } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Mein MS" };

/** S21 Mein MS Übersicht (DIA03–DIA06): Neueintrag, eigener Kalender, 7 oder 30 Tage. */
export default function MeinMsPage({ searchParams }: PageProps<"/mein-ms">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const ELSEWHERE: { href: string; label: string; icon: IconName }[] = [
  { href: "/community", label: "Community", icon: "users" },
  { href: "/wissen", label: "Wissen", icon: "book" },
  { href: "/hilfe", label: "Hilfe", icon: "lifebuoy" },
];

function StatusNotices({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const deleted = one(sp.geloescht);
  if (one(sp.aktiviert) === "1") return <ActivatedNotice />;
  if (one(sp.entscheidung) === "abgelehnt")
    return (
      <Notice tone="success" role="status" title="Deine Entscheidung ist gespeichert">
        Es werden keine Gesundheitsdaten erfasst.
      </Notice>
    );
  if (deleted === "eintrag" || deleted === "checkin")
    return (
      <Notice tone="success" role="status" title={deleted === "checkin" ? "Der Check-in wurde gelöscht" : "Der Eintrag wurde gelöscht"}>
        Er ist ab sofort nicht mehr abrufbar. Es gibt keinen Papierkorb.
      </Notice>
    );
  if (one(sp.gespeichert) === "checkin")
    return (
      <Notice tone="success" role="status" title="Check-in gespeichert">
        Danke, dass du dir die Zeit genommen hast.
      </Notice>
    );
  return null;
}

async function Overview({ searchParams }: { searchParams: PageProps<"/mein-ms">["searchParams"] }) {
  const viewer = await requireHealthViewer();
  const sp = await searchParams;
  const tz = viewer.prefs.timezone;
  const today = localDateString(new Date(), tz);
  const days = one(sp.tage) === "30" ? 30 : 7;
  const month = resolveMonth(one(sp.monat), today);
  const active = viewer.healthActive;
  const [writeOn, hasData] = await Promise.all([healthWriteEnabled(), active ? Promise.resolve(true) : hasHealthData(viewer)]);

  const header = (
    <PageHeader
      eyebrow="Privat"
      title={
        <>
          Mein <em>MS</em>
        </>
      }
      description="Deine eigene Dokumentation – freiwillig, nur für dich sichtbar."
      className="!mb-0"
    />
  );

  if (!active && !hasData) {
    return (
      <div className="flex flex-col gap-12">
        {header}
        <StatusNotices sp={sp} />
        <HealthInactiveNotice hasData={false} />
        <section aria-labelledby="weiter">
          <SectionHeader id="weiter" title="Weiter zu" />
          <ul className="grid border-t border-ink sm:grid-cols-3">
            {ELSEWHERE.map((q) => (
              <li key={q.href} className="border-b border-line sm:border-b-0 sm:border-r sm:last:border-r-0">
                <Link
                  href={q.href}
                  data-focus-inset
                  className="group flex min-h-20 items-center justify-between gap-4 px-1 py-4 transition-colors duration-150 hover:bg-raised sm:min-h-28 sm:flex-col sm:items-stretch sm:px-5"
                >
                  <Icon name={q.icon} className="size-5 text-accent-ink" />
                  <span className="flex items-center justify-between gap-3 font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-ink max-sm:flex-1">
                    {q.label}
                    <Icon name="arrow-right" className="nudge size-5 shrink-0 text-ink-3 group-hover:text-ink" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  const [entries, calendar, todayCheckIn] = await Promise.all([
    listEntriesBetween(viewer, addDays(today, -(days - 1)), today),
    getCalendarMonth(viewer, month),
    getTodayCheckIn(viewer),
  ]);
  const canWrite = active && writeOn;

  const actions: { href: string; title: string; text: string; icon: IconName }[] = [
    todayCheckIn.exists
      ? { href: todayCheckIn.href, title: "Check-in von heute ansehen", text: "Bereits festgehalten – du kannst ihn ändern", icon: "battery" }
      : { href: "/mein-ms/check-in", title: "Tages-Check-in", text: "Energie, Stimmung oder Fatigue – eine Angabe genügt", icon: "battery" },
    { href: "/mein-ms/eintrag/neu", title: "Symptom festhalten", text: "Mit Stärke, optional Dauer und Notiz", icon: "activity" },
    { href: "/mein-ms/fatigue/neu", title: "Fatigue notieren", text: "Getrennt von deiner Energie, optional Schlaf", icon: "notebook" },
  ];
  const listHref = (d: 7 | 30) => `/mein-ms?tage=${d}${month !== today.slice(0, 7) ? `&monat=${month}` : ""}`;

  // Abschnittsziffern laufen fortlaufend, auch wenn «Neu festhalten» fehlt.
  let n = 0;
  const next = () => two(n++);

  return (
    <div className="flex flex-col gap-12">
      {header}
      <StatusNotices sp={sp} />
      {!active && <HealthInactiveNotice hasData />}
      {active && !writeOn && <WriteDisabledNotice />}

      {/* Die eine tiefe Fläche der Seite: der freiwillige nächste Schritt */}
      {canWrite && (
        <section aria-labelledby="neu" className="rounded-[28px] bg-deep text-on-deep">
          <div className="flex flex-col gap-8 p-6 sm:p-10">
            <div className="flex flex-col gap-3">
              <span aria-hidden="true" className="font-mono text-[0.8125rem] font-medium tracking-[0.12em] text-deep-accent">
                {next()}
              </span>
              <h2 id="neu" className="display-md !text-on-deep">
                Neu festhalten
              </h2>
            </div>
            <ul className="grid border-t border-deep-line sm:grid-cols-3">
              {actions.map((a) => (
                <li
                  key={a.href}
                  className="border-b border-deep-line last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:first:*:pl-0 sm:last:*:pr-0"
                >
                  <Link
                    href={a.href}
                    data-focus-inset
                    className="group flex h-full flex-col gap-3 py-5 sm:px-6 sm:py-6"
                  >
                    <span className="flex items-center justify-between">
                      <Icon name={a.icon} className="size-5 text-deep-accent" />
                      <Icon name="arrow-right" className="nudge size-5 text-on-deep-2 group-hover:text-on-deep" />
                    </span>
                    <span className="font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-on-deep underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 group-hover:decoration-current">
                      {a.title}
                    </span>
                    <span className="text-sm text-on-deep-2">{a.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-deep-line px-6 py-4 sm:px-10">
            <PrivacyHint onDeep />
          </div>
        </section>
      )}

      {/* Notizbuch: Einträge links, Kalender und Verwaltung als Randspalte (ab xl) */}
      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-14">
        <section aria-labelledby="eintraege" className="flex min-w-0 flex-col gap-4">
          <SectionHeader
            id="eintraege"
            index={next()}
            title="Deine Einträge"
            description={`Letzte ${days} Tage, neueste zuerst.`}
            action={
              <Link href="/mein-ms/verlauf" className="group link-quiet hidden shrink-0 items-center gap-1.5 font-semibold text-ink sm:inline-flex">
                <Icon name="table" className="size-5" />
                Verlauf und Datentabelle
                <Icon name="arrow-right" className="nudge size-4" />
              </Link>
            }
          />
          {/* Segmentleiste sitzt direkt auf der Liste: eine Linie statt zwei */}
          <div>
            <SegmentNav
              label="Zeitraum der Liste"
              items={[
                { href: listHref(7), label: "7 Tage", active: days === 7 },
                { href: listHref(30), label: "30 Tage", active: days === 30 },
              ]}
            />
            {entries.length > 0 ? (
              <EntryList entries={entries} />
            ) : (
              <div className="flex flex-col gap-2 border-b border-line py-8">
                <p className="display-sm">{`In den letzten ${days} Tagen gibt es keine Einträge`}</p>
              <p className="max-w-xl text-base text-ink-2">
                {canWrite
                  ? "Wenn du magst, kannst du oben etwas festhalten. Es gibt keine Pflicht und keine Erinnerung."
                  : "Ältere Einträge findest du im Verlauf."}
                </p>
              </div>
            )}
          </div>
          <Link href="/mein-ms/verlauf" className="group link-quiet inline-flex w-fit items-center gap-1.5 py-2 font-semibold text-ink sm:hidden">
            <Icon name="table" className="size-5" />
            Verlauf und Datentabelle
            <Icon name="arrow-right" className="nudge size-4" />
          </Link>
        </section>

        <div className="flex min-w-0 flex-col gap-12 xl:pt-1">
          {/* Optionale Ansicht: in der einfachen Ansicht ausgeblendet; Liste und Verlauf bleiben (HOM06). */}
          <section aria-labelledby="kalender" id="kalender-bereich" className="flex flex-col" data-optional>
            <SectionHeader id="kalender" index={next()} title="Kalender" description="Tage, an denen du etwas festgehalten hast." />
            <MonthCalendar
              month={month}
              today={today}
              days={calendar}
              hrefForMonth={(m) => `/mein-ms?tage=${days}&monat=${m}#kalender-bereich`}
            />
          </section>

          <section aria-labelledby="verwalten" className="flex flex-col">
            <SectionHeader id="verwalten" index={next()} title="Verwalten" />
            <IndexList className="!border-ink">
              <IndexRow href="/mein-ms/symptome" title="Eigene Symptombezeichnungen" />
              <IndexRow href="/konto/daten" title="Daten exportieren oder löschen" />
              <IndexRow href="/konto/privatsphaere" title="Einwilligung zum Gesundheitsbereich" />
            </IndexList>
          </section>
        </div>
      </div>
    </div>
  );
}
