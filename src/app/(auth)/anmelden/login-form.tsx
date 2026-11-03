"use client";

import Link from "next/link";
import { PasswordField } from "@/components/auth/password-field";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { loginAction } from "@/server/modules/account/auth-actions";
import { useResilientAction } from "@/components/ui/use-resilient-action";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useResilientAction(loginAction);
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
        <Link href="/passwort-vergessen" className="link-quiet inline-flex min-h-11 items-center self-end text-base font-medium text-ink-2 hover:text-ink">
          Passwort vergessen?
        </Link>
      </div>
      <SubmitButton size="lg" pendingText="Anmeldung läuft …" className="w-full">
        Anmelden
      </SubmitButton>
      <p className="text-center text-base text-ink-2">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="link-quiet font-semibold text-ink">
          Registrieren
        </Link>
      </p>
    </form>
  );
}
