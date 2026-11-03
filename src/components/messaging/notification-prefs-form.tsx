"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton, Switch, UnsavedChangesGuard } from "@/components/ui/form";
import { Notice } from "@/components/ui/primitives";
import { idle } from "@/lib/action-state";
import { sendTestNotificationAction, updateNotificationPrefsAction } from "@/server/modules/messaging/actions";

type Prefs = {
  inAppTypes: string[];
  emailSocial: boolean;
  quietStart: string;
  quietEnd: string;
  pausedUntilDate: string | null;
  version: number;
};

/** S14 Benachrichtigungen einstellen (MSG07, US23). */
export function NotificationPrefsForm({
  prefs,
  types,
  minDate,
}: {
  prefs: Prefs;
  types: { value: string; label: string; description: string }[];
  minDate: string;
}) {
  const [state, action] = useActionState(updateNotificationPrefsAction, idle);
  const v = state.values;
  const selected = Array.isArray(v?.inAppTypes) ? (v.inAppTypes as string[]) : prefs.inAppTypes;
  const emailOn = v ? v.emailSocial === "on" : prefs.emailSocial;

  return (
    <form id="notification-prefs" action={action} className="flex flex-col gap-10" noValidate>
      <UnsavedChangesGuard formId="notification-prefs" />
      <input type="hidden" name="version" value={prefs.version} />
      <FormMessage state={state} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-ink">Hinweise in der App</legend>
        <p className="-mt-2 text-base text-ink-2">
          Hinweise erscheinen unter «Mitteilungen» – ohne Inhalte oder Vorschauen.
        </p>
        <div className="flex flex-col divide-y divide-line rounded-[20px] border border-line bg-surface px-5 sm:px-6">
          {types.map((t) => (
            <div key={t.value} className="py-4">
              <Switch name="inAppTypes" value={t.value} label={t.label} description={t.description} defaultChecked={selected.includes(t.value)} />
            </div>
          ))}
          <div className="py-4">
            <Switch
              label="Entscheidungen der Moderation"
              description="Betrifft dich direkt und bleibt deshalb immer eingeschaltet."
              checked
              disabled
              readOnly
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-ink">E-Mail</legend>
        <div className="rounded-[20px] border border-line bg-surface p-5 sm:p-6">
          <Switch
            name="emailSocial"
            label="Soziale Hinweise per E-Mail"
            description="Höchstens eine neutrale Sammelmail pro Tag, ausserhalb deiner Ruhezeit. Die E-Mail nennt keine Namen, Gruppen oder Nachrichtentexte."
            defaultChecked={emailOn}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-ink">Ruhezeit und Pause</legend>
        <p className="-mt-2 text-base text-ink-2">
          In der Ruhezeit und während einer Pause werden keine E-Mails gesendet. Hinweise in der App sammeln sich still.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Ruhezeit ab" error={state.fieldErrors?.quietStart}>
            {(p) => <Input {...p} type="time" name="quietStart" defaultValue={(v?.quietStart as string) ?? prefs.quietStart} required />}
          </Field>
          <Field label="Ruhezeit bis" error={state.fieldErrors?.quietEnd}>
            {(p) => <Input {...p} type="time" name="quietEnd" defaultValue={(v?.quietEnd as string) ?? prefs.quietEnd} required />}
          </Field>
        </div>
        <Field
          label="E-Mail-Hinweise pausieren bis und mit"
          optional
          hint="Leer lassen, um nicht zu pausieren."
          error={state.fieldErrors?.pausedUntil}
          className="sm:max-w-xs"
        >
          {(p) => (
            <Input
              {...p}
              type="date"
              name="pausedUntil"
              min={minDate}
              defaultValue={(v?.pausedUntil as string) ?? prefs.pausedUntilDate ?? ""}
            />
          )}
        </Field>
      </fieldset>

      <Notice tone="info" title="Sicherheits- und Rechtsmitteilungen sind getrennt">
        Hinweise zur Sicherheit deines Kontos (zum Beispiel eine neue Anmeldung oder eine Passwortänderung) und rechtlich
        notwendige Mitteilungen werden immer zugestellt – unabhängig von diesen Einstellungen.
      </Notice>

      <div>
        <SubmitButton size="lg">Einstellungen speichern</SubmitButton>
      </div>
    </form>
  );
}

/** «Test ohne Inhaltsvorschau» (S14). */
export function TestNotificationButton() {
  const [state, action] = useActionState(sendTestNotificationAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <div>
        <SubmitButton variant="secondary" pendingText="Wird angelegt …">
          Test-Hinweis senden
        </SubmitButton>
      </div>
    </form>
  );
}
