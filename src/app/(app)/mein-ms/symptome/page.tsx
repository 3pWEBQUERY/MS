import type { Metadata } from "next";
import { Suspense } from "react";
import { RemoveSymptomForm } from "@/components/health/action-forms";
import { two } from "@/components/health/notebook";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
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
        <div className="flex flex-col gap-2 border-y border-line py-8">
          <p className="display-sm">Keine eigenen Bezeichnungen</p>
          <p className="text-base text-ink-2">
            Beim Festhalten eines Symptoms kannst du «Eigene Bezeichnung eingeben» wählen. Sie erscheint dann hier.
          </p>
        </div>
      ) : (
        // Eigene Wörter wie in einem Register: nummeriert, Haarlinien, keine Kartenwand
        <ol className="border-t border-ink">
          {list.map((s, i) => (
            <li
              key={s.id}
              className="grid gap-x-6 gap-y-3 border-b border-line py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <span aria-hidden="true" className="hidden font-mono text-sm font-medium tracking-[0.08em] text-ink-3 sm:block">
                {two(i)}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="break-words font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-ink">{s.label}</span>
                <span className="text-sm text-ink-2">
                  {s.uses === 0 ? "In keinem Eintrag verwendet" : s.uses === 1 ? "In 1 Eintrag verwendet" : `In ${s.uses} Einträgen verwendet`}
                </span>
              </div>
              <RemoveSymptomForm action={removeOwnSymptomAction} id={s.id} label={s.label} />
            </li>
          ))}
        </ol>
      )}
      <p className="text-sm text-ink-2">
        Entfernen nimmt die Bezeichnung nur aus deiner Auswahlliste. Bestehende Einträge werden nicht verändert. Einzelne
        Einträge löschst du direkt im jeweiligen Eintrag.
      </p>
    </div>
  );
}
