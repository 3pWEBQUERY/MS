import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmDeleteForm } from "@/components/health/action-forms";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { deleteCheckInAction } from "@/server/modules/health/checkin-actions";
import { requireHealthViewer } from "@/server/modules/health/guard";
import { getCheckInByDate } from "@/server/modules/health/queries";

export const metadata: Metadata = { title: "Check-in löschen" };

/** S26 für Check-ins (DIA05): Umfang, Bestätigung, sichtbares Ergebnis, kein Papierkorb. */
export default function DeleteCheckInPage({ params }: PageProps<"/mein-ms/check-in/[datum]/loeschen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <DeleteCheckIn params={params} />
    </Suspense>
  );
}

async function DeleteCheckIn({ params }: { params: PageProps<"/mein-ms/check-in/[datum]/loeschen">["params"] }) {
  const viewer = await requireHealthViewer();
  const { datum } = await params;
  const checkIn = await getCheckInByDate(viewer, datum);
  if (!checkIn) notFound();
  const label = formatDate(checkIn.localDate);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        eyebrow="Mein MS"
        title="Check-in löschen?"
        back={{ href: `/mein-ms/check-in/${checkIn.localDate}`, label: "Zurück zum Check-in" }}
      />
      {/* Umfang als Notizbuchliste mit Haarlinien statt Karte (S26) */}
      <section aria-labelledby="umfang" className="flex flex-col gap-4">
        <h2 id="umfang" className="display-sm">
          Was gelöscht wird
        </h2>
        <ul className="border-t border-ink text-base text-ink-2 [&>li]:border-b [&>li]:border-line [&>li]:py-3.5 [&>li:first-child]:text-ink">
          <li>Dein Check-in vom {label} mit allen Angaben{checkIn.note ? " und der Notiz" : ""}.</li>
          <li>Er ist danach sofort nicht mehr abrufbar. Es gibt keinen Papierkorb.</li>
          <li>Deine Tagebucheinträge von diesem Tag bleiben erhalten.</li>
        </ul>
      </section>
      <ConfirmDeleteForm
        action={deleteCheckInAction}
        hidden={{ date: checkIn.localDate }}
        label="Check-in endgültig löschen"
        cancelHref={`/mein-ms/check-in/${checkIn.localDate}`}
      />
    </div>
  );
}
