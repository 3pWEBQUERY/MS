import { describe, expect, it } from "vitest";
import { buildDiaryCsv, csvCell, CSV_HEADER, measure } from "./export-format";

describe("Tagebuch-CSV (PRI03, DIA08)", () => {
  it("entschärft Formeln und lässt Zahlen als Zahlen", () => {
    expect(csvCell("=SUMME(A1)")).toBe(`"'=SUMME(A1)"`);
    expect(csvCell("-1")).toBe(`"'-1"`);
    expect(csvCell('Er sagte "gut"')).toBe(`"Er sagte ""gut"""`);
    expect(csvCell(0)).toBe("0");
    expect(csvCell(null)).toBe("");
  });

  it("unterscheidet 0 und nicht erfasst", () => {
    expect(measure(0, "0–10")).toEqual({ wert: 0, erfasst: true, skala: "0–10" });
    expect(measure(null, "0–10")).toEqual({ wert: null, erfasst: false, skala: "0–10" });
  });

  it("schreibt je Check-in und je Symptom eine Zeile mit BOM und CRLF", () => {
    const csv = buildDiaryCsv(
      [
        {
          id: "c1",
          localDate: "2026-03-29",
          timezone: "Europe/Zurich",
          utcOffsetMinutes: 120,
          energy: 0,
          mood: null,
          fatigue: 4,
          note: null,
          scaleVersion: "s1",
          createdAt: new Date("2026-03-29T08:00:00Z"),
        },
      ],
      [
        {
          id: "e1",
          kind: "symptom",
          observedAt: new Date("2026-03-29T09:00:00Z"),
          localDate: "2026-03-29",
          localTime: "11:00",
          timezone: "Europe/Zurich",
          utcOffsetMinutes: 120,
          fatigue: null,
          sleepNote: null,
          note: "+ wichtig",
          scaleVersion: "s1",
          createdAt: new Date("2026-03-29T09:05:00Z"),
          observations: [
            { label: "Kribbeln", intensity: 3, durationMinutes: null },
            { label: "Schwindel", intensity: 0, durationMinutes: 15 },
          ],
        },
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[0].split(";")).toHaveLength(CSV_HEADER.length);
    expect(lines[1].split(";").slice(7, 10)).toEqual(["0", "", "4"]);
    expect(lines[2]).toContain(`"'+ wichtig"`);
    expect(lines[3].split(";").slice(10, 13)).toEqual([`"Schwindel"`, "0", "15"]);
  });
});
