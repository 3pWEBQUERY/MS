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
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/verwaltung", label: "Übersicht", icon: "dashboard", roles: "all", exact: true },
  { href: "/verwaltung/moderation", label: "Moderation", icon: "flag", roles: ["moderator", "moderation_lead"] },
  { href: "/verwaltung/mitglieder", label: "Mitglieder", icon: "user-cog", roles: ["moderation_lead", "admin"] },
  { href: "/verwaltung/gruppen", label: "Gruppen", icon: "users", roles: ["admin", "moderation_lead"] },
  { href: "/verwaltung/redaktion", label: "Redaktion", icon: "book", roles: ["editor", "medical_reviewer", "admin"] },
  { href: "/verwaltung/verzeichnis", label: "Verzeichnis", icon: "pin", roles: ["editor"] },
  { href: "/verwaltung/medien", label: "Medien", icon: "image", roles: ["editor", "admin"] },
  { href: "/verwaltung/datenschutz", label: "Datenschutz", icon: "shield", roles: ["privacy_officer"] },
  { href: "/verwaltung/audit", label: "Rollen und Audit", icon: "audit", roles: ["admin", "privacy_officer"] },
  { href: "/verwaltung/betrieb", label: "Betrieb", icon: "server", roles: ["ops", "admin"] },
];

export function sectionsFor(roles: readonly string[]): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => s.roles === "all" || s.roles.some((r) => roles.includes(r)));
}
