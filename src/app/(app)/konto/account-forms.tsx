"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import { changeEmailAction, changePasswordAction } from "@/server/modules/account/settings-actions";

function ReauthLink({ state }: { state: ActionState }) {
  if (state.data?.auth !== "reauth") return null;
  return (
    <Link href="/konto/bestaetigen?next=%2Fkonto" className="text-base font-medium text-ink underline underline-offset-4">
      Jetzt mit Passwort bestätigen
    </Link>
  );
}

/** ACC07: neue Adresse wird vor dem Austausch bestätigt; Rückmeldung neutral. */
export function ChangeEmailForm() {
  const [state, action] = useActionState(changeEmailAction, idle);
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <ReauthLink state={state} />
      <Field
        label="Neue E-Mail-Adresse"
        hint="Wir senden einen Bestätigungslink an die neue Adresse. Er ist 24 Stunden gültig."
        error={state.fieldErrors?.email}
      >
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            defaultValue={state.status === "success" ? "" : (state.values?.email as string | undefined)}
            key={state.status === "success" ? "sent" : "edit"}
          />
        )}
      </Field>
      <div>
        <SubmitButton variant="secondary" pendingText="Wird gesendet …">
          Bestätigungslink senden
        </SubmitButton>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, idle);
  return (
    <form action={action} noValidate className="flex flex-col gap-5" key={state.status === "success" ? state.message : "form"}>
      <FormMessage state={state} />
      <ReauthLink state={state} />
      <PasswordField
        name="newPassword"
        label="Neues Passwort"
        autoComplete="new-password"
        hint="Mindestens 15 Zeichen. Ein Satz aus mehreren Wörtern ist leicht zu merken. Einfügen aus dem Passwortmanager ist möglich."
        error={state.fieldErrors?.newPassword}
        showCounter
      />
      <PasswordField
        name="repeatPassword"
        label="Neues Passwort wiederholen"
        autoComplete="new-password"
        error={state.fieldErrors?.repeatPassword}
      />
      <div>
        <SubmitButton variant="secondary" pendingText="Wird geändert …">
          Passwort ändern
        </SubmitButton>
      </div>
    </form>
  );
}
