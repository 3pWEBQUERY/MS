import { addDays, DEFAULT_TZ, localDateString, zonedToUtc } from "@/lib/time";

/**
 * Betriebszeiten der Moderation (PRD 10 «Moderationsmodell und Betriebszeiten», D03).
 * Vorgeschlagen: täglich 09–18 Uhr Europe/Zurich, einschliesslich Wochenenden.
 * Alle Fristen (P0–P3, zweite Freigabe, Einspruch) zählen ausschliesslich Betriebszeit –
 * die Ziele sind Serviceziele des Betriebs, keine Rund-um-die-Uhr-Zusage.
 * Rein und framework-frei: nutzbar in Seiten, Server Actions, Worker und Tests.
 */

export const OPERATING_HOURS = {
  start: "09:00",
  end: "18:00",
  timeZone: DEFAULT_TZ,
  /** Wochentage mit Dienst (0 = Sonntag). Täglich gemäss Vorschlag; die Besetzung entscheidet D03. */
  days: [0, 1, 2, 3, 4, 5, 6] as readonly number[],
} as const;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Dauer eines Betriebstags (09–18 Uhr = 9 Betriebsstunden). */
export const OPERATING_DAY_MS = (() => {
  const [sh, sm] = OPERATING_HOURS.start.split(":").map(Number);
  const [eh, em] = OPERATING_HOURS.end.split(":").map(Number);
  return (eh! * 60 + em! - (sh! * 60 + sm!)) * MINUTE;
})();

/** Reaktionsziele je Priorität in Betriebszeit (Kapitel 10). */
export const PRIORITY_OPERATING_MS = {
  /** Prüfung binnen 30 Minuten während Betriebszeit */
  P0: 30 * MINUTE,
  /** Triage binnen 2 Betriebsstunden */
  P1: 2 * HOUR,
  /** Triage binnen 1 Betriebstag */
  P2: OPERATING_DAY_MS,
  /** Bearbeitung binnen 3 Betriebstagen */
  P3: 3 * OPERATING_DAY_MS,
} as const;

/**
 * Ist das Reaktionsziel erreicht? P0 «Prüfung», P1/P2 «Triage» – erfüllt, sobald der Fall den
 * Eingang verlassen hat; P3 «Bearbeitung binnen 3 Betriebstagen» – erst mit dem Entscheid.
 */
export function reactionDone(priority: "P0" | "P1" | "P2" | "P3", status: string): boolean {
  if (priority === "P3") return !["new", "triaged", "in_progress", "escalated"].includes(status);
  return status !== "new";
}

/** Schwere Sofortmassnahme bzw. dauerhafte Sperre: zweite Prüfung binnen 24 Betriebsstunden (SAF04, Kapitel 10). */
export const SECOND_APPROVAL_OPERATING_MS = 24 * HOUR;
/** Einspruch: vorgeschlagenes Antwortziel fünf Betriebstage (SAF05). */
export const APPEAL_TARGET_OPERATING_MS = 5 * OPERATING_DAY_MS;

function weekday(localDate: string): number {
  return new Date(`${localDate}T12:00:00Z`).getUTCDay();
}

/** Dienstfenster eines lokalen Kalendertags oder null, wenn an diesem Tag kein Dienst ist. */
function windowOf(localDate: string): { start: Date; end: Date } | null {
  if (!OPERATING_HOURS.days.includes(weekday(localDate))) return null;
  return {
    start: zonedToUtc(localDate, OPERATING_HOURS.start, OPERATING_HOURS.timeZone),
    end: zonedToUtc(localDate, OPERATING_HOURS.end, OPERATING_HOURS.timeZone),
  };
}

/** Ist die Moderation zu diesem Zeitpunkt im Dienst? */
export function isWithinOperatingHours(at: Date = new Date()): boolean {
  const w = windowOf(localDateString(at, OPERATING_HOURS.timeZone));
  return w !== null && at >= w.start && at < w.end;
}

/**
 * Nächster Dienstbeginn nach `at`. Liegt `at` innerhalb der Betriebszeit, ist das Ergebnis null
 * (die Moderation ist jetzt im Dienst).
 */
export function nextServiceStart(at: Date = new Date()): Date | null {
  if (isWithinOperatingHours(at)) return null;
  let day = localDateString(at, OPERATING_HOURS.timeZone);
  for (let i = 0; i < 14; i++) {
    const w = windowOf(day);
    if (w && w.start > at) return w.start;
    day = addDays(day, 1);
  }
  return null;
}

/**
 * Addiert Betriebszeit zu einem Zeitpunkt: Zeit ausserhalb der Dienstfenster zählt nicht.
 * Eingang ausserhalb der Betriebszeit → die Frist beginnt mit dem nächsten Dienstbeginn.
 */
export function addOperatingTime(from: Date, durationMs: number): Date {
  let remaining = Math.max(0, durationMs);
  let day = localDateString(from, OPERATING_HOURS.timeZone);
  // Obergrenze schützt vor Endlosschleifen bei Fehlkonfiguration (über ein Jahr).
  for (let i = 0; i < 400; i++) {
    const w = windowOf(day);
    if (w && w.end > from) {
      const begin = w.start > from ? w.start : from;
      const available = w.end.getTime() - begin.getTime();
      if (remaining <= available) return new Date(begin.getTime() + remaining);
      remaining -= available;
    }
    day = addDays(day, 1);
  }
  return new Date(from.getTime() + durationMs);
}

/** Betriebszeit zwischen zwei Zeitpunkten (für Auswertungen, z. B. Moderationsqualität). */
export function operatingTimeBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let total = 0;
  let day = localDateString(from, OPERATING_HOURS.timeZone);
  for (let i = 0; i < 400; i++) {
    const w = windowOf(day);
    if (w) {
      if (w.start >= to) break;
      const a = Math.max(w.start.getTime(), from.getTime());
      const b = Math.min(w.end.getTime(), to.getTime());
      if (b > a) total += b - a;
    }
    day = addDays(day, 1);
  }
  return total;
}

/** «Mittwoch, 4. November 2026, 09:00 Uhr» in Schweizer Zeit. */
export function formatServiceStart(date: Date): string {
  const tz = OPERATING_HOURS.timeZone;
  const day = new Intl.DateTimeFormat("de-CH", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("de-CH", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return `${day}, ${time} Uhr`;
}

/** Lesbare Angabe der Betriebszeit, z. B. für Hinweise («täglich 09–18 Uhr»). */
export const OPERATING_HOURS_LABEL = `täglich ${OPERATING_HOURS.start.slice(0, 2)}–${OPERATING_HOURS.end.slice(0, 2)} Uhr`;
