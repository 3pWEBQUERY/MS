/** Arbeitstitel – Produktname ist offene Entscheidung D09. */
export const site = {
  name: "MS Plattform",
  shortName: "MS Plattform",
  tagline: "Ruhig dokumentieren. Sicher austauschen. Verlässlich informiert.",
  description:
    "Eine barrierearme Plattform für Erwachsene mit Multipler Sklerose in der Deutschschweiz: freiwillige Alltagsdokumentation, moderierter Austausch, geprüftes Wissen und Schweizer Hilfsangebote.",
  moderationHours: "täglich 09–18 Uhr",
  contactEmail: "kontakt@example.ch",
};

/** Hauptnavigation (PRD 04) */
export const MAIN_NAV = [
  { href: "/heute", label: "Heute", icon: "home" },
  { href: "/community", label: "Community", icon: "users" },
  { href: "/mein-ms", label: "Mein MS", icon: "notebook" },
  { href: "/wissen", label: "Wissen", icon: "book" },
  { href: "/hilfe", label: "Hilfe", icon: "lifebuoy" },
] as const;

export const PUBLIC_NAV = [
  { href: "/wissen", label: "Wissen" },
  { href: "/hilfe", label: "Hilfe finden" },
  { href: "/sicherheit", label: "Sicherheit" },
  { href: "/regeln", label: "Regeln" },
] as const;
