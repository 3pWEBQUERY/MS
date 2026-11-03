import type { Metadata } from "next";
import { Suspense } from "react";
import { RemoveSymptomForm } from "@/components/health/action-forms";
import { EmptyState, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { removeOwnSymptomAction } from "@/server/modules/health/symptom-actions";
import { requireHealthViewer } from "@/server/modules/health/guard";
import { listOwnSymptoms } from "@/server/modules/health/queries";

export const metadata: Metadata = { title: "Eigene Symptombezeichnungen" };

/** Katalogpflege (DIA05): eigene Bezeichnungen entfernen, frühere Einträge bleiben unverändert. */
export default function OwnSymptomsPage({ searchParams }: PageProps<"/mein-ms/symptome">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <OwnSymptoms searchParams={searchParams} />
    </Suspense>
  );
}

async function OwnSymptoms({ searchParams }: { searchParams: PageProps<"/mein-ms/symptome">["searchParams"] }) {
  const viewer = await requireHealthViewer();
  const sp = await searchParams;
  const list = await listOwnSymptoms(viewer);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        eyebrow="Mein MS"
        title="Eigene Symptombezeichnungen"
        description="Bezeichnungen, die du selbst eingegeben hast. Nur du siehst sie."
        back={{ href: "/mein-ms", label: "Mein MS" }}
      />
      {sp.entfernt === "1" && (
        <Notice tone="success" role="status" title="Aus der Auswahl entfernt">
          Frühere Einträge behalten ihre Bezeichnung unverändert.
        </Notice>
      )}
      {list.length === 0 ? (
        <EmptyState icon="notebook" title="Keine eigenen Bezeichnungen">
          Beim Festhalten eines Symptoms kannst du «Eigene Bezeichnung eingeben» wählen. Sie erscheint dann hier.
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-[20px] border border-line bg-surface">
          {list.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="break-words font-semibold text-ink">{s.label}</span>
                <span className="text-sm text-ink-2">
                  {s.uses === 0 ? "In keinem Eintrag verwendet" : s.uses === 1 ? "In 1 Eintrag verwendet" : `In ${s.uses} Einträgen verwendet`}
                </span>
              </div>
              <RemoveSymptomForm action={removeOwnSymptomAction} id={s.id} label={s.label} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink-2">
        Entfernen nimmt die Bezeichnung nur aus deiner Auswahlliste. Bestehende Einträge werden nicht verändert. Einzelne
        Einträge löschst du direkt im jeweiligen Eintrag.
      </p>
    </div>
  );
}
