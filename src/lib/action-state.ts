/**
 * Einheitliches Rückgabeformat aller Server Actions (HOM07):
 * Laden, Fehler und bestätigter Erfolg sind unterscheidbar; eingegebene Werte
 * werden bei Fehlern zurückgegeben, damit nichts verloren geht.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  /** Kurze, verständliche Meldung (wird per Live-Region angekündigt) */
  message?: string;
  /** Feldname → Fehlermeldung, wird über aria-describedby verknüpft */
  fieldErrors?: Record<string, string>;
  /** Zurückgegebene Eingaben für defaultValue (keine sensiblen Daten in URLs) */
  values?: Record<string, string | string[] | undefined>;
  /** Korrelations-ID für Supportanfragen, ohne private Details */
  correlationId?: string;
  /** Optionale Zusatzdaten, z. B. ein Konfliktstand */
  data?: Record<string, unknown>;
};

export const idle: ActionState = { status: "idle" };

export function fail(message: string, extra?: Omit<ActionState, "status" | "message">): ActionState {
  return { status: "error", message, ...extra };
}

export function ok(message: string, extra?: Omit<ActionState, "status" | "message">): ActionState {
  return { status: "success", message, ...extra };
}

export function formValues(formData: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = formData.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Wandelt zod-Fehler in fieldErrors um */
export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}
