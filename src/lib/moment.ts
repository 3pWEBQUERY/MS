/**
 * Mein Moment (HOM02): drei Absichten mit je höchstens drei Zielen. Die Regeln sind
 * redaktionell versioniert (content.moment_rules); dies ist die Standardfassung.
 * Keine Ableitung aus dem Tagebuch, keine Bewertung, keine Speicherung als Profil.
 */
export type MomentIntent = "record" | "connect" | "learn";

export type MomentTarget = {
  label: string;
  description: string;
  href: string;
  /** Ziel nur zeigen, wenn der Gesundheitsbereich aktiv bzw. nicht abgelehnt ist */
  requires?: "health";
  icon: "notebook" | "battery" | "activity" | "users" | "chat" | "book" | "lifebuoy" | "search" | "message";
};

export type MomentConfig = Record<MomentIntent, MomentTarget[]>;

export const MOMENT_INTENTS: { key: MomentIntent; label: string; description: string }[] = [
  { key: "record", label: "Etwas festhalten", description: "Kurz notieren, wie es dir geht" },
  { key: "connect", label: "Austausch finden", description: "Gruppen und bekannte Kontakte" },
  { key: "learn", label: "Wissen oder Hilfe finden", description: "Geprüfte Artikel und Angebote" },
];

export const DEFAULT_MOMENT_CONFIG: MomentConfig = {
  record: [
    { label: "Tages-Check-in", description: "Energie, Stimmung oder Fatigue – eine Angabe genügt", href: "/mein-ms/check-in", requires: "health", icon: "battery" },
    { label: "Symptom festhalten", description: "Mit Stärke, optional Dauer und Notiz", href: "/mein-ms/eintrag/neu", requires: "health", icon: "activity" },
    { label: "Fatigue notieren", description: "Getrennt von deiner Energie", href: "/mein-ms/fatigue/neu", requires: "health", icon: "notebook" },
  ],
  connect: [
    { label: "Gruppen entdecken", description: "Betreute offene und geschlossene Gruppen", href: "/community/gruppen", icon: "users" },
    { label: "Community-Feed", description: "Neueste Beiträge, chronologisch", href: "/community", icon: "message" },
    { label: "Meine Kontakte", description: "Gespräche mit bestätigten Kontakten", href: "/community/kontakte", icon: "chat" },
  ],
  learn: [
    { label: "Wissen", description: "Fachlich geprüfte Artikel mit Quellen", href: "/wissen", icon: "book" },
    { label: "Hilfe in der Schweiz", description: "Nach Thema und Kanton filtern", href: "/hilfe", icon: "lifebuoy" },
    { label: "Suchen", description: "Wissen, Hilfe und Community", href: "/suche", icon: "search" },
  ],
};

/** Liefert höchstens drei gültige Ziele für eine Absicht. */
export function resolveMoment(config: MomentConfig, intent: MomentIntent, opts: { healthActive: boolean; healthDeclined: boolean }) {
  return (config[intent] ?? [])
    .filter((t) => (t.requires === "health" ? !opts.healthDeclined || opts.healthActive : true))
    .slice(0, 3)
    .map((t) => (t.requires === "health" && !opts.healthActive ? { ...t, href: "/mein-ms/aktivieren" } : t));
}
