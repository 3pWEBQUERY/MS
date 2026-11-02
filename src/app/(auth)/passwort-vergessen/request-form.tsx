"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { requestResetAction } from "@/server/modules/account/auth-actions";

export function RequestResetForm() {
  const [state, action] = useActionState(requestResetAction, idle);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <Field label="E-Mail-Adresse" error={state.fieldErrors?.email}>
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={(state.values?.email as string) ?? ""}
            required
          />
        )}
      </Field>
      <SubmitButton size="lg" pendingText="Wird gesendet …" className="w-full">
        Link anfordern
      </SubmitButton>
    </form>
  );
}
