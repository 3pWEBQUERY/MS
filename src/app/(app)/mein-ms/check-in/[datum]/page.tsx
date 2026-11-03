import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckInForm } from "@/components/health/check-in-form";
import { NOT_RECORDED, valueText } from "@/components/health/format";
import { PrivacyHint } from "@/components/health/health-notices";
import { writeBlocker } from "@/components/health/write-gate";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, KeyValue, Notice, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { addDays, formatDate, formatDateTime, localDateString } from "@/lib/time";
import { updateCheckInAction } from "@/server/modules/health/checkin-actions";
import { requireHealthViewer, timezoneLabel } from "@/server/modules/health/guard";
import { getCheckInByDate } from "@/server/modules/health/queries";
import { formatOffset, HEALTH_LIMITS } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Check-in" };

/** Check-in eines Datums ansehen und ändern (S20/S23, DIA02, DIA04). */
export default function CheckInDetailPage({ params, searchParams }: PageProps<"/mein-ms/check-in/[datum]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Detail({
  params,
  searchParams,
}: {
  params: PageProps<"/mein-ms/check-in/[datum]">["params"];
  searchParams: PageProps<"/mein-ms/check-in/[datum]">["searchParams"];
}) {
  const viewer = await requireHealthViewer();
  const { datum } = await params;
  const sp = await searchParams;
  // Nur eigene Check-ins: Abfrage ist an das Konto gebunden, das Datum ist kein fremder Schlüssel.
  const checkIn = await getCheckInByDate(viewer, datum);
  if (!checkIn) notFound();

  const tz = viewer.prefs.timezone;
  const today = localDateString(new Date(), tz);
  const blocked = await writeBlocker(viewer);
  const editing = sp.bearbeiten === "1" && !blocked;
  const title = checkIn.localDate === today ? "Check-in von heute" : `Check-in vom ${formatDate(checkIn.localDate)}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Mein MS" title={title} back={{ href: "/mein-ms", label: "Mein MS" }} />
      {sp.gespeichert === "1" && (
        <Notice tone="success" role="status" title="Gespeichert">
          Dein Check-in ist gespeichert.
        </Notice>
      )}

      {editing ? (
        <CheckInForm
          mode="edit"
          action={updateCheckInAction}
          initial={{
            date: checkIn.localDate,
            energy: checkIn.energy,
            mood: checkIn.mood,
            fatigue: checkIn.fatigue,
            note: checkIn.note,
            version: checkIn.version,
          }}
          today={today}
          minDate={addDays(today, -HEALTH_LIMITS.backfillDays)}
          timezoneLabel={timezoneLabel(viewer)}
        />
      ) : (
        <>
          {blocked}
          <Card className="max-w-2xl">
            <KeyValue
              items={[
                ["Datum", formatDate(checkIn.localDate, undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })],
                ["Energie", valueText("energy", checkIn.energy)],
                ["Stimmung", valueText("mood", checkIn.mood)],
                ["Fatigue", valueText("fatigue", checkIn.fatigue)],
                ["Notiz", checkIn.note ? <PlainText key="n" text={checkIn.note} /> : <span className="text-ink-2">{NOT_RECORDED}</span>],
                ["Zeitzone", `${checkIn.timezone} (${formatOffset(checkIn.utcOffsetMinutes)})`],
                ["Zuletzt geändert", formatDateTime(checkIn.updatedAt, tz)],
              ]}
            />
          </Card>
          <div className="flex flex-col gap-3 sm:flex-row">
            {!blocked && (
              <ButtonLink href={`/mein-ms/check-in/${checkIn.localDate}?bearbeiten=1`} icon={<Icon name="pencil" className="size-5" />}>
                Ändern
              </ButtonLink>
            )}
            <ButtonLink
              href={`/mein-ms/check-in/${checkIn.localDate}/loeschen`}
              variant="quiet-danger"
              icon={<Icon name="trash" className="size-5" />}
            >
              Löschen
            </ButtonLink>
          </div>
          <PrivacyHint />
        </>
      )}
    </div>
  );
}
