"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { idle, type ActionState } from "@/lib/action-state";
import { setAnalyticsConsentAction, setHealthConsentAction } from "@/server/modules/account/privacy-actions";
import { useHealthAction } from "@/components/health/use-health-action";

const WITHDRAW_EFFECTS = [
  "Neue Check-ins und Tagebucheinträge sind ab sofort gesperrt.",
  "Deine bestehenden Daten bleiben für dich lesbar und exportierbar.",
  "Löschen kannst du sie jederzeit separat unter «Daten und Konto».",
  "Besteht keine andere zulässige Grundlage, werden sie spätestens 30 Tage nach dem Widerruf gelöscht. Aktivierst du den Bereich vorher wieder, bleiben sie erhalten.",
  "Community, Gespräche, Wissen und Hilfe bleiben unverändert nutzbar – ohne Nachteile.",
];

const GRANT_EFFECTS = [
  "Check-ins, Symptome und Notizen sind nur für dich sichtbar – keine Freigabe an Kontakte, Redaktion, Moderation oder Fachpersonen.",
  "Alle Angaben sind freiwillig. Deine Einträge werden nicht bewertet oder ausgewertet.",
  "Du kannst jederzeit widerrufen, exportieren und löschen.",
];

/** PRI01/PRI02: Folgen werden vor der Bestätigung erklärt; nichts ist vorausgewählt. */
export function HealthConsentForm({ active }: { active: boolean }) {
  const [state, action] = useHealthAction(setHealthConsentAction);
  // Zustand beim Öffnen merken: nach bestätigtem Erfolg schliesst sich die Bestätigung
  const [openedWith, setOpenedWith] = useState<ActionState | null>(null);
  const open = openedWith !== null && (state === openedWith || state.status === "error");
  const effects = active ? WITHDRAW_EFFECTS : GRANT_EFFECTS;

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-3">
        {state.status === "success" && <FormMessage state={state} className="w-full" />}
        <Button
          variant={active ? "quiet-danger" : "primary"}
          aria-expanded={false}
          onClick={() => setOpenedWith(state)}
        >
          {active ? "Gesundheitsbereich widerrufen" : "Gesundheitsbereich aktivieren"}
        </Button>
      </div>
    );
  }

  return (
    <form
      id="health-consent-confirm"
      action={action}
      noValidate
      className="flex flex-col gap-4 rounded-[16px] border border-line-2 bg-sunk p-4 sm:p-5"
    >
      <input type="hidden" name="decision" value={active ? "withdrawn" : "granted"} />
      <p className="font-semibold text-ink">{active ? "Was der Widerruf bewirkt" : "Was die Aktivierung bedeutet"}</p>
      <ul className="flex flex-col gap-2">
        {effects.map((e) => (
          <li key={e} className="flex gap-3 text-base text-ink-2">
            <Icon name="info" className="mt-1 size-4 shrink-0 text-ink-2" />
            {e}
          </li>
        ))}
      </ul>
      <FormMessage state={state.status === "error" ? state : idle} />
      <Checkbox
        name="understood"
        label={active ? "Ich habe die Folgen gelesen und möchte widerrufen." : "Ich habe das gelesen und möchte den Gesundheitsbereich aktivieren."}
        error={state.fieldErrors?.understood}
      />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant={active ? "danger" : "primary"} pendingText="Wird gespeichert …">
          {active ? "Widerruf bestätigen" : "Aktivieren"}
        </SubmitButton>
        <Button variant="ghost" onClick={() => setOpenedWith(null)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

export function AnalyticsConsentForm({ active }: { active: boolean }) {
  const [state, action] = useHealthAction(setAnalyticsConsentAction);
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <input type="hidden" name="decision" value={active ? "withdrawn" : "granted"} />
      <SubmitButton variant="secondary" pendingText="Wird gespeichert …">
        {active ? "Nutzungsstatistik ausschalten" : "Nutzungsstatistik einschalten"}
      </SubmitButton>
      <FormMessage state={state} className="w-full" />
    </form>
  );
}
