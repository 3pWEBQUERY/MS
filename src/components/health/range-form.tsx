"use client";

import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

/**
 * Eigener Zeitraum für den Verlauf (DIA06). Als GET-Formular – die URL enthält nur
 * Datumsangaben, keine Werte oder Symptombezeichnungen.
 */
export function RangeForm({ von, bis, max, error }: { von: string; bis: string; max: string; error?: string }) {
  return (
    <Form action="/mein-ms/verlauf" className="flex flex-col gap-4">
      <input type="hidden" name="zeitraum" value="eigen" />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Von" error={error}>
          {(p) => <Input {...p} name="von" type="date" max={max} defaultValue={von} required />}
        </Field>
        <Field label="Bis">
          {(p) => <Input {...p} name="bis" type="date" max={max} defaultValue={bis} required />}
        </Field>
        <Button type="submit" variant="secondary">
          Zeitraum anzeigen
        </Button>
      </div>
      <p className="text-sm text-ink-2">Höchstens 365 Tage.</p>
    </Form>
  );
}
