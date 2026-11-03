"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  CountedTextarea,
  Field,
  FormMessage,
  Input,
  OperationId,
  ScalePicker,
  Select,
  SubmitButton,
  UnsavedChangesGuard,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/primitives";
import type { ActionState } from "@/lib/action-state";
import { useHealthAction } from "./use-health-action";
import { FATIGUE_SCALE, INTENSITY_SCALE } from "@/lib/catalog";
import { formatDate } from "@/lib/time";
import { HEALTH_LIMITS } from "@/server/modules/health/validation";
import { durationText, NOT_RECORDED, valueText } from "./format";
import { FormStep, stepTitle } from "./notebook";
import { WhenFields } from "./when-fields";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Option = { id: string; label: string };

type ConflictCurrent = {
  version: number;
  localDate: string;
  localTime: string;
  fatigue: number | null;
  sleepNote: string | null;
  note: string | null;
  observations: { label: string; intensity: number; durationMinutes: number | null }[];
};

type Common = {
  action: Action;
  mode: "create" | "edit";
  entryId?: string;
  version?: number;
  date: string;
  time: string;
  minDate: string;
  maxDate: string;
  timezoneLabel: string;
  note: string | null;
};

function ConflictNotice({ current, entryId }: { current: ConflictCurrent; entryId?: string }) {
  return (
    <Notice tone="warning" title="Neuere Fassung" role="status">
      <ul className="flex flex-col gap-0.5">
        <li>
          Zeitpunkt: {formatDate(current.localDate)}, {current.localTime}
        </li>
        {current.observations.map((o, i) => (
          <li key={i}>
            {o.label}: {valueText("intensity", o.intensity)}
            {o.durationMinutes ? ` · Dauer ${durationText(o.durationMinutes)}` : ""}
          </li>
        ))}
        {current.fatigue !== null && <li>Fatigue: {valueText("fatigue", current.fatigue)}</li>}
        {current.sleepNote !== null && <li>Schlafbeobachtung: vorhanden</li>}
        <li>Notiz: {current.note ? "vorhanden" : NOT_RECORDED}</li>
      </ul>
      {entryId && (
        <p className="mt-2">
          Wenn du die neuere Fassung behalten möchtest, <Link href={`/mein-ms/eintrag/${entryId}`}>lade die Ansicht neu</Link>.
          Sonst speichere deine Eingaben bewusst erneut.
        </p>
      )}
    </Notice>
  );
}

function OptionalText({
  addLabel,
  label,
  name,
  maxLength,
  hint,
  initial,
  error,
}: {
  addLabel: string;
  label: string;
  name: string;
  maxLength: number;
  hint: string;
  initial: string;
  error?: string;
}) {
  const [open, setOpen] = useState(initial.length > 0);
  if (!open && !error)
    return (
      <Button variant="secondary" size="sm" className="w-fit" icon={<Icon name="plus" className="size-4" />} onClick={() => setOpen(true)}>
        {addLabel}
      </Button>
    );
  return <CountedTextarea label={label} name={name} optional maxLength={maxLength} hint={hint} defaultValue={initial} error={error} rows={4} />;
}

/* ───────────────────────── S22 Symptome (DIA03) ───────────────────────── */

export type SymptomRowInit = { definitionId: string | null; label: string; intensity: number | null; duration: number | null };

type Row = { key: string; def: string; custom: string; duration: string; showDuration: boolean; intensity: number | null };

