import { describe, expect, it } from "vitest";
import { COMMUNITY_RULES_VERSION } from "./catalog";
import { COMMUNITY_RULES_HISTORY, rulesChangesSince } from "./community-rules";

describe("Community-Regeln (SAF07)", () => {
  it("neueste Fassung entspricht der aktiven Regelversion", () => {
    expect(COMMUNITY_RULES_HISTORY[0]?.version).toBe(COMMUNITY_RULES_VERSION);
    for (const r of COMMUNITY_RULES_HISTORY) expect(r.changes.length).toBeGreaterThan(0);
  });

  it("zeigt keine Änderungen bei aktueller oder fehlender Bestätigung", () => {
    expect(rulesChangesSince(COMMUNITY_RULES_VERSION)).toEqual([]);
    expect(rulesChangesSince(null)).toEqual([]);
  });

  it("zeigt bei unbekannter älterer Fassung alle Änderungen", () => {
    expect(rulesChangesSince("regeln-alt")).toEqual([...COMMUNITY_RULES_HISTORY]);
  });
});
