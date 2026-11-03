"use client";

import Link from "next/link";
import { PasswordField } from "@/components/auth/password-field";
import { Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { Notice } from "@/components/ui/primitives";
import { registerAction } from "@/server/modules/account/auth-actions";
import { useResilientAction } from "@/components/ui/use-resilient-action";

export function RegisterForm({ inviteRequired = false }: { inviteRequired?: boolean }) {
  const [state, action] = useResilientAction(registerAction);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      {inviteRequired && (
        <>
          <Notice tone="info" title="Im Moment nur mit Einladung">
            Die Plattform wird schrittweise geöffnet. Für ein Konto brauchst du einen Einladungscode. Wissen, Hilfsangebote und die
            Sicherheitsseite sind ohne Konto erreichbar.
          </Notice>
          <Field label="Einladungscode" error={fe.invite} hint="12 Zeichen, z. B. ABCD-EFGH-JKMN. Gross- und Kleinschreibung spielt keine Rolle.">
            {(p) => (
              <Input
                {...p}
                name="invite"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={20}
                defaultValue={(state.values?.invite as string) ?? ""}
                required
              />
            )}
          </Field>
        </>
      )}
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
      {/* Lange Wörter dürfen bei 320 px und grosser Schrift umbrechen (Reflow A02) */}
      <div className="flex flex-col divide-y divide-line border-y border-line [&>*]:py-4 [&_label>span:last-child]:min-w-0 [&_label>span:last-child]:[overflow-wrap:anywhere]">
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
              <Link href="/bedingungen" target="_blank" className="link-quiet font-semibold">
                Nutzungsbedingungen
              </Link>
              .
            </>
          }
          description={
            <>
              Die{" "}
              <Link href="/datenschutz" target="_blank" className="link-quiet font-medium">
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
        <Link href="/anmelden" className="link-quiet font-semibold text-ink">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
