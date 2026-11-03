import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Themenfilter des Feeds (COM01): bewusst leiser als die Bereichsnavigation darüber.
 * Umbrechende Liste statt horizontalem Scrollen (A02), Touchziele 44px, aktive Auswahl
 * über Fläche und `aria-current` – nicht nur über Farbe.
 */
export function TopicFilter({
  items,
  label,
  className,
}: {
  items: { href: string; label: string; active?: boolean }[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="-ml-3 flex flex-wrap gap-x-1 gap-y-1">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={i.active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center rounded-[11px] px-3 text-[0.9375rem] font-medium transition-colors duration-150",
                i.active ? "bg-ink text-ink-inverse" : "text-ink-2 hover:bg-sunk hover:text-ink",
              )}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
