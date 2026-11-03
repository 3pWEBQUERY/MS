"use client";

import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { requestResetAction } from "@/server/modules/account/auth-actions";
import { useResilientAction } from "@/components/ui/use-resilient-action";

export function RequestResetForm() {
  const [state, action] = useResilientAction(requestResetAction);
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
