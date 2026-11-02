import type { Metadata } from "next";
import { Suspense } from "react";
import { SymptomEntryForm } from "@/components/health/diary-forms";
import { writeBlocker } from "@/components/health/write-gate";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { addDays, localDateString, localTimeString } from "@/lib/time";
import { createSymptomEntryAction } from "@/server/modules/health/actions";
import { requireHealthViewer, timezoneLabel } from "@/server/modules/health/guard";
import { listSymptomOptions } from "@/server/modules/health/queries";
import { HEALTH_LIMITS } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Symptom festhalten" };

/** S22 Neuer Tagebucheintrag (DIA03, US05): beginnt mit dem Minimum, Ergänzungen auf Wunsch. */
export default function NewEntryPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <NewEntry />
    </Suspense>
  );
}

async function NewEntry() {
  const viewer = await requireHealthViewer();
  const header = (
    <PageHeader
      eyebrow="Mein MS"
      title="Symptom festhalten"
      description="Ein Symptom mit Stärke genügt. Dauer und Notiz kannst du ergänzen, wenn du möchtest."
      back={{ href: "/mein-ms", label: "Mein MS" }}
    />
  );
  const blocked = await writeBlocker(viewer);
  if (blocked)
    return (
      <div className="flex max-w-2xl flex-col gap-8">
        {header}
        {blocked}
      </div>
    );

  const tz = viewer.prefs.timezone;
  const now = new Date();
  const today = localDateString(now, tz);
  const options = await listSymptomOptions(viewer);
  return (
    <div className="flex flex-col gap-2">
      {header}
      <SymptomEntryForm
        mode="create"
        action={createSymptomEntryAction}
        catalog={options.catalog}
        own={options.own}
        date={today}
        time={localTimeString(now, tz)}
        minDate={addDays(today, -HEALTH_LIMITS.backfillDays)}
        maxDate={today}
        timezoneLabel={timezoneLabel(viewer)}
        note={null}
      />
    </div>
  );
}
