"use client";

import { useActionState } from "react";
import { CountedTextarea, FormMessage, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { submitAppealAction } from "@/server/modules/messaging/safety-actions";

/** S43 Einspruch (SAF05): Begründung wird verschlüsselt gespeichert. */
export function AppealForm({ caseId }: { caseId: string }) {
  const [state, action] = useActionState(submitAppealAction, idle);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="caseId" value={caseId} />
      <FormMessage state={state} />
      <CountedTextarea
        name="reason"
        label="Warum soll die Entscheidung überprüft werden?"
        required
        maxLength={2000}
        rows={6}
        defaultValue={(state.values?.reason as string) ?? ""}
        error={state.fieldErrors?.reason}
        hint="Beschreibe sachlich, was aus deiner Sicht nicht berücksichtigt wurde. Wird verschlüsselt gespeichert."
      />
      <div>
        <SubmitButton size="lg" pendingText="Wird gesendet …">
          Einspruch einreichen
        </SubmitButton>
      </div>
    </form>
  );
}
