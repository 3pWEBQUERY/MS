import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/time";
import type { EntrySummary } from "@/server/modules/health/queries";
import { KIND_LABEL, type EntryKind } from "./format";

const KIND_ICON: Record<EntryKind, IconName> = { checkin: "battery", symptom: "activity", fatigue: "notebook" };

const part = (date: string, opts: Intl.DateTimeFormatOptions) =>
  formatDate(date, undefined, { day: undefined, month: undefined, year: undefined, ...opts });

/**
 * Liste eigener Einträge (S18, S21) im Tagebuch-Raster: links das Datum als Serif-Ziffer,
 * rechts Art und Werte. Check-ins und Tagebucheinträge unterscheidbar über Text und Symbol,
 * Werte neutral ohne Bewertung (DIA06, DIA07). Der vollständige Datumstext steht für
 * Screenreader im Link.
 */
export function EntryList({ entries, compact = false }: { entries: EntrySummary[]; compact?: boolean }) {
  return (
    <ul className="border-t border-line">
      {entries.map((e) => (
        <li key={e.key} className="border-b border-line">
          <Link
            href={e.href}
            data-focus-inset
            className={cn(
              "group grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-start gap-x-5 transition-colors duration-150 hover:bg-raised sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-x-8",
              compact ? "py-4 sm:py-5" : "py-5 sm:py-6",
            )}
          >
            <span aria-hidden="true" className="flex flex-col items-start leading-none">
              <span className="font-display text-[2.25rem] tracking-[-0.03em] text-ink sm:text-[2.75rem]">{part(e.localDate, { day: "numeric" })}</span>
              <span className="mt-1.5 font-display font-extrabold text-[0.75rem] uppercase tracking-[0.1em] text-ink-3">
                {part(e.localDate, { weekday: "short" })} · {part(e.localDate, { month: "short" })}
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-1.5 pt-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Icon name={KIND_ICON[e.kind]} className="size-4 text-accent-ink" />
                <span className="font-semibold text-ink">{KIND_LABEL[e.kind]}</span>
                <span className="sr-only">
                  {formatDate(e.localDate, undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                {e.localTime && <span className="font-mono text-sm text-ink-3">{e.localTime}</span>}
              </span>
              {e.values.length > 0 && <span className="break-words text-base text-ink-2">{e.values.join(" · ")}</span>}
              {e.hasNote && (
                // Optionale Metadaten – in der einfachen Ansicht ausgeblendet (HOM06)
                <span className="text-sm text-ink-3" data-optional>
                  Mit Notiz
                </span>
              )}
            </span>
            <Icon name="arrow-right" className="nudge mt-2 size-5 shrink-0 text-ink-3 group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
