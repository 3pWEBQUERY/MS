import { SegmentNav } from "@/components/ui/primitives";

/** Unterbereiche von Konto und Einstellungen (Profilmenü, PRD 04). */
const ITEMS = [
  { key: "konto", href: "/konto", label: "Konto" },
  { key: "sicherheit", href: "/konto/sicherheit", label: "Sicherheit" },
  { key: "privatsphaere", href: "/konto/privatsphaere", label: "Privatsphäre" },
  { key: "mitteilungen", href: "/konto/mitteilungen", label: "Benachrichtigungen" },
  { key: "anzeige", href: "/konto/anzeige", label: "Anzeige" },
  { key: "daten", href: "/konto/daten", label: "Daten und Konto" },
] as const;

export type AccountSection = (typeof ITEMS)[number]["key"];

export function AccountNav({ current, className }: { current: AccountSection; className?: string }) {
  return (
    <SegmentNav
      label="Einstellungen"
      className={className}
      items={ITEMS.map((i) => ({ href: i.href, label: i.label, active: i.key === current }))}
    />
  );
}
