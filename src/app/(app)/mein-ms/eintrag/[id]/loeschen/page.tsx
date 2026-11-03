import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmDeleteForm } from "@/components/health/action-forms";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import { recordDenied } from "@/server/audit";
import { deleteDiaryEntryAction } from "@/server/modules/health/diary-actions";
import { requireHealthViewer } from "@/server/modules/health/guard";
import { getDiaryEntry } from "@/server/modules/health/queries";

export const metadata: Metadata = { title: "Eintrag löschen" };

/** S26 Eintrag löschen (DIA05): Umfang, Bestätigung, sichtbares Ergebnis, keine verdeckte Wiederherstellung. */
export default function DeleteEntryPage({ params }: PageProps<"/mein-ms/eintrag/[id]/loeschen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <DeleteEntry params={params} />
    </Suspense>
  );
}

async function DeleteEntry({ params }: { params: PageProps<"/mein-ms/eintrag/[id]/loeschen">["params"] }) {
  const viewer = await requireHealthViewer();
  const { id } = await params;
  const entry = await getDiaryEntry(viewer, id);
  if (!entry) {
    await recordDenied("health_foreign_access", viewer.accountId, "diary_entry");
    notFound();
  }
  const when = formatDateTime(entry.observedAt, viewer.prefs.timezone);
  const parts: string[] = [];
  if (entry.kind === "symptom")
    parts.push(entry.observations.length === 1 ? "1 Symptom mit Stärke" : `${entry.observations.length} Symptome mit Stärke`);
  if (entry.kind === "fatigue") parts.push("der Fatigue-Wert");
  if (entry.sleepNote) parts.push("die Schlafbeobachtung");
  if (entry.note) parts.push("die Notiz");

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        eyebrow="Mein MS"
        title="Eintrag löschen?"
        back={{ href: `/mein-ms/eintrag/${entry.id}`, label: "Zurück zum Eintrag" }}
      />
      {/* Umfang als Notizbuchliste mit Haarlinien statt Karte (S26) */}
      <section aria-labelledby="umfang" className="flex flex-col gap-4">
        <h2 id="umfang" className="display-sm">
          Was gelöscht wird
        </h2>
        <ul className="border-t border-ink text-base text-ink-2 [&>li]:border-b [&>li]:border-line [&>li]:py-3.5 [&>li:first-child]:text-ink">
          <li>
            Dein Tagebucheintrag vom {when}: {parts.join(", ")}.
          </li>
          <li>Er ist danach sofort nicht mehr abrufbar. Es gibt keinen Papierkorb.</li>
          <li>Andere Einträge, dein Check-in dieses Tages und deine Symptombezeichnungen bleiben erhalten.</li>
        </ul>
      </section>
      <ConfirmDeleteForm
        action={deleteDiaryEntryAction}
        hidden={{ id: entry.id }}
        label="Eintrag endgültig löschen"
        cancelHref={`/mein-ms/eintrag/${entry.id}`}
      />
    </div>
  );
}
