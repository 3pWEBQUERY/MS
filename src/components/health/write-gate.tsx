import type { ReactNode } from "react";
import type { Viewer } from "@/server/auth/viewer";
import { hasHealthData, healthWriteEnabled } from "@/server/modules/health/queries";
import { HealthInactiveNotice, WriteDisabledNotice } from "./health-notices";

/**
 * Gemeinsame Sperrlogik für Formularseiten: ohne aktive Einwilligung (Widerruf/Ablehnung)
 * oder bei abgeschaltetem «health_write» (HOM08) erscheint ein Hinweis statt des Formulars.
 * Die Server Actions prüfen dasselbe zusätzlich selbst.
 */
export async function writeBlocker(viewer: Viewer): Promise<ReactNode | null> {
  if (!viewer.healthActive) return <HealthInactiveNotice hasData={await hasHealthData(viewer)} />;
  if (!(await healthWriteEnabled())) return <WriteDisabledNotice />;
  return null;
}
