import type { IconName } from "@/components/ui/icon";
import type { StaffRoleKey } from "./labels";

/**
 * Bereiche der Verwaltung (S52–S60). Mitarbeitende sehen nur ihre Aufgabenbereiche (PRD 05).
 * Die Navigation ist keine Zugriffskontrolle – jede Seite prüft selbst mit requireStaff().
 */
export type AdminSection = {
  href: string;
  label: string;
  icon: IconName;
  roles: StaffRoleKey[] | "all";
  exact?: boolean;
  /** Gruppe in der Seitenleiste (Mono-Abschnittsbeschriftung, rein visuell) */
  group: AdminNavGroup;
};

export type AdminNavGroup = "Arbeitsplatz" | "Community" | "Inhalte" | "Aufsicht";

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/verwaltung", label: "Übersicht", icon: "dashboard", roles: "all", exact: true, group: "Arbeitsplatz" },
  { href: "/verwaltung/moderation", label: "Moderation", icon: "flag", roles: ["moderator", "moderation_lead"], group: "Community" },
  { href: "/verwaltung/mitglieder", label: "Mitglieder", icon: "user-cog", roles: ["moderation_lead", "admin"], group: "Community" },
  { href: "/verwaltung/gruppen", label: "Gruppen", icon: "users", roles: ["admin", "moderation_lead"], group: "Community" },
  { href: "/verwaltung/redaktion", label: "Redaktion", icon: "book", roles: ["editor", "medical_reviewer", "admin"], group: "Inhalte" },
  { href: "/verwaltung/verzeichnis", label: "Verzeichnis", icon: "pin", roles: ["editor"], group: "Inhalte" },
  { href: "/verwaltung/medien", label: "Medien", icon: "image", roles: ["editor", "admin"], group: "Inhalte" },
  { href: "/verwaltung/datenschutz", label: "Datenschutz", icon: "shield", roles: ["privacy_officer"], group: "Aufsicht" },
  { href: "/verwaltung/audit", label: "Rollen und Audit", icon: "audit", roles: ["admin", "privacy_officer"], group: "Aufsicht" },
  { href: "/verwaltung/betrieb", label: "Betrieb", icon: "server", roles: ["ops", "admin"], group: "Aufsicht" },
];

export function sectionsFor(roles: readonly string[]): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => s.roles === "all" || s.roles.some((r) => roles.includes(r)));
}
