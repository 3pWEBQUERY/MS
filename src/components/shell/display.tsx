"use client";

import { useEffect } from "react";

/**
 * Anzeigepräferenzen (S13, HOM06): Gäste speichern sie lokal (kein Konto nötig),
 * Mitglieder geräteübergreifend in der Datenbank. Nicht sensibel, daher in localStorage.
 */
export type DisplayPrefs = {
  theme: "system" | "light" | "dark";
  textScale: number;
  motion: "system" | "reduce" | "allow";
  simple: boolean;
};

export const DISPLAY_KEY = "ms-display";

export const DEFAULT_DISPLAY: DisplayPrefs = { theme: "system", textScale: 100, motion: "system", simple: false };

/** Vor der Hydration ausgeführt, damit kein Aufblitzen entsteht. */
export const displayBootScript = `(function(){try{var p=JSON.parse(localStorage.getItem("${DISPLAY_KEY}")||"{}");var h=document.documentElement;var t=p.theme||"system";if(t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}h.dataset.theme=t;h.dataset.themePref=p.theme||"system";if(p.textScale&&p.textScale!==100)h.dataset.textScale=String(p.textScale);if(p.motion&&p.motion!=="system")h.dataset.motion=p.motion;if(p.simple)h.dataset.simple="true"}catch(e){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}})();`;

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
