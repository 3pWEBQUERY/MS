import { describe, expect, it } from "vitest";
import { buildHistoryRows } from "./history-rows";

describe("Verlauf und Datentabelle (DIA06, DIA07, US08, AT02)", () => {
  const data = {
    checkIns: [{ id: "c1", localDate: "2026-03-02", energy: 0, mood: null, fatigue: 4 }],
    diary: [
      {
        id: "d1",
        kind: "symptom" as const,
        localDate: "2026-03-05",
        localTime: "08:15",
        fatigue: null,
        observations: [{ id: "o1", definitionId: null, label: "Kribbeln", intensity: 0, durationMinutes: 30 }],
      },
    ],
  };
  const rows = buildHistoryRows(data, "2026-03-01");

  it("unterscheidet Energie 0 von nicht erfasster Stimmung", () => {
    const energy = rows.find((r) => r.series === "energy")!;
    const mood = rows.find((r) => r.series === "mood")!;
    expect(energy.value).toBe(0);
    expect(energy.valueText).toBe("0 von 10");
    expect(mood.value).toBeNull();
    expect(mood.valueText).toBe("nicht erfasst");
  });

  it("füllt fehlende Tage nicht auf und fasst nichts zusammen", () => {
    expect(new Set(rows.map((r) => r.date))).toEqual(new Set(["2026-03-02", "2026-03-05"]));
    expect(rows).toHaveLength(4);
  });

  it("hält Check-in und Tagebuch unterscheidbar, chronologisch geordnet", () => {
    expect(rows.map((r) => r.source)).toEqual(["Check-in", "Check-in", "Check-in", "Tagebuch"]);
    const symptom = rows.find((r) => r.series === "symptom")!;
    expect(symptom.measure).toBe("Symptom: Kribbeln");
    expect(symptom.valueText).toBe("Stärke 0 von 10 · Dauer 30 Min.");
    expect(symptom.href).toBe("/mein-ms/eintrag/d1");
  });
});
