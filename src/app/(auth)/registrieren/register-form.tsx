"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { registerAction } from "@/server/modules/account/auth-actions";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, idle);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <Field label="E-Mail-Adresse" error={fe.email} hint="Wird nie in deinem Profil angezeigt.">
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            defaultValue={(state.values?.email as string) ?? ""}
            required
          />
        )}
      </Field>
      <PasswordField
        autoComplete="new-password"
        error={fe.password}
        hint="Mindestens 15 Zeichen. Ein Satz aus mehreren Wörtern ist sicher und gut zu merken."
        showCounter
      />
      <div className="flex flex-col gap-4 rounded-[16px] border border-line bg-surface p-4">
        <Checkbox
          name="audience"
          label="Ich bin mindestens 18 Jahre alt und lebe selbst mit MS."
          description="Wir verlangen keinen Diagnosenachweis. Bereits die Mitgliedschaft lässt auf Gesundheitsdaten schliessen – das ist in der Datenschutzinformation erklärt."
          error={fe.audience}
        />
        <Checkbox
          name="terms"
          label={
            <>
              Ich akzeptiere die{" "}
              <Link href="/bedingungen" target="_blank" className="font-semibold underline underline-offset-4">
                Nutzungsbedingungen
              </Link>
              .
            </>
          }
          description={
            <>
              Die{" "}
              <Link href="/datenschutz" target="_blank" className="font-medium underline underline-offset-4">
                Datenschutzinformation
              </Link>{" "}
              erklärt, wer was sehen kann. Gesundheitsdaten erfasst du nur nach einer gesonderten Entscheidung.
            </>
          }
          error={fe.terms}
        />
      </div>
      <SubmitButton size="lg" pendingText="Konto wird angelegt …" className="w-full">
        Konto anlegen
      </SubmitButton>
      <p className="text-center text-base text-ink-2">
        Bereits registriert?{" "}
        <Link href="/anmelden" className="font-semibold text-ink underline underline-offset-4">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
