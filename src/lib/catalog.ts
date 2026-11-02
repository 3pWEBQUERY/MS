/**
 * Kontrollierte Listen und versionierte Skalentexte.
 * Skalentexte benötigen Fachprüfung Medizin und Nutzertest (DIA01, D02).
 */

export const SCALE_VERSION = "skalen-2026-11-v1";
export const TERMS_VERSION = "bedingungen-2026-11-v1";
export const PRIVACY_VERSION = "datenschutz-2026-11-v1";
export const HEALTH_CONSENT_VERSION = "gesundheit-2026-11-v1";
export const ANALYTICS_CONSENT_VERSION = "analytics-2026-11-v1";
export const COMMUNITY_RULES_VERSION = "regeln-2026-11-v1";

export const CANTONS = [
  ["AG", "Aargau"],
  ["AI", "Appenzell Innerrhoden"],
  ["AR", "Appenzell Ausserrhoden"],
  ["BE", "Bern"],
  ["BL", "Basel-Landschaft"],
  ["BS", "Basel-Stadt"],
  ["FR", "Freiburg"],
  ["GE", "Genf"],
  ["GL", "Glarus"],
  ["GR", "Graubünden"],
  ["JU", "Jura"],
  ["LU", "Luzern"],
  ["NE", "Neuenburg"],
  ["NW", "Nidwalden"],
  ["OW", "Obwalden"],
  ["SG", "St. Gallen"],
  ["SH", "Schaffhausen"],
  ["SO", "Solothurn"],
  ["SZ", "Schwyz"],
  ["TG", "Thurgau"],
  ["TI", "Tessin"],
  ["UR", "Uri"],
  ["VD", "Waadt"],
  ["VS", "Wallis"],
  ["ZG", "Zug"],
  ["ZH", "Zürich"],
] as const;

export type CantonCode = (typeof CANTONS)[number][0];
export const cantonName = (code: string | null | undefined) =>
  code === "CH" ? "Ganze Schweiz" : (CANTONS.find(([c]) => c === code)?.[1] ?? null);

/** Interessen aus kontrollierter Liste – keine Diagnose- oder Verlaufsmerkmale (ACC06). */
export const INTERESTS = [
  ["alltag", "Alltag organisieren"],
  ["beruf", "Beruf und Arbeit"],
  ["familie", "Familie und Beziehungen"],
  ["bewegung", "Bewegung und Sport"],
  ["ernaehrung", "Ernährung und Kochen"],
  ["kreativ", "Kreatives"],
  ["natur", "Natur und Draussen"],
  ["reisen", "Reisen und Mobilität"],
  ["lesen", "Lesen und Kultur"],
  ["neu", "Neu mit MS"],
  ["entspannung", "Entspannung und Ruhe"],
  ["recht", "Rechte und Versicherungen"],
] as const;

export const interestLabel = (code: string) => INTERESTS.find(([c]) => c === code)?.[1] ?? code;

export const ONBOARDING_GOALS = [
  ["festhalten", "Etwas für mich festhalten"],
  ["austausch", "Andere Menschen kennenlernen"],
  ["wissen", "Verlässliche Informationen finden"],
  ["unsicher", "Ich schaue mich erst einmal um"],
] as const;

/** Energie 0–10 (DIA01). 0 = niedrigste selbst berichtete Energie. */
export const ENERGY_SCALE = {
  min: 0,
  max: 10,
  label: "Energie",
  question: "Wie viel Energie hast du heute?",
  minText: "0 · keine Energie",
  maxText: "10 · sehr viel Energie",
  help: "Deine eigene Einschätzung. Es gibt keine richtige oder falsche Antwort.",
};

/** Stimmung 1–5 (DIA01). Kein diagnostischer Fragebogen. */
export const MOOD_SCALE = {
  min: 1,
  max: 5,
  label: "Stimmung",
  question: "Wie ist deine Stimmung gerade?",
  steps: ["1 · sehr gedrückt", "2 · eher gedrückt", "3 · ausgeglichen", "4 · eher gut", "5 · sehr gut"],
  help: "Eine kurze Momentaufnahme, kein Test.",
};

/** Fatigue 0–10 (DIA01, DIA03). 0 = keine selbst berichtete Fatigue. */
export const FATIGUE_SCALE = {
  min: 0,
  max: 10,
  label: "Fatigue",
  question: "Wie stark erlebst du Fatigue?",
  minText: "0 · keine Fatigue",
  maxText: "10 · sehr starke Fatigue",
  help: "Fatigue ist eine anhaltende Erschöpfung. Sie wird getrennt von deiner Energie erfasst.",
};

/** Symptomstärke 0–10 */
export const INTENSITY_SCALE = {
  min: 0,
  max: 10,
  label: "Stärke",
  minText: "0 · kaum spürbar",
  maxText: "10 · sehr stark",
};

/** Kuratierter Symptomkatalog – Bezeichnungen sind Alltagsbegriffe, keine Klassifikation. */
export const SYMPTOM_CATALOG_VERSION = "symptome-2026-11-v1";
export const SYMPTOM_CATALOG = [
  ["kribbeln", "Kribbeln oder Taubheit"],
  ["schmerzen", "Schmerzen"],
  ["sehen", "Sehstörungen"],
  ["gleichgewicht", "Gleichgewicht oder Schwindel"],
  ["muskelsteifheit", "Muskelsteifheit oder Krämpfe"],
  ["schwaeche", "Schwäche in Armen oder Beinen"],
  ["konzentration", "Konzentration oder Gedächtnis"],
  ["blase", "Blase oder Darm"],
  ["schlaf", "Schlafprobleme"],
  ["waerme", "Wärmeempfindlichkeit"],
  ["zittern", "Zittern"],
  ["stimmung", "Gedrückte Stimmung"],
] as const;

export const HELP_TOPICS = [
  ["beratung", "Beratung und Information"],
  ["arbeit", "Arbeit und Ausbildung"],
  ["finanzen", "Finanzen und Versicherungen"],
  ["recht", "Recht und Sozialversicherungen"],
  ["mobilitaet", "Mobilität und Wohnen"],
  ["psyche", "Psychische Gesundheit"],
  ["selbsthilfe", "Selbsthilfe und Austausch"],
  ["therapie", "Therapie und Rehabilitation"],
  ["entlastung", "Entlastung und Pflege"],
] as const;

export const REPORT_REASONS = [
  ["harassment", "Belästigung"],
  ["privacy", "Datenschutz verletzt"],
  ["dangerous_medical", "Gefährliche medizinische Behauptung"],
  ["spam_fraud", "Spam oder Betrug"],
  ["acute_danger", "Akute Gefahr"],
  ["other", "Sonstiges"],
] as const;

export const ROLE_LABELS: Record<string, string> = {
  moderator: "Moderation",
  moderation_lead: "Moderationsleitung",
  editor: "Redaktion",
  medical_reviewer: "Medizinische Prüfung",
  admin: "Administration",
  ops: "Technischer Betrieb",
  privacy_officer: "Datenschutzstelle",
};
