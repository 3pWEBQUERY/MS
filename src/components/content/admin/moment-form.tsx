"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { MOMENT_INTENTS, type MomentConfig } from "@/lib/moment";
import { createMomentVersionAction } from "@/server/modules/content/moment-actions";
import { MOMENT_ICON_OPTIONS } from "@/server/modules/content/shared";

/** HOM02: neue Version der Mein-Moment-Regeln – je Absicht höchstens drei Ziele, nur interne Pfade. */
export function MomentRuleForm({ base }: { base: MomentConfig }) {
  const [state, action] = useActionState(createMomentVersionAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: string, f: string) => (state.values?.[k] as string | undefined) ?? f;
  return (
    <form action={action} className="flex flex-col gap-8" noValidate>
      <FormMessage state={state} />
      <Field label="Bezeichnung der Version" required error={fe.versionLabel} hint="Zum Beispiel «Winter 2026 – Hilfe zuerst».">
        {(p) => <Input {...p} name="versionLabel" defaultValue={v("versionLabel", "")} maxLength={60} className="max-w-xl" />}
      </Field>
      {MOMENT_INTENTS.map((intent) => (
        <fieldset key={intent.key} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
          <legend className="px-1 text-lg font-semibold text-ink">{intent.label}</legend>
          {fe[intent.key] && <p className="text-sm font-medium text-danger">{fe[intent.key]}</p>}
          <p className="text-sm text-ink-2">Leere Zeilen werden nicht angezeigt. Ohne Ziel bleibt die Absicht leer – die Navigation bleibt immer erreichbar.</p>
          {[0, 1, 2].map((i) => {
            const t = base[intent.key][i];
            const p = `${intent.key}.${i}`;
            return (
              <div key={p} className="grid gap-4 rounded-[12px] bg-sunk p-4 md:grid-cols-2">
                <Field label={`Ziel ${i + 1}: Bezeichnung`} error={fe[`${p}.label`]}>
                  {(fp) => <Input {...fp} name={`${p}.label`} defaultValue={v(`${p}.label`, t?.label ?? "")} maxLength={60} />}
                </Field>
                <Field label="Pfad" error={fe[`${p}.href`]} hint="Nur interne Pfade, z. B. /hilfe">
                  {(fp) => <Input {...fp} name={`${p}.href`} defaultValue={v(`${p}.href`, t?.href ?? "")} spellCheck={false} />}
                </Field>
                <Field label="Beschreibung" error={fe[`${p}.description`]} className="md:col-span-2">
                  {(fp) => <Input {...fp} name={`${p}.description`} defaultValue={v(`${p}.description`, t?.description ?? "")} maxLength={120} />}
                </Field>
                <Field label="Symbol" error={fe[`${p}.icon`]}>
                  {(fp) => (
                    <Select {...fp} name={`${p}.icon`} defaultValue={v(`${p}.icon`, t?.icon ?? "book")}>
                      {MOMENT_ICON_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <div className="flex items-end pb-2">
                  <Checkbox
                    name={`${p}.requires`}
                    defaultChecked={state.values ? state.values[`${p}.requires`] === "on" : t?.requires === "health"}
                    label="Nur mit Gesundheitsbereich"
                    description="Bei abgelehntem Bereich ausgeblendet."
                  />
                </div>
              </div>
            );
          })}
        </fieldset>
      ))}
      <SubmitButton pendingText="Wird angelegt …" className="w-full sm:w-fit">
        Version anlegen
      </SubmitButton>
    </form>
  );
}
