"use client";

import Link from "next/link";
import { useState } from "react";
import { ButtonLink, Button } from "@/components/ui/button";
import {
  CountedTextarea,
  Field,
  FormMessage,
  Input,
  OperationId,
  ScalePicker,
  SubmitButton,
  UnsavedChangesGuard,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/primitives";
import type { ActionState } from "@/lib/action-state";
import { useHealthAction } from "./use-health-action";
import { ENERGY_SCALE, FATIGUE_SCALE, MOOD_SCALE } from "@/lib/catalog";
import { formatDate } from "@/lib/time";
import { HEALTH_LIMITS } from "@/server/modules/health/validation";
import { NOT_RECORDED, valueText } from "./format";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type Initial = {
  date: string;
  energy: number | null;
  mood: number | null;
  fatigue: number | null;
  note: string | null;
  version?: number;
};

type ConflictCurrent = {
  version: number;
  energy: number | null;
  mood: number | null;
  fatigue: number | null;
  note: string | null;
  updatedAt: string;
};

/**
 * S20 Tages-Check-in (DIA01, DIA02): drei textlich erklärte Skalen ohne Vorauswahl,
 * mindestens eine Angabe, optionale Notiz. «Überspringen» speichert nichts (US03).
 */
export function CheckInForm({
  mode,
  action,
  initial,
  today,
  minDate,
  timezoneLabel,
}: {
  mode: "create" | "edit";
  action: Action;
  initial: Initial;
  today: string;
  minDate: string;
  timezoneLabel: string;
}) {
  const [state, formAction] = useHealthAction(action);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const [showNote, setShowNote] = useState(Boolean(initial.note));
  const conflict = state.data?.conflict ? (state.data.current as ConflictCurrent) : null;
  const existingDate = typeof state.data?.existingDate === "string" ? state.data.existingDate : null;
  const version = conflict?.version ?? initial.version;
  const formId = mode === "create" ? "check-in-neu" : "check-in-bearbeiten";

  return (
    <form id={formId} action={formAction} className="flex max-w-2xl flex-col gap-8" noValidate>
      <UnsavedChangesGuard formId={formId} />
      {mode === "create" && <OperationId />}
      {version !== undefined && <input type="hidden" name="version" value={version} />}

      <FormMessage state={state} />
      {existingDate && (
        <Link
          href={`/mein-ms/check-in/${existingDate}`}
          className="-mt-4 inline-flex w-fit items-center gap-1.5 font-semibold text-ink underline underline-offset-4"
        >
          Check-in vom {formatDate(existingDate)} ansehen und ändern
          <Icon name="arrow-right" className="size-4" />
        </Link>
      )}
      {conflict && (
        <Notice tone="warning" title="Neuere Fassung" role="status">
          <ul className="flex flex-col gap-0.5">
            <li>Energie: {valueText("energy", conflict.energy)}</li>
            <li>Stimmung: {valueText("mood", conflict.mood)}</li>
            <li>Fatigue: {valueText("fatigue", conflict.fatigue)}</li>
            <li>Notiz: {conflict.note ? "vorhanden" : NOT_RECORDED}</li>
          </ul>
          <p className="mt-2">
            Wenn du die neuere Fassung behalten möchtest,{" "}
            <Link href={`/mein-ms/check-in/${initial.date}`}>lade die Ansicht neu</Link>. Sonst speichere deine Eingaben bewusst
            erneut.
          </p>
        </Notice>
      )}

      {mode === "create" ? (
        <Field
          label="Datum"
          error={fe.date}
          hint={`Standard ist heute. Bis 365 Tage rückwirkend möglich. Zeitzone: ${timezoneLabel}.`}
        >
          {(p) => (
            <Input
              {...p}
              name="date"
              type="date"
              min={minDate}
              max={today}
              defaultValue={(v.date as string) || initial.date}
              className="sm:max-w-xs"
              required
            />
          )}
        </Field>
      ) : (
        <>
          <input type="hidden" name="date" value={initial.date} />
          <p className="text-base text-ink-2">
            Datum: <strong className="font-semibold text-ink">{formatDate(initial.date)}</strong> · Zeitzone: {timezoneLabel}
          </p>
        </>
      )}

      <p className="-mt-2 text-base text-ink-2">
        Eine Angabe genügt. Nichts ist vorausgewählt – was du leer lässt, bleibt «nicht erfasst».
      </p>

      <ScalePicker
        name="energy"
        legend={ENERGY_SCALE.label}
        min={ENERGY_SCALE.min}
        max={ENERGY_SCALE.max}
        minText={ENERGY_SCALE.minText}
        maxText={ENERGY_SCALE.maxText}
        help={`${ENERGY_SCALE.help}`}
        defaultValue={initial.energy}
        error={fe.energy}
      />
      <ScalePicker
        name="mood"
        legend={MOOD_SCALE.label}
        min={MOOD_SCALE.min}
        max={MOOD_SCALE.max}
        minText={MOOD_SCALE.steps[0]}
        maxText={MOOD_SCALE.steps[MOOD_SCALE.steps.length - 1]}
        stepLabels={[...MOOD_SCALE.steps]}
        help={MOOD_SCALE.help}
        defaultValue={initial.mood}
        error={fe.mood}
      />
      <ScalePicker
        name="fatigue"
        legend={FATIGUE_SCALE.label}
        min={FATIGUE_SCALE.min}
        max={FATIGUE_SCALE.max}
        minText={FATIGUE_SCALE.minText}
        maxText={FATIGUE_SCALE.maxText}
        help={FATIGUE_SCALE.help}
        defaultValue={initial.fatigue}
        error={fe.fatigue}
      />

      {showNote || fe.note ? (
        <CountedTextarea
          label="Notiz"
          name="note"
          optional
          maxLength={HEALTH_LIMITS.checkInNote}
          rows={4}
          hint="Nur für dich. Wird verschlüsselt gespeichert."
          defaultValue={(v.note as string) ?? initial.note ?? ""}
          error={fe.note}
        />
      ) : (
        <Button variant="secondary" size="sm" className="w-fit" icon={<Icon name="plus" className="size-4" />} onClick={() => setShowNote(true)}>
          Notiz hinzufügen
        </Button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton size="lg">{mode === "create" ? "Check-in speichern" : "Änderungen speichern"}</SubmitButton>
        {mode === "create" ? (
          <ButtonLink href="/heute" variant="ghost" size="lg" data-discard>
            Überspringen
          </ButtonLink>
        ) : (
          <ButtonLink href={`/mein-ms/check-in/${initial.date}`} variant="ghost" size="lg">
            Abbrechen
          </ButtonLink>
        )}
      </div>
      {mode === "create" && (
        <p className="-mt-4 text-sm text-ink-2">«Überspringen» speichert nichts. Du kannst jederzeit später etwas festhalten.</p>
      )}
    </form>
  );
}
