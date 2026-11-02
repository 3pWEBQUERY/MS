import { formatDate } from "@/lib/time";
import type { HistoryData } from "@/server/modules/health/queries";
import { daysBetween } from "@/server/modules/health/validation";
import { durationText, valueText } from "./format";

export type SeriesKey = "energy" | "mood" | "fatigue_checkin" | "fatigue_diary" | "symptom";

/** Eine Tabellenzeile = höchstens eine Markierung im Diagramm (US08, DIA06). */
export type HistoryRow = {
  key: string;
  series: SeriesKey;
  /** Symptombezeichnung für den Filter */
  symptom?: string;
  date: string;
  dateLabel: string;
  time: string | null;
  /** Position in Tagen ab Zeitraumbeginn */
  x: number;
  /** null = nicht erfasst (keine Markierung) */
  value: number | null;
  source: "Check-in" | "Tagebuch";
  measure: string;
  valueText: string;
  href: string;
};

/**
 * Wandelt eigene Einträge in Einzelwerte um – ohne Auffüllen fehlender Tage, ohne Glättung,
 * ohne Zusammenfassung (DIA06, DIA07). Check-ins zeigen nicht erfasste Angaben als Zeile
 * «nicht erfasst», aber ohne Markierung.
 */
export function buildHistoryRows(data: HistoryData, from: string): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const c of data.checkIns) {
    const day = daysBetween(from, c.localDate);
    const base = {
      date: c.localDate,
      dateLabel: formatDate(c.localDate, undefined, { day: "2-digit", month: "2-digit", year: "numeric" }),
      time: null,
      x: day + 0.5,
      source: "Check-in" as const,
      href: `/mein-ms/check-in/${c.localDate}`,
    };
    rows.push(
      { ...base, key: `c:${c.id}:e`, series: "energy", value: c.energy, measure: "Energie", valueText: valueText("energy", c.energy) },
      { ...base, key: `c:${c.id}:m`, series: "mood", value: c.mood, measure: "Stimmung", valueText: valueText("mood", c.mood) },
      {
        ...base,
        key: `c:${c.id}:f`,
        series: "fatigue_checkin",
        value: c.fatigue,
        measure: "Fatigue",
        valueText: valueText("fatigue", c.fatigue),
      },
    );
  }
  for (const d of data.diary) {
    const [hh, mm] = d.localTime.split(":").map(Number);
    const base = {
      date: d.localDate,
      dateLabel: formatDate(d.localDate, undefined, { day: "2-digit", month: "2-digit", year: "numeric" }),
      time: d.localTime,
      x: daysBetween(from, d.localDate) + (hh * 60 + mm) / 1440,
      source: "Tagebuch" as const,
      href: `/mein-ms/eintrag/${d.id}`,
    };
    if (d.kind === "fatigue")
      rows.push({
        ...base,
        key: `d:${d.id}:f`,
        series: "fatigue_diary",
        value: d.fatigue,
        measure: "Fatigue",
        valueText: valueText("fatigue", d.fatigue),
      });
    for (const o of d.observations) {
      const dur = durationText(o.durationMinutes);
      rows.push({
        ...base,
        key: `d:${d.id}:${o.id}`,
        series: "symptom",
        symptom: o.label,
        value: o.intensity,
        measure: `Symptom: ${o.label}`,
        valueText: `Stärke ${valueText("intensity", o.intensity)}${dur ? ` · Dauer ${dur}` : ""}`,
      });
    }
  }
  const order: Record<SeriesKey, number> = { energy: 0, mood: 1, fatigue_checkin: 2, fatigue_diary: 3, symptom: 4 };
  // Tabelle chronologisch: Datum, dann der Tages-Check-in, dann Tagebuch nach Uhrzeit.
  return rows.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time ?? "").localeCompare(b.time ?? "") ||
      order[a.series] - order[b.series],
  );
}
