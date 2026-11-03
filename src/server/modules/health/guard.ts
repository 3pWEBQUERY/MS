import "server-only";
import { redirect } from "next/navigation";
import { utcOffsetMinutes } from "@/lib/time";
import { currentPath, requireViewer, type Viewer } from "../../auth/viewer";
import { formatOffset, healthReturnPath } from "./validation";

/**
 * Seitenschutz für Mein MS: Anmeldung wie üblich; ohne Entscheidung zum Gesundheitsbereich
 * zuerst S08 (PRD 05 «Die erste Nutzung von Mein MS zeigt zunächst S08»).
 */
export async function requireHealthViewer(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.healthDecided) {
    // Nach der Zustimmung geht es direkt zur gewählten Erfassung weiter (F02, HOM03).
    const next = healthReturnPath(await currentPath());
    redirect(next ? `/mein-ms/aktivieren?weiter=${encodeURIComponent(next)}` : "/mein-ms/aktivieren");
  }
  return viewer;
}

/** «Europe/Zurich (UTC+01:00)» – sichtbare Zeitzone in Formularen (F02). */
export function timezoneLabel(viewer: Viewer, at: Date = new Date()): string {
  const tz = viewer.prefs.timezone;
  return `${tz} (${formatOffset(utcOffsetMinutes(at, tz))})`;
}
