import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/time";
import type { CalendarDay } from "@/server/modules/health/queries";
import { monthGrid, shiftMonth } from "@/server/modules/health/validation";

const WEEKDAYS: [string, string][] = [
  ["Mo", "Montag"],
  ["Di", "Dienstag"],
  ["Mi", "Mittwoch"],
  ["Do", "Donnerstag"],
  ["Fr", "Freitag"],
  ["Sa", "Samstag"],
  ["So", "Sonntag"],
];

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
}

function dayText(day: CalendarDay | undefined) {
  if (!day) return "kein Eintrag";
  const parts = [];
  if (day.checkIn) parts.push("Check-in");
  if (day.diary > 0) parts.push(day.diary === 1 ? "1 Tagebucheintrag" : `${day.diary} Tagebucheinträge`);
  return parts.join(", ");
}

/**
 * Eigener Kalender (S21) als echte Tabelle (A01): Wochentage als Spaltenköpfe, jeder Tag mit
 * Textangabe. Symbole (Kreis = Check-in, Quadrat = Tagebuch) sind ergänzend, nicht nur Farbe.
 * Ein Tag mit Einträgen führt zum Verlauf genau dieses Tages.
 */
export function MonthCalendar({
  month,
  today,
  days,
  hrefForMonth,
}: {
  month: string;
  today: string;
  days: Record<string, CalendarDay>;
  hrefForMonth: (month: string) => string;
}) {
  const weeks = monthGrid(month);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const hasNext = next <= today.slice(0, 7);
  const label = monthLabel(month);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={hrefForMonth(prev)}
          className="inline-flex h-11 items-center gap-1.5 rounded-[11px] px-2 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink"
        >
          <Icon name="arrow-left" className="size-4" />
          <span>
            <span className="sr-only">Vorheriger Monat: </span>
            {monthLabel(prev).split(" ")[0]}
          </span>
        </Link>
        <p className="text-base font-semibold text-ink" aria-live="polite">
          {label}
        </p>
        {hasNext ? (
          <Link
            href={hrefForMonth(next)}
            className="inline-flex h-11 items-center gap-1.5 rounded-[11px] px-2 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink"
          >
            <span>
              <span className="sr-only">Nächster Monat: </span>
              {monthLabel(next).split(" ")[0]}
            </span>
            <Icon name="arrow-right" className="size-4" />
          </Link>
        ) : (
          <span className="w-16" aria-hidden="true" />
        )}
      </div>
      <div className="overflow-x-auto rounded-[16px] border border-line bg-surface p-2">
        <table className="w-full table-fixed border-separate border-spacing-1 text-center">
          <caption className="sr-only">Deine Einträge im {label}</caption>
          <thead>
            <tr>
              {WEEKDAYS.map(([short, long]) => (
                <th key={short} scope="col" className="pb-1 text-sm font-semibold text-ink-2">
                  <abbr title={long} className="no-underline">
                    {short}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((date, di) => {
                  if (!date) return <td key={di} aria-hidden="true" />;
                  const day = days[date];
                  const isToday = date === today;
                  const content = (
                    <>
                      <span className="tabular text-sm font-semibold" aria-hidden="true">{Number(date.slice(8))}</span>
                      <span className="flex h-2.5 items-center justify-center gap-1" aria-hidden="true">
                        {day?.checkIn && <span className="size-2 rounded-full bg-ink" />}
                        {day && day.diary > 0 && <span className="size-2 border border-ink" />}
                      </span>
                      <span className="sr-only">
                        {formatDate(date)}: {dayText(day)}
                        {isToday ? " (heute)" : ""}
                      </span>
                    </>
                  );
                  const base = cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] border",
                    isToday ? "border-ink" : "border-transparent",
                  );
                  return (
                    <td key={date} className="p-0" aria-current={isToday ? "date" : undefined}>
                      {day ? (
                        <Link
                          href={`/mein-ms/verlauf?zeitraum=eigen&von=${date}&bis=${date}`}
                          className={cn(base, "bg-sunk text-ink transition-colors hover:bg-raised")}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className={cn(base, date > today ? "text-ink-3" : "text-ink-2")}>{content}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-ink" aria-hidden="true" /> Check-in
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 border border-ink" aria-hidden="true" /> Tagebucheintrag
        </span>
        <span>Tage mit Einträgen führen zum Verlauf dieses Tages.</span>
      </p>
    </div>
  );
}
