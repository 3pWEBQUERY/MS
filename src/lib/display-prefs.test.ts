import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY, DISPLAY_KEY, displayBootScript, parseDisplayCookie, serializeDisplayCookie, type DisplayPrefs } from "./display-prefs";

/** Führt das Boot-Skript mit einer minimalen Browser-Attrappe aus und liefert die gesetzten data-Attribute. */
function boot(cookie: string, stored: DisplayPrefs | null, systemDark = false) {
  const dataset: Record<string, string> = {};
  const document = { cookie, documentElement: { dataset } };
  const localStorage = { getItem: (k: string) => (k === DISPLAY_KEY && stored ? JSON.stringify(stored) : null) };
  const matchMedia = () => ({ matches: systemDark });
  new Function("document", "localStorage", "matchMedia", displayBootScript)(document, localStorage, matchMedia);
  return dataset;
}

describe("Anzeige-Cookie ms_display (HOM06)", () => {
  it("serialisiert und liest nur erlaubte Werte", () => {
    const p: DisplayPrefs = { theme: "dark", textScale: 125, motion: "reduce", simple: true };
    expect(serializeDisplayCookie(p)).toBe("dark.125.reduce.1");
    expect(parseDisplayCookie("dark.125.reduce.1")).toEqual(p);
    expect(parseDisplayCookie(serializeDisplayCookie(DEFAULT_DISPLAY))).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplayCookie("dark.130.reduce.1")).toBeNull();
    expect(parseDisplayCookie("<script>")).toBeNull();
    expect(serializeDisplayCookie({ ...p, textScale: 999 })).toBe("dark.100.reduce.1");
  });

  it("Boot-Skript bevorzugt das Cookie vor localStorage", () => {
    const d = boot("ms_session=x; ms_display=light.150.reduce.1", { theme: "dark", textScale: 112, motion: "allow", simple: false });
    expect(d).toMatchObject({ theme: "light", themePref: "light", textScale: "150", motion: "reduce", simple: "true" });
  });

  it("fällt ohne Cookie auf localStorage und dann auf das System zurück", () => {
    expect(boot("", { theme: "dark", textScale: 112, motion: "allow", simple: false })).toMatchObject({ theme: "dark", textScale: "112", motion: "allow" });
    const d = boot("", null, true);
    expect(d).toEqual({ theme: "dark", themePref: "system" });
  });

  it("ignoriert manipulierte Cookie-Werte", () => {
    const d = boot("ms_display=dark.125.reduce.1x", null, false);
    expect(d).toEqual({ theme: "light", themePref: "system" });
  });
});
