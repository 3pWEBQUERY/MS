import { SegmentNav } from "@/components/ui/primitives";

export type CommunitySection = "feed" | "gruppen" | "meine-gruppen" | "kontakte" | "gespraeche";

const ITEMS: { key: CommunitySection; href: string; label: string }[] = [
  { key: "feed", href: "/community", label: "Feed" },
  { key: "gruppen", href: "/community/gruppen", label: "Gruppen" },
  { key: "meine-gruppen", href: "/community/meine-gruppen", label: "Meine Gruppen" },
  { key: "kontakte", href: "/community/kontakte", label: "Kontakte" },
  { key: "gespraeche", href: "/community/gespraeche", label: "Gespräche" },
];

/**
 * Unterbereiche der Community (PRD 04: Gespräche und Gruppen liegen unter Community).
 * Wird auch vom Messaging-Modul verwendet (Kontakte, Gespräche, Blockierliste).
 */
export function CommunityNav({ active, className }: { active: CommunitySection; className?: string }) {
  return (
    <SegmentNav
      label="Bereiche der Community"
      className={className ?? "mb-8"}
      items={ITEMS.map((i) => ({ href: i.href, label: i.label, active: i.key === active }))}
    />
  );
}
