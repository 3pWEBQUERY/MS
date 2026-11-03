"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/primitives";
import { confirmMfaAction, disableMfaAction, regenerateRecoveryCodesAction } from "@/server/modules/account/mfa-actions";
import { useHealthAction } from "@/components/health/use-health-action";

/** Einmalige Anzeige der Wiederherstellungscodes – sie werden nur als Hash gespeichert (ACC05). */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const text = `MS Plattform – Wiederherstellungscodes\nJeder Code gilt genau einmal.\n\n${codes.join("\n")}\n`;
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="warning" role="status" title="Jetzt sichern – die Codes werden nur dieses eine Mal angezeigt">
        Bewahre sie getrennt vom Smartphone auf, zum Beispiel ausgedruckt oder in deinem Passwortmanager.
      </Notice>
      <ol className="tabular grid grid-cols-1 gap-2 rounded-[16px] border border-line bg-sunk p-4 font-mono text-lg text-ink min-[400px]:grid-cols-2">
        {codes.map((c) => (
          <li key={c} className="rounded-[8px] bg-surface px-3 py-2">
            {c}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={<Icon name="clipboard" className="size-5" />}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied("Codes in die Zwischenablage kopiert.");
            } catch {
              setCopied("Kopieren war nicht möglich. Bitte notiere die Codes.");
            }
          }}
        >
          Kopieren
        </Button>
        <Button
          variant="secondary"
          icon={<Icon name="download" className="size-5" />}
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = "wiederherstellungscodes.txt";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Als Textdatei speichern
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-ink-2">
        {copied}
      </p>
      <div>
        <Button variant="primary" size="lg" onClick={onDone} icon={<Icon name="check" className="size-5" />}>
          Ich habe die Codes gesichert
        </Button>
      </div>
    </div>
  );
}

export function MfaConfirmForm() {
  const [state, action] = useHealthAction(confirmMfaAction);
  const router = useRouter();
  const codes = Array.isArray(state.data?.codes) ? (state.data.codes as string[]) : null;
  if (state.status === "success" && codes) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <RecoveryCodes codes={codes} onDone={() => router.refresh()} />
      </div>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <Field label="Sechsstelliger Code aus der App" error={state.fieldErrors?.code}>
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
      <SubmitButton size="lg" pendingText="Wird geprüft …" className="w-full sm:w-auto">
        Bestätigen und einschalten
      </SubmitButton>
    </form>
  );
}

export function RegenerateCodes() {
  const [state, action] = useHealthAction(regenerateRecoveryCodesAction);
  const router = useRouter();
  const codes = Array.isArray(state.data?.codes) ? (state.data.codes as string[]) : null;
  if (state.status === "success" && codes) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <RecoveryCodes codes={codes} onDone={() => router.refresh()} />
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <p className="text-base text-ink-2">Neue Codes ersetzen alle bisherigen sofort.</p>
      <SubmitButton variant="secondary" pendingText="Wird erstellt …">
        Neue Codes erstellen
      </SubmitButton>
      <FormMessage state={state} className="w-full" />
    </form>
  );
}

export function DisableMfaForm() {
  const [state, action] = useHealthAction(disableMfaAction);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      <p className="text-base text-ink-2">
        Danach meldest du dich nur noch mit deinem Passwort an. Dein Konto ist dadurch weniger gut geschützt.
      </p>
      <Checkbox name="confirm" label="Ich möchte den zweiten Faktor ausschalten." error={state.fieldErrors?.confirm} />
      <div>
        <SubmitButton variant="quiet-danger" pendingText="Wird ausgeschaltet …">
          Zweiten Faktor ausschalten
        </SubmitButton>
      </div>
    </form>
  );
}
