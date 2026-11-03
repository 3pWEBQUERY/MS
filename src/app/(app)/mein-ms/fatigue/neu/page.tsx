import type { Metadata } from "next";
import { Suspense } from "react";
import { FatigueEntryForm } from "@/components/health/diary-forms";
import { ActivatedNotice } from "@/components/health/health-notices";
import { writeBlocker } from "@/components/health/write-gate";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { addDays, localDateString, localTimeString } from "@/lib/time";
import { createFatigueEntryAction } from "@/server/modules/health/diary-actions";
import { requireHealthViewer, timezoneLabel } from "@/server/modules/health/guard";
import { HEALTH_LIMITS } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Fatigue notieren" };

/** S24 Fatigue-Eintrag (DIA03, US06): subjektive Skala, optional Schlaf und Beobachtungen. */
export default function NewFatiguePage({ searchParams }: PageProps<"/mein-ms/fatigue/neu">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <NewFatigue searchParams={searchParams} />
    </Suspense>
  );
}

async function NewFatigue({ searchParams }: { searchParams: PageProps<"/mein-ms/fatigue/neu">["searchParams"] }) {
  const viewer = await requireHealthViewer();
  const activated = (await searchParams).aktiviert === "1";
  const header = (
    <PageHeader
      eyebrow="Mein MS"
      title="Fatigue notieren"
      description="Fatigue wird getrennt von deiner Energie erfasst. Schlaf und Beobachtungen sind optional."
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
  return (
    <div className="flex flex-col gap-2">
      {header}
      {activated && (
        <div className="mb-6 max-w-2xl">
          <ActivatedNotice />
        </div>
      )}
      <FatigueEntryForm
        mode="create"
        action={createFatigueEntryAction}
        date={today}
        time={localTimeString(now, tz)}
        minDate={addDays(today, -HEALTH_LIMITS.backfillDays)}
        maxDate={today}
        timezoneLabel={timezoneLabel(viewer)}
        note={null}
        fatigue={null}
        sleepNote={null}
      />
    </div>
  );
}
