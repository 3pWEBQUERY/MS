import { env } from "@/server/env";

/** Kennzeichnung von Test-/Pilotumgebungen: Beispielinhalte sind nicht fachlich freigegeben (PRD 16, 18). */
export function DemoBanner() {
  if (!env.demoMode()) return null;
  return (
    <div className="border-b border-warning/25 bg-warning-soft px-4 py-2 text-center text-sm font-medium text-ink">
      Testumgebung · Inhalte sind Beispiele und noch nicht fachlich freigegeben. Bitte keine echten Gesundheitsdaten eingeben.
    </div>
  );
}
