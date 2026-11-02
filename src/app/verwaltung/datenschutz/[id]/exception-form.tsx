"use client";

import { useActionState } from "react";
import { CountedTextarea, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { setExceptionAction } from "@/server/modules/privacy/admin-actions";

/** PRI06: Ausnahme mit Begründung, Ticket und Enddatum (höchstens ein Jahr). */
export function ExceptionForm({ requestId, hasException }: { requestId: string; hasException: boolean }) {
  const [state, action] = useActionState(setExceptionAction, idle);
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="requestId" value={requestId} />
      <FormMessage state={state} />
      <CountedTextarea
        name="note"
        label={hasException ? "Begründung aktualisieren" : "Begründung"}
        maxLength={500}
        rows={3}
        hint="Rechtsgrundlage und betroffene Objektklasse – keine Inhalte der Person."
        error={state.fieldErrors?.note}
        defaultValue={state.values?.note as string | undefined}
        required
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Befristet bis" required error={state.fieldErrors?.until}>
          {(p) => <Input {...p} type="date" name="until" defaultValue={state.values?.until as string | undefined} />}
        </Field>
        <Field label="Ticket" required error={state.fieldErrors?.ticket}>
          {(p) => <Input {...p} name="ticket" maxLength={60} defaultValue={state.values?.ticket as string | undefined} />}
        </Field>
      </div>
      <div>
        <SubmitButton variant="secondary">Ausnahme speichern</SubmitButton>
      </div>
    </form>
  );
}
