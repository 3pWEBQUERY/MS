/**
 * Reine Validierungs- und Zeitlogik für Check-in und Tagebuch (DIA01–DIA07, PRD 09 «Zeitlogik»).
 * Bewusst ohne Server- oder Datenbankabhängigkeit, damit sie in Unit-Tests und in
 * Client-Komponenten (Grenzwerte) nutzbar ist. Relative Importe, damit vitest ohne Alias läuft.
 */
import { addDays, localDateString, localTimeString, utcOffsetMinutes, zonedToUtc } from "../../../lib/time";

export const HEALTH_LIMITS = {
  /** Check-in-Notiz (S20) */
  checkInNote: 500,
  /** Tagebuchnotiz (DIA03) */
  diaryNote: 2000,
  /** Schlafbeobachtung, Freitext ohne Score (PRD 09) */
  sleepNote: 250,
  /** Eigene Symptombezeichnung (DIA03) */
  customLabel: 80,
  /** Dauer in Minuten (DIA03) */
  durationMax: 10080,
  /** Nachträgliche Erfassung (DIA02) */
  backfillDays: 365,
  /** Benutzerdefinierter Verlauf (DIA06) */
  rangeMaxDays: 365,
  /** Technische Obergrenze pro Tagebucheintrag */
  symptomsPerEntry: 20,
} as const;

/** Toleranz für Uhrenabweichung zwischen Gerät und Server beim Zukunftstest */
const FUTURE_TOLERANCE_MS = 60_000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Gültiges Kalenderdatum im Format YYYY-MM-DD (kein 31. Februar). */
export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 1900;
}

export function isTimeString(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

/** Ganze Tage zwischen zwei Kalenderdaten (b − a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export type ScaleResult = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * Skalenwert lesen (DIA01): leer = «nicht erfasst» (null), 0 ist ein gültiger Wert («Null und Wert»).
 */
export function parseScale(raw: unknown, min: number, max: number): ScaleResult {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "Bitte wähle einen Wert aus der Skala." };
  const v = raw.trim();
  if (v === "") return { ok: true, value: null };
  if (!/^\d{1,2}$/.test(v)) return { ok: false, error: `Bitte wähle einen Wert von ${min} bis ${max}.` };
  const n = Number(v);
  if (n < min || n > max) return { ok: false, error: `Bitte wähle einen Wert von ${min} bis ${max}.` };
  return { ok: true, value: n };
}

/** Optionale Dauer in Minuten (DIA03): leer = nicht erfasst, sonst 1–10 080. */
export function parseDuration(raw: unknown): ScaleResult {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "Bitte gib die Dauer in ganzen Minuten an." };
  const v = raw.trim();
  if (v === "") return { ok: true, value: null };
  if (!/^\d{1,6}$/.test(v)) return { ok: false, error: "Bitte gib die Dauer in ganzen Minuten an, z. B. 30." };
  const n = Number(v);
  if (n < 1 || n > HEALTH_LIMITS.durationMax)
    return { ok: false, error: "Die Dauer kann zwischen 1 und 10 080 Minuten (7 Tage) liegen." };
  return { ok: true, value: n };
}

