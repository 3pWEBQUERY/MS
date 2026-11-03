"use client";

import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { resendVerificationAction, verifyEmailAction } from "@/server/modules/account/auth-actions";
import { useHealthAction } from "@/components/health/use-health-action";

/** Bestätigung per Klick, damit Link-Vorschauen in Mailprogrammen das Token nicht verbrauchen. */
export function VerifyForm({ token }: { token: string }) {
  const [state, action] = useHealthAction(verifyEmailAction);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      {state.data?.invalid ? null : (
        <SubmitButton size="lg" pendingText="Wird bestätigt …" className="w-full">
          E-Mail-Adresse bestätigen
        </SubmitButton>
      )}
      {Boolean(state.data?.invalid) && <ResendForm askEmail />}
    </form>
  );
}

export function ResendForm({ askEmail }: { askEmail: boolean }) {
  const [state, action] = useHealthAction(resendVerificationAction);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {askEmail && (
        <Field label="E-Mail-Adresse" error={state.fieldErrors?.email}>
          {(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}
        </Field>
      )}
      <SubmitButton variant="secondary" pendingText="Wird gesendet …" className="w-full">
        Neuen Link senden
      </SubmitButton>
    </form>
  );
}
