"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { Notice } from "@/components/ui/primitives";
import { idle } from "@/lib/action-state";
import { formatDate } from "@/lib/time";
import { createInvitationAction } from "@/server/modules/admin/invitation-actions";
import { useSuccessKey } from "./action-button";

/**
 * Einladungscode erzeugen (PRD 17 «begrenzte Einladung»). Der Code steht nur in der Antwort
 * dieser Aktion und verschwindet beim Neuladen – er wird nirgends gespeichert.
 */
export function CreateInvitationForm({ maxUsesOptions, dayOptions }: { maxUsesOptions: readonly number[]; dayOptions: readonly number[] }) {
  const [state, action] = useActionState(createInvitationAction, idle);
  const resetKey = useSuccessKey(state);
  const fe = state.fieldErrors ?? {};
  const created = state.status === "success" && typeof state.data?.code === "string" ? (state.data as { code: string; maxUses: number; expiresAt: string }) : null;
  const keep = state.status === "error" ? state.values : undefined;

  return (
    <div className="flex flex-col gap-6">
      <FormMessage state={state} />
      {created && (
        <Notice tone="success" title="Neuer Einladungscode – nur jetzt sichtbar">
          <p className="mt-1 font-mono text-2xl font-[650] tracking-[0.08em] text-ink tabular">
            {created.code}
          </p>
          <p className="mt-2">
            {created.maxUses === 1 ? "Einmalcode" : `Bis zu ${created.maxUses} Registrierungen`}, gültig bis{" "}
            {formatDate(new Date(created.expiresAt))}. Gib den Code nur über einen vereinbarten Weg weiter. Nach dem Neuladen ist er nicht mehr abrufbar;
            bei Verlust widerrufen und neu erzeugen.
          </p>
        </Notice>
      )}
      <form key={resetKey} action={action} className="flex flex-col gap-6 sm:max-w-2xl" noValidate>
        <Field
          label="Zweck"
          required
          error={fe.purpose}
          hint="Wofür der Code gedacht ist, z. B. «Pilot Gruppe Bern» oder «Mitarbeitendentest». Keine Namen, E-Mail-Adressen oder Telefonnummern."
        >
          {(p) => <Input {...p} name="purpose" maxLength={80} autoComplete="off" defaultValue={(keep?.purpose as string) ?? ""} />}
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Kontingent" required error={fe.maxUses}>
            {(p) => (
              <Select {...p} name="maxUses" defaultValue={(keep?.maxUses as string) ?? "1"}>
                {maxUsesOptions.map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "Einmalcode (1 Registrierung)" : `${n} Registrierungen`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Gültigkeit" required error={fe.days}>
            {(p) => (
              <Select {...p} name="days" defaultValue={(keep?.days as string) ?? "14"}>
                {dayOptions.map((d) => (
                  <option key={d} value={d}>
                    {d} Tage
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <SubmitButton pendingText="Code wird erzeugt …" className="self-start">
          Einladungscode erzeugen
        </SubmitButton>
      </form>
    </div>
  );
}
