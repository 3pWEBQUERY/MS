import { describe, expect, it } from "vitest";
import {
  checkInDateProblem,
  consecutiveRuns,
  customLabelProblem,
  daysBetween,
  formatOffset,
  healthReturnPath,
  isDateString,
  monthGrid,
  normalizeLabel,
  offsetForLocalDate,
  parseDuration,
  parseScale,
  resolveMonth,
  resolveObservedAt,
  resolveRange,
  shiftMonth,
} from "./validation";

const TZ = "Europe/Zurich";

describe("parseScale (DIA01, Null und Wert)", () => {
  it("unterscheidet 0 von «nicht erfasst»", () => {
    expect(parseScale("0", 0, 10)).toEqual({ ok: true, value: 0 });
    expect(parseScale("", 0, 10)).toEqual({ ok: true, value: null });
    expect(parseScale(null, 0, 10)).toEqual({ ok: true, value: null });
  });
  it("lehnt Werte ausserhalb der Skala ab", () => {
    expect(parseScale("11", 0, 10).ok).toBe(false);
    expect(parseScale("0", 1, 5).ok).toBe(false);
    expect(parseScale("6", 1, 5).ok).toBe(false);
    expect(parseScale("3.5", 0, 10).ok).toBe(false);
    expect(parseScale("-1", 0, 10).ok).toBe(false);
    expect(parseScale("abc", 0, 10).ok).toBe(false);
  });
  it("akzeptiert Randwerte", () => {
    expect(parseScale("10", 0, 10)).toEqual({ ok: true, value: 10 });
    expect(parseScale("1", 1, 5)).toEqual({ ok: true, value: 1 });
    expect(parseScale("5", 1, 5)).toEqual({ ok: true, value: 5 });
  });
});

describe("parseDuration (DIA03)", () => {
  it("ist optional und begrenzt auf 10 080 Minuten", () => {
    expect(parseDuration("")).toEqual({ ok: true, value: null });
    expect(parseDuration("30")).toEqual({ ok: true, value: 30 });
    expect(parseDuration("10080")).toEqual({ ok: true, value: 10080 });
    expect(parseDuration("10081").ok).toBe(false);
    expect(parseDuration("0").ok).toBe(false);
    expect(parseDuration("1.5").ok).toBe(false);
  });
});

describe("eigene Bezeichnung (DIA03)", () => {
  it("normalisiert Leerraum und prüft die Länge", () => {
    expect(normalizeLabel("  Druck \n im   Kopf ")).toBe("Druck im Kopf");
    expect(customLabelProblem("")).not.toBeNull();
    expect(customLabelProblem("x".repeat(80))).toBeNull();
    expect(customLabelProblem("x".repeat(81))).not.toBeNull();
  });
});

describe("Datum (DIA02)", () => {
  it("erkennt ungültige Kalenderdaten", () => {
    expect(isDateString("2026-02-29")).toBe(false);
    expect(isDateString("2028-02-29")).toBe(true);
    expect(isDateString("2026-13-01")).toBe(false);
    expect(isDateString("2026-1-1")).toBe(false);
  });
  it("erlaubt bis 365 Tage rückwirkend und keine Zukunft", () => {
    const today = "2026-11-02";
    expect(checkInDateProblem(today, today)).toBeNull();
    expect(checkInDateProblem("2026-11-03", today)).not.toBeNull();
    expect(checkInDateProblem("2025-11-02", today)).toBeNull(); // genau 365 Tage
    expect(checkInDateProblem("2025-11-01", today)).not.toBeNull();
    expect(daysBetween("2025-11-02", today)).toBe(365);
  });
  it("speichert den Offset des gewählten Tages, nicht des Erfassungstags", () => {
    expect(offsetForLocalDate("2026-07-01", TZ)).toBe(120);
    expect(offsetForLocalDate("2026-12-01", TZ)).toBe(60);
    expect(offsetForLocalDate("2026-07-01", "America/New_York")).toBe(-240);
  });
});