export function SymptomEntryForm({
  catalog,
  own,
  extra = [],
  rows: initialRows,
  ...common
}: Common & { catalog: Option[]; own: Option[]; extra?: Option[]; rows?: SymptomRowInit[] }) {
  const [state, formAction] = useHealthAction(common.action);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const [rows, setRows] = useState<Row[]>(() =>
    (initialRows?.length ? initialRows : [null]).map((r, i) => ({
      key: `r${i}`,
      def: r?.definitionId ? `def:${r.definitionId}` : r ? "custom" : "",
      custom: r && !r.definitionId ? r.label : "",
      duration: r?.duration ? String(r.duration) : "",
      showDuration: Boolean(r?.duration),
      intensity: r?.intensity ?? null,
    })),
  );
  const [nextKey, setNextKey] = useState(rows.length);
  const conflict = state.data?.conflict ? (state.data.current as ConflictCurrent) : null;
  const version = conflict?.version ?? common.version;
  const formId = common.mode === "create" ? "symptom-neu" : "symptom-bearbeiten";

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => {
    setRows((rs) => [...rs, { key: `r${nextKey}`, def: "", custom: "", duration: "", showDuration: false, intensity: null }]);
    setNextKey((n) => n + 1);
  };

  return (
    <form id={formId} action={formAction} className="flex max-w-3xl flex-col gap-8" noValidate>
      <UnsavedChangesGuard formId={formId} />
      {common.mode === "create" && <OperationId />}
      {common.entryId && <input type="hidden" name="id" value={common.entryId} />}
      {version !== undefined && <input type="hidden" name="version" value={version} />}
      <FormMessage state={state} />
      {conflict && <ConflictNotice current={conflict} entryId={common.entryId} />}

      <FormStep index="01" first>
        <WhenFields
          date={(v.date as string) || common.date}
          time={(v.time as string) || common.time}
          minDate={common.minDate}
          maxDate={common.maxDate}
          timezoneLabel={common.timezoneLabel}
          errors={{ date: fe.date, time: fe.time }}
        />
      </FormStep>

      <FormStep index="02">
        <div className="flex flex-col gap-1.5">
          <h2 className={stepTitle}>Symptome</h2>
          <p className="text-sm text-ink-2">
            Mindestens ein Symptom mit Stärke. Wähle aus der Liste oder gib eine eigene Bezeichnung ein.
          </p>
          {fe.symptoms && <p className="text-sm font-medium text-danger">{fe.symptoms}</p>}
        </div>
        {rows.map((row, i) => (
          <div key={row.key} className="border-t border-line-2 pt-5">
            <fieldset className="flex flex-col gap-5">
              <legend className="eyebrow mb-4">Symptom {i + 1}</legend>
              <input type="hidden" name="row" value={row.key} />
              <Field label="Symptom" error={fe[`s_${row.key}_def`]} required>
                {(p) => (
                  <Select {...p} name={`s_${row.key}_def`} value={row.def} onChange={(e) => update(row.key, { def: e.target.value })}>
                    <option value="">Bitte wählen</option>
                    <optgroup label="Symptomkatalog">
                      {catalog.map((o) => (
                        <option key={o.id} value={`def:${o.id}`}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    {own.length + extra.length > 0 && (
                      <optgroup label="Eigene Bezeichnungen">
                        {[...own, ...extra].map((o) => (
                          <option key={o.id} value={`def:${o.id}`}>
                            {o.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="custom">Eigene Bezeichnung eingeben …</option>
                  </Select>
                )}
              </Field>
              {row.def === "custom" && (
                <Field
                  label="Eigene Bezeichnung"
                  required
                  error={fe[`s_${row.key}_custom`]}
                  hint="Bis 80 Zeichen. Nur für dich sichtbar und künftig in deiner Auswahl."
                  counter={
                    <span className="tabular text-sm text-ink-2">
                      {row.custom.length} / {HEALTH_LIMITS.customLabel}
                    </span>
                  }
                >
                  {(p) => (
                    <Input
                      {...p}
                      name={`s_${row.key}_custom`}
                      maxLength={HEALTH_LIMITS.customLabel}
                      value={row.custom}
                      onChange={(e) => update(row.key, { custom: e.target.value })}
                      autoComplete="off"
                    />
                  )}
                </Field>
              )}
              <ScalePicker
                name={`s_${row.key}_intensity`}
                legend="Stärke (erforderlich)"
                min={INTENSITY_SCALE.min}
                max={INTENSITY_SCALE.max}
                minText={INTENSITY_SCALE.minText}
                maxText={INTENSITY_SCALE.maxText}
                help="Wie stark erlebst du es? Deine eigene Einschätzung."
                defaultValue={row.intensity}
                error={fe[`s_${row.key}_intensity`]}
              />
              {row.showDuration || fe[`s_${row.key}_duration`] ? (
                <div className="flex flex-col gap-2">
                  <Field label="Dauer in Minuten" optional error={fe[`s_${row.key}_duration`]} hint="Bis 10 080 Minuten (7 Tage).">
                    {(p) => (
                      <Input
                        {...p}
                        name={`s_${row.key}_duration`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={HEALTH_LIMITS.durationMax}
                        step={1}
                        value={row.duration}
                        onChange={(e) => update(row.key, { duration: e.target.value })}
                        className="sm:max-w-48"
                      />
                    )}
                  </Field>
                  <button
                    type="button"
                    onClick={() => update(row.key, { duration: "", showDuration: false })}
                    className="self-start rounded-[8px] px-1 text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
                  >
                    Dauer entfernen
                  </button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                  icon={<Icon name="clock" className="size-4" />}
                  onClick={() => update(row.key, { showDuration: true })}
                >
                  Dauer hinzufügen
                </Button>
              )}
              {rows.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  icon={<Icon name="x" className="size-4" />}
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                >
                  Symptom {i + 1} entfernen
                </Button>
              )}
            </fieldset>
          </div>
        ))}
        {rows.length < HEALTH_LIMITS.symptomsPerEntry && (
          <Button variant="secondary" className="w-fit" icon={<Icon name="plus" className="size-5" />} onClick={addRow}>
            Weiteres Symptom hinzufügen
          </Button>
        )}
      </FormStep>

      <FormStep index="03">
        <OptionalText
          addLabel="Notiz hinzufügen"
          label="Notiz"
          name="note"
          maxLength={HEALTH_LIMITS.diaryNote}
          hint="Nur für dich. Wird verschlüsselt gespeichert."
          initial={(v.note as string) ?? common.note ?? ""}
          error={fe.note}
        />
      </FormStep>

      <FormActions mode={common.mode} entryId={common.entryId} label={common.mode === "create" ? "Eintrag speichern" : "Änderungen speichern"} />
    </form>
  );
}

/* ───────────────────────── S24 Fatigue (DIA03) ───────────────────────── */

export function FatigueEntryForm({
  fatigue,
  sleepNote,
  ...common
}: Common & { fatigue: number | null; sleepNote: string | null }) {
  const [state, formAction] = useHealthAction(common.action);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const conflict = state.data?.conflict ? (state.data.current as ConflictCurrent) : null;
  const version = conflict?.version ?? common.version;
  const formId = common.mode === "create" ? "fatigue-neu" : "fatigue-bearbeiten";

  return (
    <form id={formId} action={formAction} className="flex max-w-3xl flex-col gap-8" noValidate>
      <UnsavedChangesGuard formId={formId} />
      {common.mode === "create" && <OperationId />}
      {common.entryId && <input type="hidden" name="id" value={common.entryId} />}
      {version !== undefined && <input type="hidden" name="version" value={version} />}
      <FormMessage state={state} />
      {conflict && <ConflictNotice current={conflict} entryId={common.entryId} />}

      <FormStep index="01" first>
        <WhenFields
          date={(v.date as string) || common.date}
          time={(v.time as string) || common.time}
          minDate={common.minDate}
          maxDate={common.maxDate}
          timezoneLabel={common.timezoneLabel}
          errors={{ date: fe.date, time: fe.time }}
        />
      </FormStep>

      <FormStep index="02">
        <ScalePicker
          name="fatigue"
          legend="Fatigue (erforderlich)"
          min={FATIGUE_SCALE.min}
          max={FATIGUE_SCALE.max}
          minText={FATIGUE_SCALE.minText}
          maxText={FATIGUE_SCALE.maxText}
          help={FATIGUE_SCALE.help}
          defaultValue={fatigue}
          error={fe.fatigue}
        />
      </FormStep>

      <FormStep index="03">
        <OptionalText
          addLabel="Schlaf notieren"
          label="Schlafbeobachtung"
          name="sleepNote"
          maxLength={HEALTH_LIMITS.sleepNote}
          hint="Freitext, z. B. wie du geschlafen hast. Es wird kein Schlafwert berechnet. Wird verschlüsselt gespeichert."
          initial={(v.sleepNote as string) ?? sleepNote ?? ""}
          error={fe.sleepNote}
        />
        <OptionalText
          addLabel="Beobachtungen hinzufügen"
          label="Beobachtungen und Notiz"
          name="note"
          maxLength={HEALTH_LIMITS.diaryNote}
          hint="Nur für dich. Wird verschlüsselt gespeichert."
          initial={(v.note as string) ?? common.note ?? ""}
          error={fe.note}
        />
      </FormStep>

      <FormActions mode={common.mode} entryId={common.entryId} label={common.mode === "create" ? "Eintrag speichern" : "Änderungen speichern"} />
    </form>
  );
}

function FormActions({ mode, entryId, label }: { mode: "create" | "edit"; entryId?: string; label: string }) {
  return (
    <FormStep strong className="sm:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SubmitButton size="lg">{label}</SubmitButton>
        <ButtonLink href={mode === "edit" && entryId ? `/mein-ms/eintrag/${entryId}` : "/mein-ms"} variant="ghost" size="lg">
          Abbrechen
        </ButtonLink>
      </div>
    </FormStep>
  );
}
