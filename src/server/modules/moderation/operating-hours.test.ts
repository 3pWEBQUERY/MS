import { describe, expect, it } from "vitest";
import { site } from "@/lib/site";
import {
  addOperatingTime,
  APPEAL_TARGET_OPERATING_MS,
  formatServiceStart,
  isWithinOperatingHours,
  nextServiceStart,
  OPERATING_DAY_MS,
  OPERATING_HOURS_LABEL,
  operatingTimeBetween,
  PRIORITY_OPERATING_MS,
  reactionDone,
  SECOND_APPROVAL_OPERATING_MS,
} from "./operating-hours";

const H = 60 * 60 * 1000;
const M = 60 * 1000;

/** Winterzeit: Zürich = UTC+1; Sommerzeit: UTC+2. */
const zurichWinter = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`);
const zurichSummer = (date: string, time: string) => new Date(`${date}T${time}:00+02:00`);

describe("Betriebszeiten (PRD 10)", () => {
  it("Betriebstag dauert neun Stunden (09–18 Uhr)", () => {
    expect(OPERATING_DAY_MS).toBe(9 * H);
    expect(PRIORITY_OPERATING_MS.P2).toBe(9 * H);
    expect(PRIORITY_OPERATING_MS.P3).toBe(27 * H);
    expect(APPEAL_TARGET_OPERATING_MS).toBe(45 * H);
  });

  it("erkennt Dienst- und Ruhezeit in Europe/Zurich", () => {
    expect(isWithinOperatingHours(zurichWinter("2026-11-03", "09:00"))).toBe(true);
    expect(isWithinOperatingHours(zurichWinter("2026-11-03", "17:59"))).toBe(true);
    expect(isWithinOperatingHours(zurichWinter("2026-11-03", "18:00"))).toBe(false);
    expect(isWithinOperatingHours(zurichWinter("2026-11-03", "08:59"))).toBe(false);
    // Wochenende ist Betriebszeit (täglich, einschliesslich Wochenenden).
    expect(isWithinOperatingHours(zurichWinter("2026-11-08", "12:00"))).toBe(true);
  });

  it("nennt den nächsten Dienstbeginn ausserhalb der Betriebszeit", () => {
    expect(nextServiceStart(zurichWinter("2026-11-03", "12:00"))).toBeNull();
    expect(nextServiceStart(zurichWinter("2026-11-03", "07:30"))?.toISOString()).toBe(zurichWinter("2026-11-03", "09:00").toISOString());
    expect(nextServiceStart(zurichWinter("2026-11-03", "22:15"))?.toISOString()).toBe(zurichWinter("2026-11-04", "09:00").toISOString());
    expect(formatServiceStart(zurichWinter("2026-11-04", "09:00"))).toBe("Mittwoch, 4. November 2026, 09:00 Uhr");
  });

  it("zählt Fristen nur in Betriebszeit", () => {
    // P0 um 10:00 → 10:30 am selben Tag
    expect(addOperatingTime(zurichWinter("2026-11-03", "10:00"), PRIORITY_OPERATING_MS.P0).toISOString()).toBe(
      zurichWinter("2026-11-03", "10:30").toISOString(),
    );
    // P0 um 23:00 → 09:30 am Folgetag
    expect(addOperatingTime(zurichWinter("2026-11-03", "23:00"), PRIORITY_OPERATING_MS.P0).toISOString()).toBe(
      zurichWinter("2026-11-04", "09:30").toISOString(),
    );
    // P1 um 17:00 → 1 h heute, 1 h morgen → 10:00
    expect(addOperatingTime(zurichWinter("2026-11-03", "17:00"), PRIORITY_OPERATING_MS.P1).toISOString()).toBe(
      zurichWinter("2026-11-04", "10:00").toISOString(),
    );
    // 24 Betriebsstunden ab 12:00 → 6 h + 9 h + 9 h → 18:00 am übernächsten Tag
    expect(addOperatingTime(zurichWinter("2026-11-03", "12:00"), SECOND_APPROVAL_OPERATING_MS).toISOString()).toBe(
      zurichWinter("2026-11-05", "18:00").toISOString(),
    );
  });

  it("berücksichtigt den Wechsel auf Winterzeit", () => {
    // 24./25. Oktober 2026: Umstellung in der Nacht auf Sonntag 25.10.
    const from = zurichSummer("2026-10-24", "17:30");
    expect(addOperatingTime(from, H).toISOString()).toBe(zurichWinter("2026-10-25", "09:30").toISOString());
  });

  it("misst Betriebszeit zwischen zwei Zeitpunkten", () => {
    expect(operatingTimeBetween(zurichWinter("2026-11-03", "17:00"), zurichWinter("2026-11-04", "10:00"))).toBe(2 * H);
    expect(operatingTimeBetween(zurichWinter("2026-11-03", "19:00"), zurichWinter("2026-11-03", "20:00"))).toBe(0);
    expect(operatingTimeBetween(zurichWinter("2026-11-03", "09:00"), zurichWinter("2026-11-03", "09:30"))).toBe(30 * M);
  });

  it("öffentliche Angabe entspricht dem Dienstplan (Kapitel 10, SAF06)", () => {
    expect(site.moderationHours).toBe(OPERATING_HOURS_LABEL);
  });

  it("Reaktionsziel: P0–P2 mit Triage, P3 mit Entscheid", () => {
    expect(reactionDone("P1", "new")).toBe(false);
    expect(reactionDone("P1", "triaged")).toBe(true);
    expect(reactionDone("P0", "in_progress")).toBe(true);
    expect(reactionDone("P3", "in_progress")).toBe(false);
    expect(reactionDone("P3", "decided")).toBe(true);
  });
});
