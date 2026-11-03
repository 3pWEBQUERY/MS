import { describe, expect, it } from "vitest";
import {
  ANALYTICS_EVENTS,
  ANALYTICS_UI_VERSION,
  analyticsDedupeKey,
  parseAnalyticsEvent,
  suppressedShare,
  suppressSmall,
} from "./analytics";

describe("Ereignisplan PRD 15", () => {
  it("kennt genau die fünf erlaubten Ereignisse", () => {
    expect([...ANALYTICS_EVENTS].sort()).toEqual(
      ["core_flow_failed", "moment_path_selected", "onboarding_completed", "preference_changed", "useful_action_completed"].sort(),
    );
  });

  it("akzeptiert erlaubte Parameter", () => {
    expect(parseAnalyticsEvent({ name: "moment_path_selected", params: { path: "learn" } })).toEqual({
      name: "moment_path_selected",
      params: { path: "learn" },
    });
    expect(parseAnalyticsEvent({ name: "onboarding_completed", params: { variant: "standard", uiVersion: ANALYTICS_UI_VERSION } })).not.toBeNull();
    expect(parseAnalyticsEvent({ name: "core_flow_failed", params: { flow: "F02", code: "server_error" } })).not.toBeNull();
    expect(parseAnalyticsEvent({ name: "preference_changed", params: { type: "display" } })).not.toBeNull();
  });

  it("lehnt Zusatzfelder, IDs, Suchtexte und unbekannte Ereignisse ab", () => {
    expect(parseAnalyticsEvent({ name: "page_view", params: {} })).toBeNull();
    expect(parseAnalyticsEvent({ name: "useful_action_completed", params: { action: "article_opened", success: true, articleId: "x" } })).toBeNull();
    expect(parseAnalyticsEvent({ name: "moment_path_selected", params: { path: "learn", q: "fatigue" } })).toBeNull();
    expect(parseAnalyticsEvent({ name: "moment_path_selected", params: { path: "learn" }, pseudonym: "a" })).toBeNull();
    expect(parseAnalyticsEvent({ name: "core_flow_failed", params: { flow: "F02", code: "Fehler bei Eintrag «müde»" } })).toBeNull();
    expect(parseAnalyticsEvent({ name: "preference_changed", params: { type: "health" } })).toBeNull();
    expect(parseAnalyticsEvent({ name: "onboarding_completed", params: { variant: "standard", uiVersion: "x" } })).toBeNull();
    expect(parseAnalyticsEvent(null)).toBeNull();
    expect(parseAnalyticsEvent({ name: "moment_path_selected", params: ["learn"] })).toBeNull();
  });

  it("erlaubt dem Browser nur unkritische Ereignisse", () => {
    expect(parseAnalyticsEvent({ name: "useful_action_completed", params: { action: "article_opened", success: true } }, "client")).not.toBeNull();
    expect(parseAnalyticsEvent({ name: "useful_action_completed", params: { action: "entry_saved", success: true } }, "client")).toBeNull();
    expect(parseAnalyticsEvent({ name: "preference_changed", params: { type: "analytics" } }, "client")).toBeNull();
    expect(parseAnalyticsEvent({ name: "onboarding_completed", params: { variant: "standard", uiVersion: ANALYTICS_UI_VERSION } }, "client")).toBeNull();
    expect(parseAnalyticsEvent({ name: "core_flow_failed", params: { flow: "F03", code: "server_error" } }, "client")).toBeNull();
    expect(parseAnalyticsEvent({ name: "core_flow_failed", params: { flow: "F03", code: "network" } }, "client")).not.toBeNull();
  });

  it("bildet einen stabilen Tages-Schlüssel ohne Objektbezug", () => {
    const a = analyticsDedupeKey({ name: "useful_action_completed", params: { success: true, action: "offer_opened" } });
    const b = analyticsDedupeKey({ name: "useful_action_completed", params: { action: "offer_opened", success: true } });
    expect(a).toBe(b);
    expect(a).toBe("useful_action_completed|action=offer_opened|success=true");
  });
});

describe("Kleine Gruppen unterdrücken", () => {
  it("gibt Zellen erst ab zehn Personen aus", () => {
    expect(suppressSmall(9)).toBeNull();
    expect(suppressSmall(10)).toBe(10);
    expect(suppressSmall(Number.NaN)).toBeNull();
  });

  it("gibt Anteile nur bei ausreichender Basis und Zählern aus", () => {
    expect(suppressedShare(9, 40)).toBeNull();
    expect(suppressedShare(12, 9)).toBeNull();
    expect(suppressedShare(12, 40)).toBe(30);
    expect(suppressedShare(41, 40)).toBeNull();
  });
});
