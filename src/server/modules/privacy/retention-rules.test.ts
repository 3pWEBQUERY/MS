import { describe, expect, it } from "vitest";
import { healthDeleteBy, inactivityCutoff, inactivityDeleteOn, inactivityDue, RETENTION, subtractMonths } from "./retention-rules";

describe("Aufbewahrung (PRD 11)", () => {
  it("rechnet 24 Kalendermonate, auch am Monatsende", () => {
    expect(subtractMonths(new Date("2026-11-03T10:00:00Z"), 24).toISOString()).toBe("2024-11-03T10:00:00.000Z");
    expect(subtractMonths(new Date("2026-03-31T00:00:00Z"), 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(inactivityCutoff(new Date("2026-11-03T00:00:00Z")).toISOString()).toBe("2024-11-03T00:00:00.000Z");
  });

  it("löscht erst 30 Tage nach der Vorwarnung und nur ohne neue Aktivität", () => {
    const noticeAt = new Date("2026-10-01T00:00:00Z");
    const createdAt = new Date("2024-01-01T00:00:00Z");
    expect(inactivityDeleteOn(noticeAt).toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(inactivityDue({ noticeAt, lastActiveAt: null, createdAt }, new Date("2026-10-30T23:59:00Z"))).toBe(false);
    expect(inactivityDue({ noticeAt, lastActiveAt: null, createdAt }, new Date("2026-10-31T00:00:00Z"))).toBe(true);
    // Anmeldung nach der Vorwarnung hebt sie auf
    expect(inactivityDue({ noticeAt, lastActiveAt: new Date("2026-10-05T00:00:00Z"), createdAt }, new Date("2026-12-01T00:00:00Z"))).toBe(false);
    // Ohne Vorwarnung keine Löschung
    expect(inactivityDue({ noticeAt: null, lastActiveAt: null, createdAt }, new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });

  it("nennt den spätesten Löschtermin nach Widerruf des Gesundheitsbereichs", () => {
    expect(healthDeleteBy(new Date("2026-11-01T08:00:00Z")).toISOString()).toBe("2026-12-01T08:00:00.000Z");
    expect(RETENTION.healthAfterWithdrawalRunFromDays).toBeLessThan(RETENTION.healthAfterWithdrawalDays);
  });
});
