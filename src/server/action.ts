import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { fail, type ActionState } from "@/lib/action-state";
import { AuthError } from "./auth/viewer";
import { FeatureDisabledError } from "./flags";

/** Fachlicher Fehler mit verständlicher Meldung (wird unverändert angezeigt). */
export class UserError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/**
 * Einheitliche Fehlerbehandlung für Server Actions (HOM07, NFR15):
 * – keine Inhalte oder personenbezogenen Daten in Logs
 * – Korrelations-ID für Support
 * – Eingaben werden für defaultValue zurückgegeben
 */
export async function runAction(
  fn: () => Promise<ActionState>,
  values?: Record<string, string | string[] | undefined>,
): Promise<ActionState> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof UserError) return fail(err.message, { fieldErrors: err.fieldErrors, values, data: err.data });
    if (err instanceof AuthError) return fail(err.message, { values, data: { auth: err.reason } });
    if (err instanceof FeatureDisabledError)
      return fail(`${err.message}. Bestehende Daten bleiben erhalten.`, { values, data: { flag: err.flag } });
    const correlationId = randomUUID().slice(0, 8);
    console.error(`[action] ${correlationId}`, err instanceof Error ? err.name + ": " + err.message.slice(0, 200) : "unknown");
    return fail("Das hat leider nicht geklappt. Es wurde nichts gespeichert. Bitte versuche es erneut.", {
      values,
      correlationId,
    });
  }
}

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v.length > 0 ? v : null;
}

export function optInt(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}

/** Entfernt Steuerzeichen und vereinheitlicht Zeilenumbrüche. Kein HTML wird je gerendert. */
export function cleanText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
