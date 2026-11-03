"use client";

import Link from "next/link";
import { Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { deleteAccountAction } from "@/server/modules/privacy/actions";
import { useResilientAction } from "@/components/ui/use-resilient-action";

/** S16: ausdrückliche Bestätigung (Wort + Häkchen), danach Abmeldung und Beleg. */
export function DeleteAccountForm() {
  const [state, action] = useResilientAction(deleteAccountAction);
  return (
    <form action={action} noValidate className="flex flex-col gap-6 rounded-[20px] border border-danger/40 bg-surface p-5 sm:p-6">
      <h2 className="font-display text-[1.625rem] leading-tight tracking-[-0.015em] text-ink">Löschung bestätigen</h2>
      <FormMessage state={state} />
      <Field label="Tippe LÖSCHEN zur Bestätigung" error={state.fieldErrors?.phrase}>
        {(p) => (
          <Input
            {...p}
            name="phrase"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            defaultValue={state.values?.phrase as string | undefined}
          />
        )}
      </Field>
      <Checkbox
        name="confirm"
        label="Ich habe die Folgen und Fristen gelesen und möchte mein Konto endgültig löschen."
        error={state.fieldErrors?.confirm}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SubmitButton variant="danger" size="lg" pendingText="Konto wird deaktiviert …" icon={<Icon name="trash" className="size-5" />}>
          Konto endgültig löschen
        </SubmitButton>
        <Link href="/konto/daten" className="link-quiet inline-flex min-h-11 items-center px-2 text-base font-medium text-ink-2 hover:text-ink">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
