import { SegmentNav } from "@/components/ui/primitives";

/** Unterbereiche von S60 Betrieb und Konfiguration. */
export function OpsSubNav({ active }: { active: "betrieb" | "einfuehrung" | "einladungen" | "nutzung" }) {
  return (
    <SegmentNav
      label="Bereiche von Betrieb"
      items={[
        { href: "/verwaltung/betrieb", label: "Status und Schalter", active: active === "betrieb" },
        { href: "/verwaltung/betrieb/einfuehrung", label: "Einführung und Stoppkriterien", active: active === "einfuehrung" },
        { href: "/verwaltung/betrieb/einladungen", label: "Einladungen", active: active === "einladungen" },
        { href: "/verwaltung/betrieb/nutzung", label: "Nutzungsstatistik", active: active === "nutzung" },
      ]}
    />
  );
}

/** Lesbare Alarmcodes (NFR16, NFR19) – Codes stammen aus src/server/modules/admin/ops-alarms.ts. */
export const ALARM_LABEL: Record<string, string> = {
  queue_age: "Warteschlange älter als 15 Minuten",
  outbox_dead_letters: "Ereignisse in der Fehlerwarteschlange",
  delivery_dead: "Aufgegebene Zustellungen",
  privacy_request_failed: "Fehlgeschlagene Datenschutzaufträge",
  safety_verification_overdue: "Hilfewege mit überfälliger Verifikation",
  http_5xx_rate: "Fehlerquote der Web-App über 2 % (5 Minuten)",
  worker_inactive: "Hintergrundarbeiter ohne Lebenszeichen",
};
