"use client";

import { Field, Input } from "@/components/ui/form";
import { stepTitle } from "./notebook";

/** Zeitpunkt (Datum + Uhrzeit, lokal) mit sichtbarer Zeitzone (DIA03, PRD 09 «Zeitlogik»). */
export function WhenFields({
  date,
  time,
  minDate,
  maxDate,
  timezoneLabel,
  errors,
}: {
  date: string;
  time: string;
  minDate: string;
  maxDate: string;
  timezoneLabel: string;
  errors: { date?: string; time?: string };
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={`mb-2 ${stepTitle}`}>Zeitpunkt</legend>
      <p className="-mt-1 text-sm text-ink-2">
        Wann hast du es beobachtet? Zeitzone: {timezoneLabel}. Bis 365 Tage rückwirkend, nicht in der Zukunft.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Datum" error={errors.date} required>
          {(p) => <Input {...p} name="date" type="date" min={minDate} max={maxDate} defaultValue={date} />}
        </Field>
        <Field label="Uhrzeit" error={errors.time} required>
          {(p) => <Input {...p} name="time" type="time" step={60} defaultValue={time} />}
        </Field>
      </div>
    </fieldset>
  );
}