describe("resolveObservedAt (DIA03, Zeitlogik)", () => {
  const now = new Date("2026-11-02T13:00:00Z"); // 14:00 in Zürich

  it("wandelt lokale Zeit in UTC mit Offset um", () => {
    const r = resolveObservedAt("2026-11-02", "09:15", TZ, now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.observedAt.toISOString()).toBe("2026-11-02T08:15:00.000Z");
      expect(r.value.utcOffsetMinutes).toBe(60);
      expect(r.value.localDate).toBe("2026-11-02");
      expect(r.value.localTime).toBe("09:15");
    }
  });

  it("weist Zukunftszeiten als Feldfehler zurück", () => {
    const later = resolveObservedAt("2026-11-02", "15:00", TZ, now);
    expect(later.ok).toBe(false);
    if (!later.ok) expect(later.fieldErrors.time).toBeDefined();
    const tomorrow = resolveObservedAt("2026-11-03", "08:00", TZ, now);
    expect(tomorrow.ok).toBe(false);
    if (!tomorrow.ok) expect(tomorrow.fieldErrors.date).toBeDefined();
  });

  it("prüft Format von Datum und Uhrzeit", () => {
    const r = resolveObservedAt("2026-11-xx", "25:00", TZ, now);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.date).toBeDefined();
      expect(r.fieldErrors.time).toBeDefined();
    }
  });

  it("behandelt den Sommerzeitwechsel (Frühling, Lücke 02:00–03:00)", () => {
    const spring = new Date("2026-04-01T00:00:00Z");
    const before = resolveObservedAt("2026-03-29", "01:30", TZ, spring);
    const after = resolveObservedAt("2026-03-29", "03:30", TZ, spring);
    expect(before.ok && before.value.utcOffsetMinutes).toBe(60);
    expect(after.ok && after.value.utcOffsetMinutes).toBe(120);
    if (before.ok && after.ok) {
      expect(before.value.observedAt.toISOString()).toBe("2026-03-29T00:30:00.000Z");
      expect(after.value.observedAt.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    }
    // Nicht existierende Wandzeit: gespeichert wird die tatsächliche Wandzeit
    const gap = resolveObservedAt("2026-03-29", "02:30", TZ, spring);
    expect(gap.ok).toBe(true);
    if (gap.ok) expect(["01:30", "03:30"]).toContain(gap.value.localTime);
  });

  it("behandelt den Sommerzeitwechsel (Herbst)", () => {
    const autumn = new Date("2026-11-01T00:00:00Z");
    const r = resolveObservedAt("2026-10-25", "12:00", TZ, autumn);
    expect(r.ok && r.value.utcOffsetMinutes).toBe(60);
    const r2 = resolveObservedAt("2026-10-24", "12:00", TZ, autumn);
    expect(r2.ok && r2.value.utcOffsetMinutes).toBe(120);
  });

  it("ordnet Zeitpunkte in anderen Zeitzonen dem dortigen Kalendertag zu", () => {
    const r = resolveObservedAt("2026-11-01", "23:30", "America/New_York", now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.observedAt.toISOString()).toBe("2026-11-02T04:30:00.000Z");
      expect(r.value.localDate).toBe("2026-11-01");
    }
  });
});

describe("resolveRange (DIA06)", () => {
  const today = "2026-11-02";
  it("liefert 7 und 30 Tage inklusive heute", () => {
    expect(resolveRange({}, today)).toMatchObject({ preset: "7", from: "2026-10-27", to: today, days: 7 });
    expect(resolveRange({ zeitraum: "30" }, today)).toMatchObject({ from: "2026-10-04", days: 30 });
  });
  it("prüft eigene Zeiträume", () => {
    expect(resolveRange({ zeitraum: "eigen", von: "2026-10-01", bis: "2026-10-31" }, today)).toMatchObject({
      preset: "eigen",
      days: 31,
    });
    expect(resolveRange({ zeitraum: "eigen", von: "2026-10-31", bis: "2026-10-01" }, today).error).toBeDefined();
    expect(resolveRange({ zeitraum: "eigen", von: "2026-10-01", bis: "2026-11-05" }, today).error).toBeDefined();
    expect(resolveRange({ zeitraum: "eigen", von: "2025-11-03", bis: today }, today).error).toBeUndefined();
    expect(resolveRange({ zeitraum: "eigen", von: "2025-11-02", bis: today }, today).error).toBeDefined();
  });
});

