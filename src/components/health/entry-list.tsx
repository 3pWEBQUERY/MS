import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/time";
import type { EntrySummary } from "@/server/modules/health/queries";
import { KIND_LABEL, type EntryKind } from "./format";

const KIND_ICON: Record<EntryKind, IconName> = { checkin: "battery", symptom: "activity", fatigue: "notebook" };

/**
 * Liste eigener Einträge (S18, S21): Check-ins und Tagebucheinträge unterscheidbar über
 * Text und Symbol, Werte neutral ohne Bewertung (DIA06, DIA07).
 */
export function EntryList({ entries, compact = false }: { entries: EntrySummary[]; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {entries.map((e) => (
        <li key={e.key}>
          <Link
            href={e.href}
            className={cn(
              "group flex items-start gap-4 rounded-[20px] border border-line bg-surface transition-colors duration-150 hover:border-line-2 hover:bg-raised",
              compact ? "p-4" : "p-5",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-sunk text-ink-2">
              <Icon name={KIND_ICON[e.kind]} className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-semibold text-ink">{KIND_LABEL[e.kind]}</span>
                <span className="text-sm text-ink-2">
                  {formatDate(e.localDate, undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                  {e.localTime ? `, ${e.localTime}` : ""}
                </span>
              </span>
              {e.values.length > 0 && (
                <span className="break-words text-base text-ink-2">{e.values.join(" · ")}</span>
              )}
              {e.hasNote && <span className="text-sm text-ink-2">Mit Notiz</span>}
            </span>
            <Icon name="chevron-right" className="mt-2.5 size-5 shrink-0 text-ink-3 group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
