/**
 * Produktanalytics (PRD 15) – clientsichere Definitionen ohne Serverabhängigkeiten.
 *
 * – standardmässig aus; nur mit eigener, unvorausgewählter Einwilligung (Zweck «analytics», PRI01)
 * – ausschliesslich die fünf Ereignisse des Ereignisplans mit den dort erlaubten Parametern
 * – keine Suchtexte, Pseudonyme, Inhalte, Objekt-, Themen- oder Gruppen-IDs, keine Symptomwerte
 * – zufälliger Analysebezug mit höchstens 30 Tagen Lebensdauer, Ausgaben erst ab zehn Personen
 */

export const ANALYTICS_EVENTS = [
  "onboarding_completed",
  "moment_path_selected",
  "useful_action_completed",
  "core_flow_failed",
  "preference_changed",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/** Lebensdauer des Analysebezugs und der Rohdaten (PRD 15). */
export const ANALYTICS_RETENTION_DAYS = 30;
/** Mindestanzahl Personen je ausgegebener Zelle (PRD 15). */
export const ANALYTICS_MIN_PERSONS = 10;

/** Aktuelle Oberflächenversion für onboarding_completed (Parameter «UI-Version»). */
export const ANALYTICS_UI_VERSION = "2026-11";

export const ONBOARDING_VARIANTS = ["standard"] as const;
export const MOMENT_PATHS = ["record", "connect", "learn"] as const;
/** Generische Aktionstypen der Kennzahl «Erste nützliche Aktion» – ohne Objektbezug. */
export const USEFUL_ACTIONS = ["article_opened", "offer_opened", "group_joined", "entry_saved"] as const;
export const CORE_FLOWS = ["F01", "F02", "F03", "F04", "F05", "F06", "F07"] as const;
/** Technische Fehlercodes – nie Freitext oder Fehlermeldungen. */
export const FLOW_ERROR_CODES = ["server_error", "network", "timeout", "conflict", "unavailable"] as const;
export const PREFERENCE_TYPES = ["display", "analytics"] as const;

export type UsefulAction = (typeof USEFUL_ACTIONS)[number];
export type CoreFlow = (typeof CORE_FLOWS)[number];
export type FlowErrorCode = (typeof FLOW_ERROR_CODES)[number];

export type AnalyticsEvent =
  | { name: "onboarding_completed"; params: { variant: (typeof ONBOARDING_VARIANTS)[number]; uiVersion: string } }
  | { name: "moment_path_selected"; params: { path: (typeof MOMENT_PATHS)[number] } }
  | { name: "useful_action_completed"; params: { action: UsefulAction; success: boolean } }
  | { name: "core_flow_failed"; params: { flow: CoreFlow; code: FlowErrorCode } }
  | { name: "preference_changed"; params: { type: (typeof PREFERENCE_TYPES)[number] } };

/** Was der Browser selbst melden darf; alles andere entsteht serverseitig nach bestätigter Aktion. */
const CLIENT_ALLOWED: Partial<Record<AnalyticsEventName, (p: Record<string, unknown>) => boolean>> = {
  moment_path_selected: () => true,
  useful_action_completed: (p) => p.action === "article_opened" || p.action === "offer_opened",
  core_flow_failed: (p) => p.code === "network",
};

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/**
 * Prüft ein Ereignis gegen den Ereignisplan. Unbekannte Ereignisse, zusätzliche oder fremde
 * Parameter führen zur Ablehnung (nicht zum stillen Kürzen), damit kein Feld unbemerkt mitläuft.
 */
export function parseAnalyticsEvent(input: unknown, source: "client" | "server" = "server"): AnalyticsEvent | null {
  if (!input || typeof input !== "object") return null;
  const { name, params, ...rest } = input as { name?: unknown; params?: unknown };
  if (Object.keys(rest).length > 0) return null;
  if (!oneOf(ANALYTICS_EVENTS, name)) return null;
  if (!params || typeof params !== "object" || Array.isArray(params)) return null;
  const p = params as Record<string, unknown>;
  const keys = Object.keys(p).sort().join(",");

  let event: AnalyticsEvent | null = null;
  switch (name) {
    case "onboarding_completed":
      if (keys === "uiVersion,variant" && oneOf(ONBOARDING_VARIANTS, p.variant) && p.uiVersion === ANALYTICS_UI_VERSION)
        event = { name, params: { variant: p.variant, uiVersion: p.uiVersion } };
      break;
    case "moment_path_selected":
      if (keys === "path" && oneOf(MOMENT_PATHS, p.path)) event = { name, params: { path: p.path } };
      break;
    case "useful_action_completed":
      if (keys === "action,success" && oneOf(USEFUL_ACTIONS, p.action) && typeof p.success === "boolean")
        event = { name, params: { action: p.action, success: p.success } };
      break;
    case "core_flow_failed":
      if (keys === "code,flow" && oneOf(CORE_FLOWS, p.flow) && oneOf(FLOW_ERROR_CODES, p.code)) event = { name, params: { flow: p.flow, code: p.code } };
      break;
    case "preference_changed":
      if (keys === "type" && oneOf(PREFERENCE_TYPES, p.type)) event = { name, params: { type: p.type } };
      break;
  }
  if (!event) return null;
  if (source === "client" && !CLIENT_ALLOWED[event.name]?.(event.params as Record<string, unknown>)) return null;
  return event;
}

/** Stabiler Schlüssel: dieselbe Angabe zählt je Person und Tag höchstens einmal (Datensparsamkeit). */
export function analyticsDedupeKey(event: AnalyticsEvent): string {
  const p = event.params as Record<string, string | boolean>;
  const parts = Object.keys(p)
    .sort()
    .map((k) => `${k}=${String(p[k])}`);
  return [event.name, ...parts].join("|");
}

/** Zelle ausgeben oder unterdrücken (PRD 15: erst ab zehn Personen). */
export function suppressSmall(persons: number, min = ANALYTICS_MIN_PERSONS): number | null {
  return Number.isFinite(persons) && persons >= min ? persons : null;
}

/** Anteil nur, wenn Basis und Zähler je mindestens zehn Personen umfassen. */
export function suppressedShare(part: number, base: number, min = ANALYTICS_MIN_PERSONS): number | null {
  if (!(base >= min) || !(part >= min) || part > base) return null;
  return Math.round((part / base) * 1000) / 10;
}

/** Lesbare Bezeichnungen für die Aggregatansicht. */
export const ANALYTICS_LABELS: Record<string, string> = {
  onboarding_completed: "Einführung abgeschlossen",
  moment_path_selected: "Mein Moment: Weg gewählt",
  useful_action_completed: "Nützliche Aktion",
  core_flow_failed: "Kernablauf fehlgeschlagen",
  preference_changed: "Einstellung geändert",
  record: "Etwas festhalten",
  connect: "Austausch finden",
  learn: "Wissen oder Hilfe finden",
  article_opened: "Artikel geöffnet",
  offer_opened: "Angebot geöffnet",
  group_joined: "Gruppe beigetreten",
  entry_saved: "Eigener Eintrag gespeichert",
  display: "Anzeige",
  analytics: "Nutzungsstatistik",
  standard: "Standard",
  server_error: "Serverfehler",
  network: "Netzwerk",
  timeout: "Zeitüberschreitung",
  conflict: "Konflikt",
  unavailable: "Nicht verfügbar",
};
