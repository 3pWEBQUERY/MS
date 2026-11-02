/**
 * Zeitlogik (PRD 09): Standardzeitzone Europe/Zurich inkl. Sommerzeit.
 * Darstellung lokal, Audit in UTC, Export mit ursprünglicher Zeitzone und Offset.
 */
export const DEFAULT_TZ = "Europe/Zurich";
const LOCALE = "de-CH";

/** YYYY-MM-DD des lokalen Kalendertags in einer Zeitzone */
export function localDateString(date: Date = new Date(), timeZone = DEFAULT_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** HH:MM in einer Zeitzone */
export function localTimeString(date: Date = new Date(), timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

/** Offset in Minuten (z. B. 60 im Winter, 120 im Sommer für Zürich) */
export function utcOffsetMinutes(date: Date, timeZone = DEFAULT_TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Wandelt lokales Datum + Uhrzeit (Wandzeit) einer Zeitzone in einen UTC-Zeitpunkt um. */
export function zonedToUtc(localDate: string, localTime: string, timeZone = DEFAULT_TZ): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  const [hh, mm] = localTime.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = utcOffsetMinutes(guess, timeZone);
  const result = new Date(guess.getTime() - offset * 60000);
  // Zweiter Durchlauf für Zeitpunkte nahe am Sommerzeitwechsel
  const offset2 = utcOffsetMinutes(result, timeZone);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

export function addDays(dateString: string, days: number): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatDate(date: Date | string, timeZone = DEFAULT_TZ, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date.length === 10 ? `${date}T12:00:00Z` : date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: typeof date === "string" && date.length === 10 ? "UTC" : timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatShortDate(date: Date | string, timeZone = DEFAULT_TZ) {
  return formatDate(date, timeZone, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: Date, timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatWeekday(dateString: string) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${dateString}T12:00:00Z`),
  );
}

/** «vor 5 Minuten», «gestern» … */
export function formatRelative(date: Date, now: Date = new Date()) {
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const diff = (date.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "gerade eben";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(date);
}

/** Liegt die aktuelle Wandzeit in der Ruhezeit (z. B. 20:00–08:00)? */
export function inQuietHours(start: string, end: string, date = new Date(), timeZone = DEFAULT_TZ): boolean {
  const now = localTimeString(date, timeZone);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}
