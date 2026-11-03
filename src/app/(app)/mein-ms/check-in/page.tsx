import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { CheckInForm } from "@/components/health/check-in-form";
import { ActivatedNotice } from "@/components/health/health-notices";
import { writeBlocker } from "@/components/health/write-gate";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { addDays, formatDate, localDateString } from "@/lib/time";
import { createCheckInAction } from "@/server/modules/health/checkin-actions";
import { requireHealthViewer, timezoneLabel } from "@/server/modules/health/guard";
import { getCheckInByDate } from "@/server/modules/health/queries";
import { checkInDateProblem, HEALTH_LIMITS } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Tages-Check-in" };

/** S20 Tages-Check-in (DIA01, DIA02, US03, US04). */
export default function CheckInPage({ searchParams }: PageProps<"/mein-ms/check-in">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <CheckIn searchParams={searchParams} />
    </Suspense>
  );
}

async function CheckIn({ searchParams }: { searchParams: PageProps<"/mein-ms/check-in">["searchParams"] }) {
  const viewer = await requireHealthViewer();
  const sp = await searchParams;
  const today = localDateString(new Date(), viewer.prefs.timezone);
  const minDate = addDays(today, -HEALTH_LIMITS.backfillDays);
  const raw = typeof sp.datum === "string" ? sp.datum : today;
  const date = checkInDateProblem(raw, today) ? today : raw;

  const header = (
    <PageHeader
      eyebrow="Mein MS"
      title="Tages-Check-in"
      description="Wie geht es dir? Halte fest, was du möchtest – oder überspring es einfach."
      back={{ href: "/mein-ms", label: "Mein MS" }}
    />
  );
  const activated = sp.aktiviert === "1" ? <ActivatedNotice /> : null;

  const blocked = await writeBlocker(viewer);
  if (blocked)
    return (
      <div className="flex max-w-2xl flex-col gap-8">
        {header}
        {blocked}
      </div>
    );

  // DIA02: Für ein Datum mit bestehendem Check-in wird die Bearbeitung angeboten – kein stilles Duplikat.
  const existing = await getCheckInByDate(viewer, date);
  if (existing)
    return (
      <div className="flex max-w-2xl flex-col gap-8">
        {header}
        {activated}
        <Notice
          tone="info"
          title={date === today ? "Für heute hast du bereits einen Check-in festgehalten" : `Für den ${formatDate(date)} gibt es bereits einen Check-in`}
          action={
            <ButtonLink href={`/mein-ms/check-in/${date}`} iconRight={<Icon name="arrow-right" className="size-5" />}>
              Check-in ansehen und ändern
            </ButtonLink>
          }
        >
          Pro Tag gibt es einen Check-in. Symptome oder Fatigue kannst du zusätzlich als eigenen Tagebucheintrag festhalten.
        </Notice>
        <Form action="/mein-ms/check-in" className="flex flex-col gap-3">
          <label htmlFor="datum" className="text-base font-semibold text-ink">
            Check-in für einen anderen Tag
          </label>
          <p id="datum-hinweis" className="-mt-2 text-sm text-ink-2">
            Bis 365 Tage rückwirkend.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="datum"
              name="datum"
              type="date"
              aria-describedby="datum-hinweis"
              min={minDate}
              max={today}
              defaultValue={date === today ? addDays(today, -1) : date}
              className="sm:max-w-xs"
            />
            <Button type="submit" variant="secondary">
              Tag wählen
            </Button>
          </div>
        </Form>
        <ButtonLink href="/heute" variant="ghost" className="w-fit">
          Zurück zu Heute
        </ButtonLink>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      {header}
      {activated && <div className="mb-6 max-w-2xl">{activated}</div>}
      <CheckInForm
        mode="create"
        action={createCheckInAction}
        initial={{ date, energy: null, mood: null, fatigue: null, note: null }}
        today={today}
        minDate={minDate}
        timezoneLabel={timezoneLabel(viewer)}
      />
    </div>
  );
}
