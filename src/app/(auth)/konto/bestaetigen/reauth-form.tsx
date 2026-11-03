"use client";

import Link from "next/link";
import { PasswordField } from "@/components/auth/password-field";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { reauthAction } from "@/server/modules/account/auth-actions";
import { useHealthAction } from "@/components/health/use-health-action";

export function ReauthForm({ next, withCode }: { next: string; withCode: boolean }) {
  const [state, action] = useHealthAction(reauthAction);
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <PasswordField autoComplete="current-password" error={state.fieldErrors?.password} />
      {withCode && (
        <Field label="Code aus der Authenticator-App" error={state.fieldErrors?.code}>
          {(p) => <Input {...p} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="tabular" required />}
        </Field>
      )}
      <SubmitButton size="lg" pendingText="Wird geprüft …" className="w-full">
        Bestätigen und fortfahren
      </SubmitButton>
      <Link href={next.startsWith("/konto") ? "/konto/daten" : "/heute"} className="self-center text-base font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
        Abbrechen
      </Link>
    </form>
  );
}
