import { describe, expect, it } from "vitest";
import { DEFAULT_MOMENT_CONFIG, MOMENT_INTENTS, resolveMoment, type MomentConfig } from "./moment";

const undecided = { healthActive: false, healthDeclined: false };
const declined = { healthActive: false, healthDeclined: true };
const active = { healthActive: true, healthDeclined: false, healthWritable: true };

describe("Mein Moment (HOM02, S19)", () => {
  it("bietet genau die drei Absichten aus PRD 04", () => {
    expect(MOMENT_INTENTS.map((i) => i.label)).toEqual(["Etwas festhalten", "Austausch finden", "Wissen oder Hilfe finden"]);
  });

  it("liefert höchstens drei Ziele, auch wenn die Konfiguration mehr enthält", () => {
    const many: MomentConfig = {
      ...DEFAULT_MOMENT_CONFIG,
      learn: [...DEFAULT_MOMENT_CONFIG.learn, { label: "Viertes", description: "x", href: "/x", icon: "book" }],
    };
    expect(resolveMoment(many, "learn", active)).toHaveLength(3);
  });

  it("funktioniert ohne Tagebuch und ohne Aktivierung: Gesundheitsziele führen zuerst zu S08 und danach zurück", () => {
    const record = resolveMoment(DEFAULT_MOMENT_CONFIG, "record", undecided);
    expect(record).toHaveLength(3);
    expect(record[0].href).toBe("/mein-ms/aktivieren?weiter=%2Fmein-ms%2Fcheck-in");
    expect(resolveMoment(DEFAULT_MOMENT_CONFIG, "connect", undecided).map((t) => t.href)).toContain("/community/gruppen");
  });

  it("zeigt nach Ablehnung oder Widerruf keine Gesundheitsaufgaben (PRD 05)", () => {
    expect(resolveMoment(DEFAULT_MOMENT_CONFIG, "record", declined)).toEqual([]);
    expect(resolveMoment(DEFAULT_MOMENT_CONFIG, "learn", declined)).toHaveLength(3);
  });

  it("blendet abgeschaltete Erfassung im Teilbetrieb aus (HOM08)", () => {
    expect(resolveMoment(DEFAULT_MOMENT_CONFIG, "record", { ...active, healthWritable: false })).toEqual([]);
    expect(resolveMoment(DEFAULT_MOMENT_CONFIG, "record", active).map((t) => t.href)).toEqual([
      "/mein-ms/check-in",
      "/mein-ms/eintrag/neu",
      "/mein-ms/fatigue/neu",
    ]);
  });

  it("«Austausch finden» führt zu Gruppen und bekannten Kontakten, nicht zu spontaner Vermittlung", () => {
    const hrefs = resolveMoment(DEFAULT_MOMENT_CONFIG, "connect", active).map((t) => t.href);
    expect(hrefs).toContain("/community/gruppen");
    expect(hrefs).toContain("/community/kontakte");
  });
});
