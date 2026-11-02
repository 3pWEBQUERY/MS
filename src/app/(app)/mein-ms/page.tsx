import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EntryList } from "@/components/health/entry-list";
import { HealthInactiveNotice, PrivacyHint, WriteDisabledNotice } from "@/components/health/health-notices";
import { MonthCalendar } from "@/components/health/month-calendar";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { CardLink, EmptyState, Notice, PageHeader, PageSkeleton, SectionHeader, SegmentNav } from "@/components/ui/primitives";
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

function StatusNotices({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const deleted = one(sp.geloescht);
  if (one(sp.aktiviert) === "1")
    return (
      <Notice tone="success" role="status" title="Der Gesundheitsbereich ist aktiviert">
        Nur du siehst deine Einträge. Du kannst die Einwilligung jederzeit unter{" "}
        <Link href="/konto/privatsphaere">Privatsphäre</Link> widerrufen.
      </Notice>
    );
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
      title="Mein MS"
      description="Deine eigene Dokumentation – freiwillig, nur für dich sichtbar."
    />
  );

  if (!active && !hasData) {
    return (
      <div className="flex flex-col gap-10">
        {header}
        <StatusNotices sp={sp} />
        <HealthInactiveNotice hasData={false} />
        <section aria-labelledby="weiter" className="flex flex-col gap-4">
          <SectionHeader id="weiter" title="Weiter zu" />
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/community" variant="secondary" icon={<Icon name="users" className="size-5" />}>
              Community
            </ButtonLink>
            <ButtonLink href="/wissen" variant="secondary" icon={<Icon name="book" className="size-5" />}>
              Wissen
            </ButtonLink>
            <ButtonLink href="/hilfe" variant="secondary" icon={<Icon name="lifebuoy" className="size-5" />}>
              Hilfe
            </ButtonLink>
          </div>
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

  return (
    <div className="flex flex-col gap-10">
      {header}
      <StatusNotices sp={sp} />
      {!active && <HealthInactiveNotice hasData />}
      {active && !writeOn && <WriteDisabledNotice />}

      {canWrite && (
        <section aria-labelledby="neu" className="flex flex-col gap-4">
          <SectionHeader id="neu" title="Neu festhalten" />
          <ul className="grid gap-3 sm:grid-cols-3">
            {actions.map((a) => (
              <li key={a.href}>
                <CardLink href={a.href} className="flex h-full flex-col gap-3">
                  <Icon name={a.icon} className="size-6 text-ink" />
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold text-ink">{a.title}</span>
                    <span className="text-sm text-ink-2">{a.text}</span>
                  </span>
                </CardLink>
              </li>
            ))}
          </ul>
          <PrivacyHint />
        </section>
      )}

      <section aria-labelledby="eintraege" className="flex flex-col gap-4">
        <SectionHeader
          id="eintraege"
          title="Deine Einträge"
          description={`Letzte ${days} Tage, neueste zuerst.`}
          action={
            <Link href="/mein-ms/verlauf" className="hidden shrink-0 items-center gap-1.5 font-semibold text-ink underline underline-offset-4 sm:inline-flex">
              <Icon name="table" className="size-5" />
              Verlauf und Datentabelle
            </Link>
          }
        />
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
          <EmptyState icon="notebook" title={`In den letzten ${days} Tagen gibt es keine Einträge`}>
            {canWrite
              ? "Wenn du magst, kannst du oben etwas festhalten. Es gibt keine Pflicht und keine Erinnerung."
              : "Ältere Einträge findest du im Verlauf."}
          </EmptyState>
        )}
        <Link href="/mein-ms/verlauf" className="inline-flex w-fit items-center gap-1.5 font-semibold text-ink underline underline-offset-4 sm:hidden">
          <Icon name="table" className="size-5" />
          Verlauf und Datentabelle
        </Link>
      </section>

      <section aria-labelledby="kalender" id="kalender-bereich" className="flex flex-col gap-4">
        <SectionHeader id="kalender" title="Kalender" description="Tage, an denen du etwas festgehalten hast." />
        <MonthCalendar
          month={month}
          today={today}
          days={calendar}
          hrefForMonth={(m) => `/mein-ms?tage=${days}&monat=${m}#kalender-bereich`}
        />
      </section>

      <section aria-labelledby="verwalten" className="flex flex-col gap-3">
        <SectionHeader id="verwalten" title="Verwalten" />
        <ul className="flex flex-col gap-2 text-base">
          <li>
            <Link href="/mein-ms/symptome" className="font-medium text-ink underline underline-offset-4">
              Eigene Symptombezeichnungen
            </Link>
          </li>
          <li>
            <Link href="/konto/daten" className="font-medium text-ink underline underline-offset-4">
              Daten exportieren oder löschen
            </Link>
          </li>
          <li>
            <Link href="/konto/privatsphaere" className="font-medium text-ink underline underline-offset-4">
              Einwilligung zum Gesundheitsbereich
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
