import { eraseHealthAfterWithdrawal, purgeOldConsentProofs, runErasureRequest } from "@/server/modules/privacy/erasure";
import { expireExports, generateExport } from "@/server/modules/privacy/export";
import type { Handler, PeriodicTask } from "../types";

/**
 * Export und Löschung (PRI02–PRI06, AT09). Payloads enthalten nur IDs; jeder Handler
 * prüft Status und Kontozustand erneut und ist idempotent.
 */
export const privacyHandlers: Record<string, Handler> = {
  // DIA08, PRI03: JSON + Tagebuch-CSV erzeugen, verschlüsseln, ablegen, 24 h bereitstellen
  "export.generate": async ({ aggregateId, attempt }) => generateExport(aggregateId, attempt),
  // PRI04: Exportdateien nach sofortiger Datenbanklöschung entfernen
  "erasure.health": async ({ aggregateId }) => runErasureRequest(aggregateId),
  // PRI05: Teilschritte über alle Systeme, Abschlussbeleg, technischer Restdatensatz
  "erasure.account": async ({ aggregateId }) => runErasureRequest(aggregateId),
};

export const privacyTasks: PeriodicTask[] = [
  // PRD 11: Exporte höchstens 24 Stunden ab Bereitstellung
  { name: "privacy-expire-exports", everyMs: 10 * 60 * 1000, run: expireExports },
  // PRI02: Gesundheitsdaten binnen 30 Tagen nach Widerruf löschen
  { name: "privacy-health-withdrawal", everyMs: 6 * 60 * 60 * 1000, run: eraseHealthAfterWithdrawal },
  // PRD 11: Einwilligungsnachweise gelöschter Konten nach 3 Jahren entfernen
  { name: "privacy-consent-retention", everyMs: 24 * 60 * 60 * 1000, run: purgeOldConsentProofs },
];
