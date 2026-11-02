"use client";

import { useActionState } from "react";
import { CountedTextarea, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { recordIncidentStepAction, setFlagAction } from "@/server/modules/admin/flags-actions";
import { useSuccessKey } from "./action-button";
import { INCIDENT_STEPS } from "./labels";

/** Feature-Schalter einzeln mit Begründung schalten (HOM08, US26). */
export function FlagForm({ flagKey, enabled, version, label }: { flagKey: string; enabled: boolean; version: number; label: string }) {
  const [state, action] = useActionState(setFlagAction, idle);
  const resetKey = useSuccessKey(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="key" value={flagKey} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="enabled" value={enabled ? "off" : "on"} />
      <CountedTextarea
        key={resetKey}
        label={enabled ? `Begründung für das Abschalten von «${label}»` : `Begründung für das Wiederaktivieren von «${label}»`}
        name="reason"
        maxLength={300}
        rows={2}
        required
        error={state.fieldErrors?.reason}
        defaultValue={state.status === "error" ? ((state.values?.reason as string) ?? "") : ""}
        hint="Technischer Anlass, z. B. Störung oder Ticket. Keine Personendaten."
      />
      <FormMessage state={state} />
      <SubmitButton variant={enabled ? "danger" : "primary"} size="sm" pendingText="Wird geschaltet …" className="self-start">
        {enabled ? "Bereich abschalten" : "Bereich wieder aktivieren"}
      </SubmitButton>
    </form>
  );
}

/** Vorfallschritt I01–I04 mit Ticket protokollieren (Kapitel 10). */
export function IncidentStepForm() {
  const [state, action] = useActionState(recordIncidentStepAction, idle);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
      <Field label="Schritt" required error={fe.step} className="sm:min-w-56">
        {(p) => (
          <Select {...p} name="step" defaultValue={(state.values?.step as string) ?? ""}>
            <option value="">Bitte wählen</option>
            {INCIDENT_STEPS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Vorfall-Ticket" required error={fe.ticket} hint="Zum Beispiel INC-42." className="sm:min-w-56">
        {(p) => <Input {...p} name="ticket" maxLength={40} autoComplete="off" defaultValue={state.status === "error" ? ((state.values?.ticket as string) ?? "") : ""} />}
      </Field>
      <div className="flex flex-col gap-3 sm:basis-full">
        <FormMessage state={state} />
        <SubmitButton variant="secondary" pendingText="Wird protokolliert …" className="self-start">
          Schritt protokollieren
        </SubmitButton>
      </div>
    </form>
  );
}
