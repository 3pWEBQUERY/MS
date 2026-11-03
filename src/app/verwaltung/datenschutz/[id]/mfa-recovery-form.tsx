"use client";

import { Checkbox, Field, FormMessage, Input, RadioCards, SubmitButton } from "@/components/ui/form";
import { decideMfaRecoveryAction } from "@/server/modules/privacy/mfa-recovery-actions";
import { useHealthAction } from "@/components/health/use-health-action";

/**
 * ACC05: kontrollierte Wiederherstellung des zweiten Faktors. Prüfverfahren als kontrollierter
 * Code, Ticket statt Freitext (PRI07). «reset» ist die zweite Freigabe bei Mitarbeitendenkonten.
 */
export function MfaRecoveryForm({
  requestId,
  step,
  checks,
}: {
  requestId: string;
  step: "verify" | "reset";
  checks: { value: string; label: string }[];
}) {
  const [state, action] = useHealthAction(decideMfaRecoveryAction);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="requestId" value={requestId} />
      <FormMessage state={state} />
      {step === "verify" && (
        <RadioCards
          name="check"
          legend="Wie wurde die Identität geprüft?"
          hint="Keine Ausweiskopie und nie allein über eine Profilangabe wie Pseudonym oder Kanton."
          options={checks}
          defaultValue={state.values?.check as string | undefined}
          error={fe.check}
          required
        />
      )}
      <Field label="Ticket" required error={fe.ticket} hint="Vorgangsnummer, z. B. DS-2026-014 – ohne Personendaten.">
        {(p) => <Input {...p} name="ticket" maxLength={40} defaultValue={state.values?.ticket as string | undefined} />}
      </Field>
      <Checkbox
        name="confirm"
        label={
          step === "verify"
            ? "Ich habe die Identität wie angegeben geprüft und dokumentiert."
            : "Ich erteile als zweite Person die Freigabe zum Zurücksetzen."
        }
        error={fe.confirm}
      />
      <div className="flex flex-wrap gap-3">
        <SubmitButton name="decision" value={step} variant="primary" pendingText="Wird gespeichert …">
          {step === "verify" ? "Identität bestätigen" : "Zweiten Faktor zurücksetzen"}
        </SubmitButton>
        <SubmitButton name="decision" value="reject" variant="quiet-danger" pendingText="Wird gespeichert …">
          Anfrage ablehnen
        </SubmitButton>
      </div>
    </form>
  );
}
