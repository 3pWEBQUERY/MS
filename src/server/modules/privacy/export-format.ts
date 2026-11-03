/**
 * Formathilfen für den Datenexport (PRI03, DIA08): ISO-Zeitpunkte, Messwerte mit
 * «erfasst»-Kennzeichen und die Tagebuch-CSV mit CSV-Injection-Schutz.
 * Reine Funktionen ohne Datenbankzugriff – direkt testbar.
 */

export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Nicht erfasst ist null mit «erfasst: false»; 0 ist ein erfasster Wert (PRD 09 «Null und Wert»). */
export const measure = (value: number | null, skala: string) => ({ wert: value, erfasst: value !== null, skala });

/* ───────────────────────── CSV (CSV-Injection-Schutz) ───────────────────────── */

/** Zellen, die mit = + - @ Tab oder CR beginnen, werden mit ' entschärft; Zahlen bleiben Zahlen. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvLine(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(";");
}

export const CSV_HEADER = [
  "typ",
  "eintrag_id",
  "lokales_datum",
  "lokale_zeit",
  "zeitzone",
  "utc_offset_minuten",
  "beobachtet_utc",
  "energie_0_10",
  "stimmung_1_5",
  "fatigue_0_10",
  "symptom",
  "symptom_staerke_0_10",
  "symptom_dauer_minuten",
  "schlafbeobachtung",
  "notiz",
  "skalenfassung",
  "quelle",
  "erfasst_am_utc",
];

/** Bereits entschlüsselte Tagebuchzeilen – Eingabe für die CSV. */
export type CsvCheckIn = {
  id: string;
  localDate: string;
  timezone: string;
  utcOffsetMinutes: number;
  energy: number | null;
  mood: number | null;
  fatigue: number | null;
  note: string | null;
  scaleVersion: string;
  createdAt: Date;
};

export type CsvObservation = { label: string; intensity: number | null; durationMinutes: number | null };

export type CsvEntry = {
  id: string;
  kind: string;
  observedAt: Date;
  localDate: string;
  localTime: string;
  timezone: string;
  utcOffsetMinutes: number;
  fatigue: number | null;
  sleepNote: string | null;
  note: string | null;
  scaleVersion: string;
  createdAt: Date;
  observations: CsvObservation[];
};

/**
 * Tagebuch-CSV: eine Zeile je Check-in bzw. je Symptom eines Eintrags; leere Zelle = nicht erfasst.
 * Mit BOM, damit Tabellenprogramme Umlaute korrekt anzeigen; Trennzeichen Semikolon, Zeilenende CRLF.
 */
export function buildDiaryCsv(checkIns: CsvCheckIn[], entries: CsvEntry[]): string {
  const lines = [csvLine(CSV_HEADER)];
  for (const c of checkIns) {
    lines.push(
      csvLine([
        "check_in",
        c.id,
        c.localDate,
        null,
        c.timezone,
        c.utcOffsetMinutes,
        null,
        c.energy,
        c.mood,
        c.fatigue,
        null,
        null,
        null,
        null,
        c.note,
        c.scaleVersion,
        "selbst erfasst",
        iso(c.createdAt),
      ]),
    );
  }
  for (const e of entries) {
    const base = [e.id, e.localDate, e.localTime, e.timezone, e.utcOffsetMinutes, iso(e.observedAt), null, null, e.fatigue] as const;
    const tail = (o: CsvObservation | null) => [
      o?.label ?? null,
      o?.intensity ?? null,
      o?.durationMinutes ?? null,
      e.sleepNote,
      e.note,
      e.scaleVersion,
      "selbst erfasst",
      iso(e.createdAt),
    ];
    if (e.observations.length === 0) lines.push(csvLine([`tagebuch_${e.kind}`, ...base, ...tail(null)]));
    for (const o of e.observations) lines.push(csvLine([`tagebuch_${e.kind}`, ...base, ...tail(o)]));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
