import { SegmentNav } from "@/components/ui/primitives";

/** Unterbereiche von S59 – nur die für die Rollen der Person berechtigten. */
export function AuditNav({ roles, active }: { roles: readonly string[]; active: "protokoll" | "rollen" | "sonderzugriff" }) {
  const has = (...r: string[]) => r.some((x) => roles.includes(x));
  const items = [
    has("admin", "privacy_officer") && { href: "/verwaltung/audit", label: "Zugriffsprotokoll", active: active === "protokoll" },
    has("admin") && { href: "/verwaltung/audit/rollen", label: "Rollen und Rechteprüfung", active: active === "rollen" },
    has("admin", "ops", "privacy_officer") && {
      href: "/verwaltung/audit/sonderzugriff",
      label: "Sonderzugriff",
      active: active === "sonderzugriff",
    },
  ].filter((i): i is { href: string; label: string; active: boolean } => Boolean(i));
  if (items.length < 2) return null;
  return <SegmentNav label="Bereiche von Rollen und Audit" items={items} />;
}
