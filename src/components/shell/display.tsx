"use client";

import { useEffect } from "react";
import {
  DEFAULT_DISPLAY,
  DISPLAY_COOKIE,
  DISPLAY_COOKIE_MAX_AGE,
  DISPLAY_KEY,
  serializeDisplayCookie,
  type DisplayPrefs,
} from "@/lib/display-prefs";

/**
 * Anzeigepräferenzen (S13, HOM06): Gäste speichern sie lokal (kein Konto nötig),
 * Mitglieder geräteübergreifend in der Datenbank und zusätzlich im nicht sensiblen Cookie
 * `ms_display`, das das Boot-Skript vor localStorage liest (siehe src/lib/display-prefs.ts).
 */
export type { DisplayPrefs };
export { DEFAULT_DISPLAY, DISPLAY_KEY };

/** Mitglieder: Cookie auf diesem Gerät mit dem Serverstand abgleichen (kein Konto, nur Darstellung). */
function writeDisplayCookie(p: DisplayPrefs) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${DISPLAY_COOKIE}=${serializeDisplayCookie(p)}; Path=/; Max-Age=${DISPLAY_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    // Cookies blockiert – localStorage und Serverstand genügen.
  }
}

export function readDisplay(): DisplayPrefs {
  try {
    return { ...DEFAULT_DISPLAY, ...JSON.parse(localStorage.getItem(DISPLAY_KEY) ?? "{}") };
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export function applyDisplay(p: DisplayPrefs) {
  const h = document.documentElement;
  const theme =
    p.theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : p.theme;
  h.dataset.theme = theme;
  h.dataset.themePref = p.theme;
  if (p.textScale !== 100) h.dataset.textScale = String(p.textScale);
  else delete h.dataset.textScale;
  if (p.motion !== "system") h.dataset.motion = p.motion;
  else delete h.dataset.motion;
  if (p.simple) h.dataset.simple = "true";
  else delete h.dataset.simple;
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(p));
  } catch {
    // Speicher nicht verfügbar (privater Modus) – Anzeige gilt nur für diese Seite.
  }
}

/** Übernimmt die serverseitig gespeicherten Mitgliederpräferenzen auf dieses Gerät. */
export function DisplaySync({ prefs }: { prefs: DisplayPrefs }) {
  useEffect(() => {
    applyDisplay(prefs);
    // Wurde die Präferenz auf einem anderen Gerät geändert, gilt sie hier ab dem nächsten Laden sofort.
    writeDisplayCookie(prefs);
  }, [prefs]);

  // Systemwechsel hell/dunkel live übernehmen
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const p = readDisplay();
      if (p.theme === "system") applyDisplay(p);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
