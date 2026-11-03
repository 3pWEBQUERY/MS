import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { FatigueEntryForm, SymptomEntryForm } from "@/components/health/diary-forms";
import { durationText, NOT_RECORDED, valueText } from "@/components/health/format";
import { PrivacyHint } from "@/components/health/health-notices";
import { writeBlocker } from "@/components/health/write-gate";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, KeyValue, Notice, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { addDays, formatDate, formatDateTime, localDateString } from "@/lib/time";
import { recordDenied } from "@/server/audit";
import { updateDiaryEntryAction } from "@/server/modules/health/diary-actions";
import { requireHealthViewer, timezoneLabel } from "@/server/modules/health/guard";
import { getDiaryEntry, listSymptomOptions } from "@/server/modules/health/queries";
import { formatOffset, HEALTH_LIMITS } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Eintrag" };

/** S23 Eintrag ansehen und ändern (DIA04, US07): nur Inhaber, Versionskonflikt erklärt. */
export default function EntryPage({ params, searchParams }: PageProps<"/mein-ms/eintrag/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Entry params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Entry({
  params,
  searchParams,
}: {
  params: PageProps<"/mein-ms/eintrag/[id]">["params"];
  searchParams: PageProps<"/mein-ms/eintrag/[id]">["searchParams"];
}) {
  const viewer = await requireHealthViewer();
  const { id } = await params;
  const sp = await searchParams;
  const entry = await getDiaryEntry(viewer, id);
  if (!entry) {
    // AT03: fremde oder unbekannte ID → neutral, ohne Inhalt; technisch ohne Werte erfasst.
    await recordDenied("health_foreign_access", viewer.accountId, "diary_entry");
    notFound();
  }

  const tz = viewer.prefs.timezone;
  const today = localDateString(new Date(), tz);
  const blocked = await writeBlocker(viewer);
  const editing = sp.bearbeiten === "1" && !blocked;
  const title = entry.kind === "fatigue" ? "Fatigue-Eintrag" : "Symptome";
  const saved = sp.gespeichert === "neu" ? "Eintrag gespeichert" : sp.gespeichert === "1" ? "Änderungen gespeichert" : null;

  const common = {
    mode: "edit" as const,
    action: updateDiaryEntryAction,
    entryId: entry.id,
    version: entry.version,
    date: entry.localDate,
    time: entry.localTime,
    minDate: addDays(today, -HEALTH_LIMITS.backfillDays),
    maxDate: today,
    timezoneLabel: timezoneLabel(viewer, entry.observedAt),
    note: entry.note,
  };

  let form = null;
  if (editing) {
    if (entry.kind === "fatigue") {
      form = <FatigueEntryForm {...common} fatigue={entry.fatigue} sleepNote={entry.sleepNote} />;
    } else {
      const options = await listSymptomOptions(viewer);
      const known = new Set([...options.catalog, ...options.own].map((o) => o.id));
      // Entfernte eigene Bezeichnungen bleiben in diesem Eintrag wählbar (DIA05).
      const extra = entry.observations
        .filter((o) => o.definitionId && !known.has(o.definitionId))
        .map((o) => ({ id: o.definitionId!, label: o.label }));
      form = (
        <SymptomEntryForm
          {...common}
          catalog={options.catalog}
          own={options.own}
          extra={extra}
          rows={entry.observations.map((o) => ({
            definitionId: o.definitionId,
            label: o.label,
            intensity: o.intensity,
            duration: o.durationMinutes,
          }))}
        />
      );
    }
  }

  const items: [ReactNode, ReactNode][] = [
    ["Zeitpunkt", formatDateTime(entry.observedAt, tz)],
  ];
  if (entry.kind === "symptom")
    items.push([
      entry.observations.length === 1 ? "Symptom" : "Symptome",
      <ul key="o" className="flex flex-col gap-1">
        {entry.observations.map((o) => (
          <li key={o.id}>
            <span className="font-semibold">{o.label}</span> · Stärke {valueText("intensity", o.intensity)}
            {o.durationMinutes ? ` · Dauer ${durationText(o.durationMinutes)}` : ""}
          </li>
        ))}
      </ul>,
    ]);
  if (entry.kind === "fatigue") {
    items.push(["Fatigue", valueText("fatigue", entry.fatigue)]);
    items.push([
      "Schlafbeobachtung",
      entry.sleepNote ? <PlainText key="s" text={entry.sleepNote} /> : <span className="text-ink-2">{NOT_RECORDED}</span>,
    ]);
  }
  items.push([
    entry.kind === "fatigue" ? "Beobachtungen und Notiz" : "Notiz",
    entry.note ? <PlainText key="n" text={entry.note} /> : <span className="text-ink-2">{NOT_RECORDED}</span>,
  ]);
  items.push([
    "Erfasst in Zeitzone",
    `${entry.timezone} (${formatOffset(entry.utcOffsetMinutes)}), lokal ${formatDate(entry.storedLocalDate)} ${entry.storedLocalTime}`,
  ]);
  items.push(["Zuletzt geändert", formatDateTime(entry.updatedAt, tz)]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Mein MS · Tagebuch"
        title={title}
        description={`${formatDate(entry.localDate, undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${entry.localTime}`}
        back={{ href: "/mein-ms", label: "Mein MS" }}
      />
      {saved && (
        <Notice tone="success" role="status" title={saved}>
          Nur du siehst diesen Eintrag.
        </Notice>
      )}
      {editing ? (
        form
      ) : (
        <>
          {blocked}
          <Card className="max-w-2xl">
            <KeyValue items={items} />
          </Card>
          <div className="flex flex-col gap-3 sm:flex-row">
            {!blocked && (
              <ButtonLink href={`/mein-ms/eintrag/${entry.id}?bearbeiten=1`} icon={<Icon name="pencil" className="size-5" />}>
                Ändern
              </ButtonLink>
            )}
            <ButtonLink href={`/mein-ms/eintrag/${entry.id}/loeschen`} variant="quiet-danger" icon={<Icon name="trash" className="size-5" />}>
              Löschen
            </ButtonLink>
          </div>
          <PrivacyHint />
        </>
      )}
    </div>
  );
}
