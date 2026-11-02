"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Checkbox, FormMessage, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { acceptRulesAction } from "@/server/modules/community/actions";

const KEY_RULES = [
  "Respektvoll bleiben: keine Belästigung, keine Abwertung, keine Diskriminierung.",
  "Privatsphäre schützen: keine Namen, Adressen oder Daten anderer Personen (kein Doxxing).",
  "Keine Werbung ohne Freigabe, kein Betrug, keine Spendenaufrufe.",
  "Erfahrungen teilen ist willkommen – aber keine individuellen Therapieanweisungen oder Behandlungspläne für andere.",
  "Keine identifizierenden Gesundheitsunterlagen wie Befunde oder Arztberichte einstellen.",
];

/**
 * SAF07: Vor dem ersten Community-Schreiben werden die versionierten Regeln aktiv bestätigt.
 * Bei einer neuen Fassung wird die Änderung sichtbar angekündigt.
 */
export function RulesGate({ version, updated }: { version: string; updated: boolean }) {
  const [state, action] = useActionState(acceptRulesAction, idle);
  return (
    <section aria-labelledby="rules-gate-title" className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <h2 id="rules-gate-title" className="text-xl font-[650] text-ink">
          {updated ? "Die Community-Regeln wurden aktualisiert" : "Bevor du schreibst: unsere Regeln"}
        </h2>
        <p className="text-base text-ink-2">
          {updated
            ? "Bitte lies die neue Fassung und bestätige sie, bevor du weiter schreibst. Lesen bleibt jederzeit möglich."
            : "Damit sich alle sicher fühlen, bestätigst du einmal die Regeln. Lesen ist auch ohne Bestätigung möglich."}
        </p>
      </div>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-base text-ink">
        {KEY_RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="text-sm text-ink-2">
        Fassung {version} ·{" "}
        <Link href="/regeln" className="font-medium text-ink underline underline-offset-4">
          Alle Regeln lesen
        </Link>
      </p>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Checkbox name="accept" label="Ich habe die Regeln gelesen und halte mich daran." error={state.fieldErrors?.accept} />
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingText="Wird bestätigt …">Regeln bestätigen</SubmitButton>
        </div>
      </form>
    </section>
  );
}
