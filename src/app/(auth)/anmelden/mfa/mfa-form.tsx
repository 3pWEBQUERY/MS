"use client";

import { useState } from "react";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { mfaVerifyAction } from "@/server/modules/account/auth-actions";
import { useHealthAction } from "@/components/health/use-health-action";

export function MfaForm({ next }: { next: string }) {
  const [state, action] = useHealthAction(mfaVerifyAction);
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />
      <FormMessage state={state} />
      {mode === "totp" ? (
        <Field
          key="totp"
          label="Sechsstelliger Code"
          hint="Öffne deine Authenticator-App und gib den aktuellen Code ein."
          error={state.fieldErrors?.code}
        >
          {(p) => (
            <Input
              {...p}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              className="tabular text-center text-2xl tracking-[0.3em]"
              required
            />
          )}
        </Field>
      ) : (
        <Field
          key="recovery"
          label="Wiederherstellungscode"
          hint="Jeder Code kann nur einmal verwendet werden, z. B. ab2cd-ef3gh."
          error={state.fieldErrors?.code}
        >
          {(p) => <Input {...p} name="code" autoComplete="off" spellCheck={false} className="font-mono" required />}
        </Field>
      )}
      <SubmitButton size="lg" pendingText="Wird geprüft …" className="w-full">
        Bestätigen
      </SubmitButton>
      <button
        type="button"
        onClick={() => setMode((m) => (m === "totp" ? "recovery" : "totp"))}
        className="self-center rounded-[8px] px-2 py-1 text-base font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        {mode === "totp" ? "Stattdessen Wiederherstellungscode verwenden" : "Code aus der App verwenden"}
      </button>
    </form>
  );
}
