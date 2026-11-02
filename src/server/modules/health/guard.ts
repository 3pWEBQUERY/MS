import "server-only";
import { redirect } from "next/navigation";
import { utcOffsetMinutes } from "@/lib/time";
import { requireViewer, type Viewer } from "../../auth/viewer";
import { formatOffset } from "./validation";

/**
 * Seitenschutz für Mein MS: Anmeldung wie üblich; ohne Entscheidung zum Gesundheitsbereich
 * zuerst S08 (PRD 05 «Die erste Nutzung von Mein MS zeigt zunächst S08»).
 */
export async function requireHealthViewer(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.healthDecided) redirect("/mein-ms/aktivieren");
  return viewer;
}

/** «Europe/Zurich (UTC+01:00)» – sichtbare Zeitzone in Formularen (F02). */
export function timezoneLabel(viewer: Viewer, at: Date = new Date()): string {
  const tz = viewer.prefs.timezone;
  return `${tz} (${formatOffset(utcOffsetMinutes(at, tz))})`;
}