describe("Kalender", () => {
  it("beginnt Wochen am Montag", () => {
    const weeks = monthGrid("2026-11"); // 1. November 2026 ist ein Sonntag
    expect(weeks[0].slice(0, 6).every((d) => d === null)).toBe(true);
    expect(weeks[0][6]).toBe("2026-11-01");
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
  it("begrenzt Monate auf Vergangenheit und Gegenwart", () => {
    expect(resolveMonth("2026-12", "2026-11-02")).toBe("2026-11");
    expect(resolveMonth("2026-03", "2026-11-02")).toBe("2026-03");
    expect(resolveMonth("kaputt", "2026-11-02")).toBe("2026-11");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("consecutiveRuns (DIA06: Lücken bleiben Lücken)", () => {
  it("verbindet nur aufeinanderfolgende Tage", () => {
    const runs = consecutiveRuns([5, 0, 1, 2, 4, 7, 8], (d) => d);
    expect(runs).toEqual([[0, 1, 2], [4, 5], [7, 8]]);
  });
  it("lässt Einzelwerte allein", () => {
    expect(consecutiveRuns([0, 2, 4], (d) => d)).toEqual([[0], [2], [4]]);
  });
});

describe("formatOffset", () => {
  it("formatiert Offsets", () => {
    expect(formatOffset(60)).toBe("UTC+01:00");
    expect(formatOffset(-270)).toBe("UTC−04:30");
  });
});

describe("healthReturnPath (F02: S08 → Erfassung, kein offener Redirect)", () => {
  it("erlaubt nur die Erfassungsseiten von Mein MS", () => {
    expect(healthReturnPath("/mein-ms/check-in")).toBe("/mein-ms/check-in");
    expect(healthReturnPath("/mein-ms/check-in?datum=2026-03-29")).toBe("/mein-ms/check-in?datum=2026-03-29");
    expect(healthReturnPath("/mein-ms/eintrag/neu")).toBe("/mein-ms/eintrag/neu");
    expect(healthReturnPath("/mein-ms/fatigue/neu?x=1")).toBe("/mein-ms/fatigue/neu");
  });
  it("verwirft fremde, externe und ungültige Ziele", () => {
    expect(healthReturnPath("https://example.org/mein-ms/check-in")).toBeNull();
    expect(healthReturnPath("//example.org")).toBeNull();
    expect(healthReturnPath("/mein-ms/aktivieren")).toBeNull();
    expect(healthReturnPath("/community")).toBeNull();
    expect(healthReturnPath("/mein-ms/check-in?datum=2026-02-31")).toBe("/mein-ms/check-in");
    expect(healthReturnPath(null)).toBeNull();
  });
});

describe("Sommerzeit bei Check-ins (DIA02, PRD 09 «Zeitlogik»)", () => {
  it("ordnet den Check-in dem gewählten Tag zu – mit dem Offset dieses Tages", () => {
    expect(offsetForLocalDate("2026-03-28", TZ)).toBe(60);
    expect(offsetForLocalDate("2026-03-29", TZ)).toBe(120);
    expect(offsetForLocalDate("2026-10-25", TZ)).toBe(60);
  });
  it("erlaubt genau 365 Tage rückwirkend, auch über einen Sommerzeitwechsel", () => {
    expect(checkInDateProblem("2025-11-03", "2026-11-03")).toBeNull();
    expect(checkInDateProblem("2025-11-02", "2026-11-03")).not.toBeNull();
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});
