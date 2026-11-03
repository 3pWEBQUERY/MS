"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import { fail, idle, type ActionState } from "@/lib/action-state";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export const NOT_SAVED_MESSAGE =
  "Noch nicht gespeichert. Die Verbindung wurde unterbrochen. Deine Eingaben sind noch da – bitte versuche es erneut.";

/** Eingaben für defaultValue zurückgeben – nur im Arbeitsspeicher, nie in URL oder Browser-Speicher. */
function valuesOf(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION") || k === "clientOpId") continue;
    const prev = out[k];
    out[k] = prev === undefined ? v : [...(Array.isArray(prev) ? prev : [prev]), v];
  }
  return out;
}

/**
 * useActionState mit verlässlichem Offline-Zustand (PRD 04 «Offline», F02 «Netzabbruch», HOM07):
 * Scheitert die Anfrage selbst (kein Netz, Zeitüberschreitung), erscheint «Noch nicht gespeichert»
 * statt einer Fehlerseite. Eingaben, Konfliktstand und Vorgangskennung bleiben erhalten, sodass
 * erneutes Senden kein Duplikat erzeugt (AT02). Weiterleitungen nach Erfolg laufen unverändert.
 */
export function useHealthAction(action: Action) {
  return useActionState(async (prev: ActionState, formData: FormData): Promise<ActionState> => {
    try {
      return await action(prev, formData);
    } catch (err) {
      unstable_rethrow(err);
      return fail(NOT_SAVED_MESSAGE, { values: valuesOf(formData), data: prev.data, fieldErrors: prev.fieldErrors });
    }
  }, idle);
}
