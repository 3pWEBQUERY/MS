import "server-only";
import { randomUUID } from "node:crypto";
import { cleanText, str, UserError } from "../../action";
import { actionViewer, type Viewer } from "../../auth/viewer";
import { assertEnabled } from "../../flags";
import { consume } from "../../rate-limit";
import { isUuid } from "./validation";

/**
 * Gemeinsame Bausteine der schreibenden Gesundheitsaktionen (DIA01–DIA05, HOM07, HOM08).
 * Bewusst ohne "use server": die Aktionen selbst liegen in *-actions.ts.
 */

const HEALTH_WRITES_PER_HOUR = 120;

/** Vorgangskennung für idempotente Wiederholung (AT02). */
export function opIdFrom(formData: FormData): string {
  const v = str(formData, "clientOpId");
  // Ohne JavaScript fehlt die Kennung – dann erzeugt der Server eine (ENGINEERING «Idempotenz»).
  return isUuid(v) ? v.toLowerCase() : randomUUID();
}

/**
 * Prüfung für neue Einträge und Änderungen: aktive Einwilligung (PRI01/02), Feature-Schalter
 * «health_write» (HOM08, serverseitig) und Rate-Limit. Löschen läuft bewusst nicht hierüber –
 * es bleibt auch nach Widerruf und im Teilbetrieb möglich (Datenhoheit).
 */
export async function healthWriter(): Promise<Viewer> {
  const viewer = await actionViewer();
  if (!viewer.healthActive)
    throw new UserError(
      "Neue Einträge und Änderungen sind nur mit aktiviertem Gesundheitsbereich möglich. Du kannst ihn unter «Privatsphäre» aktivieren.",
      undefined,
      { inactive: true },
    );
  await assertEnabled("health_write");
  if (!(await consume(`health:${viewer.accountId}`, HEALTH_WRITES_PER_HOUR, 3600)))
    throw new UserError("Du hast in kurzer Zeit sehr viele Änderungen gespeichert. Bitte warte einen Moment und versuche es dann erneut.");
  return viewer;
}

/** Freitext lesen und bereinigen; leer = nicht erfasst (null). */
export function readNote(formData: FormData, key: string, max: number, label: string, errors: Record<string, string>): string | null {
  const raw = formData.get(key);
  const text = typeof raw === "string" ? cleanText(raw) : "";
  if (text.length > max) errors[key] = `${label} darf höchstens ${max.toLocaleString("de-CH")} Zeichen lang sein.`;
  return text.length > 0 ? text : null;
}

export const CONFLICT_MESSAGE =
  "wurde inzwischen an anderer Stelle geändert. Die neuere Fassung siehst du unten. Deine Eingaben sind noch da – speichere erneut, wenn du sie übernehmen möchtest.";