/** Eigene Bezeichnung vereinheitlichen: Steuerzeichen entfernen, Leerraum zusammenfassen. */
export function normalizeLabel(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function customLabelProblem(label: string): string | null {
  if (label.length === 0) return "Bitte gib eine Bezeichnung ein.";
  if (label.length > HEALTH_LIMITS.customLabel) return `Die Bezeichnung darf höchstens ${HEALTH_LIMITS.customLabel} Zeichen lang sein.`;
  return null;
}

/** Offset der Zeitzone am lokalen Mittag eines Kalendertags (für Check-ins, DIA02). */
export function offsetForLocalDate(date: string, timeZone: string): number {
  return utcOffsetMinutes(zonedToUtc(date, "12:00", timeZone), timeZone);
}

/** DIA02: Check-in-Datum – höchstens 365 Tage rückwirkend, keine Zukunft. */
export function checkInDateProblem(date: unknown, today: string): string | null {
  if (!isDateString(date)) return "Bitte wähle ein gültiges Datum.";
  if (date > today) return "Ein Check-in für einen kommenden Tag ist nicht möglich. Bitte wähle heute oder einen früheren Tag.";
  if (daysBetween(date, today) > HEALTH_LIMITS.backfillDays)
    return "Ein Check-in ist bis 365 Tage rückwirkend möglich. Bitte wähle ein späteres Datum.";
  return null;
}

export type ObservedAt = {
  observedAt: Date;
  localDate: string;
  localTime: string;
  utcOffsetMinutes: number;
};

/**
 * DIA03: Beobachtungszeitpunkt aus lokaler Wandzeit. Datum, Uhrzeit, Zeitzone und Offset
 * werden gemeinsam bestimmt. Fällt eine Uhrzeit in die Sommerzeitlücke, wird die
 * tatsächliche Wandzeit des berechneten Zeitpunkts gespeichert.
 */
export function resolveObservedAt(
  date: unknown,
  time: unknown,
  timeZone: string,
  now: Date = new Date(),
): { ok: true; value: ObservedAt } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (!isDateString(date)) fieldErrors.date = "Bitte wähle ein gültiges Datum.";
  if (!isTimeString(time)) fieldErrors.time = "Bitte gib eine Uhrzeit im Format HH:MM an, z. B. 14:30.";
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  const d = date as string;
  const t = time as string;
  const today = localDateString(now, timeZone);
  if (d > today) return { ok: false, fieldErrors: { date: "Dieses Datum liegt in der Zukunft. Bitte wähle heute oder einen früheren Tag." } };
  if (daysBetween(d, today) > HEALTH_LIMITS.backfillDays)
    return { ok: false, fieldErrors: { date: "Ein Eintrag ist bis 365 Tage rückwirkend möglich." } };
  const observedAt = zonedToUtc(d, t, timeZone);
  if (observedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS)
    return { ok: false, fieldErrors: { time: "Diese Uhrzeit liegt in der Zukunft. Bitte wähle einen vergangenen Zeitpunkt." } };
  return {
    ok: true,
    value: {
      observedAt,
      localDate: localDateString(observedAt, timeZone),
      localTime: localTimeString(observedAt, timeZone),
      utcOffsetMinutes: utcOffsetMinutes(observedAt, timeZone),
    },
  };
}

export type RangePreset = "7" | "30" | "eigen";
export type ResolvedRange = { preset: RangePreset; from: string; to: string; days: number; error?: string };

/** DIA06: Zeitraum 7 / 30 / benutzerdefiniert (höchstens 365 Tage, nicht in der Zukunft). */
export function resolveRange(
  input: { zeitraum?: string | null; von?: string | null; bis?: string | null },
  today: string,
): ResolvedRange {
  const preset = (n: 7 | 30, error?: string): ResolvedRange => ({
    preset: String(n) as RangePreset,
    from: addDays(today, -(n - 1)),
    to: today,
    days: n,
    ...(error ? { error } : {}),
  });
  if (input.zeitraum === "30") return preset(30);
  if (input.zeitraum !== "eigen") return preset(7);
  const { von, bis } = input;
  if (!isDateString(von) || !isDateString(bis))
    return { ...preset(30, "Bitte wähle ein gültiges Start- und Enddatum."), preset: "eigen" };
  if (von > bis) return { ...preset(30, "Das Startdatum liegt nach dem Enddatum."), preset: "eigen" };
  if (bis > today) return { ...preset(30, "Das Enddatum darf nicht in der Zukunft liegen."), preset: "eigen" };
  const days = daysBetween(von, bis) + 1;
  if (days > HEALTH_LIMITS.rangeMaxDays)
    return { ...preset(30, "Ein eigener Zeitraum kann höchstens 365 Tage umfassen."), preset: "eigen" };
  return { preset: "eigen", from: von, to: bis, days };
}

/** Monat «YYYY-MM» lesen; ungültig oder in der Zukunft → aktueller Monat. */
export function resolveMonth(raw: unknown, today: string): string {
  const current = today.slice(0, 7);
  if (typeof raw !== "string" || !MONTH_RE.test(raw)) return current;
  if (raw > current) return current;
  if (raw < "1900-01") return current;
  return raw;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Kalenderwochen eines Monats, Montag zuerst; Tage ausserhalb des Monats sind null. */
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Montag = 0
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * DIA06 «Lücken bleiben Lücken»: zerlegt tägliche Werte in Läufe aufeinanderfolgender Tage.
 * Linien werden nur innerhalb eines Laufs gezeichnet – nie über fehlende Tage hinweg.
 */
export function consecutiveRuns<T>(items: T[], dayOf: (item: T) => number): T[][] {
  const sorted = [...items].sort((a, b) => dayOf(a) - dayOf(b));
  const runs: T[][] = [];
  for (const item of sorted) {
    const run = runs[runs.length - 1];
    if (run && dayOf(item) - dayOf(run[run.length - 1]) === 1) run.push(item);
    else runs.push([item]);
  }
  return runs;
}

/** «UTC+01:00» für einen Offset in Minuten */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
