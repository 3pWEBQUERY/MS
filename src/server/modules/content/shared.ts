/**
 * Clientsichere Konstanten des Inhaltsmoduls (keine Serverabhängigkeiten).
 * Von Formularen (Client) und Server Actions gemeinsam genutzt.
 */

export type ArticleStatus = "draft" | "in_review" | "changes_requested" | "approved" | "published" | "withdrawn" | "archived";
export type OfferStatus = "draft" | "in_review" | "published" | "hidden" | "expired";

/** CON02: Zustände des Artikel-Lebenszyklus */
export const ARTICLE_STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  changes_requested: "Änderungen nötig",
  approved: "Freigegeben",
  published: "Publiziert",
  withdrawn: "Zurückgezogen",
  archived: "Archiviert",
};

export const EDITABLE_STATUSES: ArticleStatus[] = ["draft", "changes_requested"];

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  draft: "Entwurf",
  in_review: "Bereit zur Publikation",
  published: "Publiziert",
  hidden: "Ausgeblendet",
  expired: "Prüfung abgelaufen",
};

/** CON06: Kategorien des Kontaktformulars */
export const CONTACT_CATEGORIES = [
  ["produkt", "Frage oder Anliegen zur Plattform"],
  ["artikel", "Fehler in einem Wissensartikel"],
  ["angebot", "Hinweis zu einem Hilfsangebot"],
  ["barriere", "Barriere melden"],
  ["datenschutz", "Datenschutz und meine Rechte"],
  ["sonstiges", "Sonstiges"],
] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number][0];
export const contactCategoryLabel = (c: string) => CONTACT_CATEGORIES.find(([k]) => k === c)?.[1] ?? c;
export const CONTACT_MAX = 2000;

export const LANGUAGES = [
  ["de", "Deutsch"],
  ["fr", "Französisch"],
  ["it", "Italienisch"],
  ["rm", "Rätoromanisch"],
  ["en", "Englisch"],
] as const;
export const languageLabel = (c: string) => LANGUAGES.find(([k]) => k === c)?.[1] ?? c;

/** CON05/SAF06: Prüfverfahren für Angebote und Hilfewege */
export const VERIFY_METHODS = [
  ["website", "Abgleich mit der offiziellen Website des Anbieters"],
  ["provider_written", "Schriftliche Bestätigung durch den Anbieter"],
  ["provider_phone", "Telefonische Bestätigung durch den Anbieter"],
  ["expert_social", "Fachprüfung Sozialversicherungen und Recht"],
  ["expert_medical", "Fachprüfung Medizin"],
  ["expert_crisis", "Fachprüfung Krisenintervention"],
] as const;
export const verifyMethodLabel = (c: string) => VERIFY_METHODS.find(([k]) => k === c)?.[1] ?? c;

/**
 * CON05: Medizinische und sozialrechtliche Leistungsangaben brauchen die passende Fachprüfung.
 * Themen «Recht/Sozialversicherungen» und «Finanzen/Versicherungen» → Fachprüfung Sozialversicherungen
 * und Recht; «Therapie und Rehabilitation» → Fachprüfung Medizin.
 */
const EXPERT_BY_TOPIC: Record<string, "expert_social" | "expert_medical"> = {
  recht: "expert_social",
  finanzen: "expert_social",
  therapie: "expert_medical",
};

export function requiredExpertMethods(topicSlugs: readonly string[]): ("expert_social" | "expert_medical")[] {
  return [...new Set(topicSlugs.map((t) => EXPERT_BY_TOPIC[t]).filter((m): m is "expert_social" | "expert_medical" => Boolean(m)))].sort();
}

/** Fehlende Fachprüfungen anhand gültiger Prüfnachweise (Verfahren mit nächstem Termin in der Zukunft). */
export function missingExpertMethods(topicSlugs: readonly string[], validMethods: readonly string[]): string[] {
  return requiredExpertMethods(topicSlugs).filter((m) => !validMethods.includes(m));
}

/** SAF06/PRD 09: Kritische Kontaktwege nur mit fachlicher Verifikation (Krisenintervention oder Medizin). */
export const SAFETY_EXPERT_METHODS = ["expert_crisis", "expert_medical"] as const;

/** Fristen */
export const ARTICLE_REVIEW_MAX_MONTHS = 12; // CON03
export const OFFER_REVIEW_MAX_MONTHS = 6; // CON05
export const SAFETY_REVIEW_MAX_DAYS = 31; // SAF06: monatlich

export const MOMENT_ICON_OPTIONS = [
  ["notebook", "Notizbuch"],
  ["battery", "Energie"],
  ["activity", "Aktivität"],
  ["users", "Gruppen"],
  ["chat", "Gespräch"],
  ["message", "Beitrag"],
  ["book", "Wissen"],
  ["lifebuoy", "Hilfe"],
  ["search", "Suche"],
] as const;
