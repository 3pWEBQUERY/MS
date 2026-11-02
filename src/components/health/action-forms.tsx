"use client";

import { useActionState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { idle, type ActionState } from "@/lib/action-state";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * S08: zwei gleichwertige Aktionen (PRI01, US10). Gleiche Gestaltung, keine Vorauswahl,
 * kein Druck. Getrennte Formulare, damit jeweils nur der gedrückte Button «lädt».
 */
export function HealthDecisionForms({ action, alreadyDeclined }: { action: Action; alreadyDeclined: boolean }) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <div className="flex flex-col gap-4">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <form action={formAction}>
          <input type="hidden" name="decision" value="granted" />
          <SubmitButton variant="secondary" size="lg" className="w-full" pendingText="Wird aktiviert …">
            Aktivieren
          </SubmitButton>
        </form>
        {alreadyDeclined ? (
          <ButtonLink href="/heute" variant="secondary" size="lg" className="w-full">
            Weiter ohne Gesundheitsbereich
          </ButtonLink>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="decision" value="denied" />
            <SubmitButton variant="secondary" size="lg" className="w-full" pendingText="Wird gespeichert …">
              Nicht jetzt – ablehnen
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

/** S26 Bestätigung zum endgültigen Löschen (DIA05). */
export function ConfirmDeleteForm({
  action,
  hidden,
  label,
  cancelHref,
}: {
  action: Action;
  hidden: Record<string, string>;
  label: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <FormMessage state={state} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton variant="danger" size="lg" pendingText="Wird gelöscht …" icon={<Icon name="trash" className="size-5" />}>
          {label}
        </SubmitButton>
        <ButtonLink href={cancelHref} variant="ghost" size="lg">
          Abbrechen
        </ButtonLink>
      </div>
    </form>
  );
}

/** Eigene Symptombezeichnung aus der Auswahl entfernen (DIA05). */
export function RemoveSymptomForm({ action, id, label }: { action: Action; id: string; label: string }) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2 sm:items-end">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="quiet-danger" size="sm" pendingText="Wird entfernt …" aria-label={`«${label}» aus der Auswahl entfernen`}>
        Aus Auswahl entfernen
      </SubmitButton>
      {state.status === "error" && <FormMessage state={state} />}
    </form>
  );
}
