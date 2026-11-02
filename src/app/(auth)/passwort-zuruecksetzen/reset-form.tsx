"use client";

import { useActionState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { resetPasswordAction } from "@/server/modules/account/auth-actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, idle);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <PasswordField
        label="Neues Passwort"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        hint="Mindestens 15 Zeichen."
        showCounter
      />
      <SubmitButton size="lg" pendingText="Wird gespeichert …" className="w-full">
        Passwort speichern
      </SubmitButton>
    </form>
  );
}
