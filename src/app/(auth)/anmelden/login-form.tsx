"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { loginAction } from "@/server/modules/account/auth-actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, idle);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="E-Mail-Adresse" error={fe.email}>
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            defaultValue={(state.values?.email as string) ?? ""}
            required
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <PasswordField autoComplete="current-password" error={fe.password} />
        <Link href="/passwort-vergessen" className="self-end text-base font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
          Passwort vergessen?
        </Link>
      </div>
      <SubmitButton size="lg" pendingText="Anmeldung läuft …" className="w-full">
        Anmelden
      </SubmitButton>
      <p className="text-center text-base text-ink-2">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="font-semibold text-ink underline underline-offset-4">
          Registrieren
        </Link>
      </p>
    </form>
  );
}
