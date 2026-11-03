import { COMMUNITY_RULES_VERSION } from "./catalog";

/**
 * Nachvollziehbare Fassungen der Community-Regeln (SAF07 «Regeländerung wird nachvollziehbar
 * angezeigt»). Neueste Fassung zuerst; die erste Zeile muss COMMUNITY_RULES_VERSION entsprechen.
 * Bei jeder neuen Fassung hier eine kurze, verständliche Zusammenfassung der Änderungen ergänzen –
 * Mitglieder sehen sie vor der erneuten Bestätigung. Der Volltext steht unter /regeln (S50).
 */
export type RulesRevision = { version: string; validFrom: string; changes: string[] };

export const COMMUNITY_RULES_HISTORY: readonly RulesRevision[] = [
  {
    version: "regeln-2026-11-v1",
    validFrom: "2026-11-01",
    changes: ["Erste Fassung der Community-Regeln für den betreuten Pilot."],
  },
];

/** Änderungen seit der zuletzt bestätigten Fassung (neueste zuerst); leer, wenn aktuell oder unbekannt. */
export function rulesChangesSince(acceptedVersion: string | null | undefined): RulesRevision[] {
  if (!acceptedVersion || acceptedVersion === COMMUNITY_RULES_VERSION) return [];
  const idx = COMMUNITY_RULES_HISTORY.findIndex((r) => r.version === acceptedVersion);
  // Unbekannte ältere Fassung: alle bekannten Änderungen zeigen.
  return idx === -1 ? [...COMMUNITY_RULES_HISTORY] : COMMUNITY_RULES_HISTORY.slice(0, idx);
}
