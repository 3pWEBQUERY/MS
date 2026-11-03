/**
 * Anzeigepräferenzen (S13, HOM06) – clientsichere Definitionen, auch vom Server genutzt.
 *
 * Gäste speichern die Auswahl in localStorage (kein Konto nötig). Für Mitglieder setzt der Server
 * beim Login und beim Speichern zusätzlich das nicht sensible Cookie `ms_display`, damit auf einem
 * neuen Gerät schon das erste Rendern die gespeicherte Darstellung zeigt (geräteübergreifend, ohne
 * Aufblitzen). Inhalt nur theme/textScale/motion/simple – keine Kennung, kein Konto. Nicht HttpOnly,
 * weil das Boot-Skript es vor der Hydration lesen muss. Beim Abmelden wird es gelöscht (geteilte Geräte).
 */
export type DisplayPrefs = {
  theme: "system" | "light" | "dark";
  textScale: number;
  motion: "system" | "reduce" | "allow";
  simple: boolean;
};

export const DISPLAY_KEY = "ms-display";
export const DISPLAY_COOKIE = "ms_display";
/** 180 Tage; wird bei jedem Login und jeder Änderung erneuert. */
export const DISPLAY_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

export const DEFAULT_DISPLAY: DisplayPrefs = { theme: "system", textScale: 100, motion: "system", simple: false };

const THEMES = ["system", "light", "dark"] as const;
const SCALES = [100, 112, 125, 150] as const;
const MOTIONS = ["system", "reduce", "allow"] as const;

/** Kompaktes Format ohne zu kodierende Zeichen, z. B. «dark.125.reduce.1». */
export function serializeDisplayCookie(p: DisplayPrefs): string {
  const theme = (THEMES as readonly string[]).includes(p.theme) ? p.theme : "system";
  const scale = (SCALES as readonly number[]).includes(p.textScale) ? p.textScale : 100;
  const motion = (MOTIONS as readonly string[]).includes(p.motion) ? p.motion : "system";
  return `${theme}.${scale}.${motion}.${p.simple ? 1 : 0}`;
}

const COOKIE_RE = /^(system|light|dark)\.(100|112|125|150)\.(system|reduce|allow)\.([01])$/;

export function parseDisplayCookie(value: string | null | undefined): DisplayPrefs | null {
  const m = value ? COOKIE_RE.exec(value) : null;
  if (!m) return null;
  return { theme: m[1] as DisplayPrefs["theme"], textScale: Number(m[2]), motion: m[3] as DisplayPrefs["motion"], simple: m[4] === "1" };
}

/**
 * Vor der Hydration ausgeführt, damit kein Aufblitzen entsteht. Reihenfolge: Mitglieder-Cookie
 * (serverseitig gespeicherte Präferenz) vor localStorage (Gerätewahl), danach Systemeinstellung.
 */
export const displayBootScript = `(function(){try{var p=null;var m=document.cookie.match(/(?:^|; )${DISPLAY_COOKIE}=(system|light|dark)\\.(100|112|125|150)\\.(system|reduce|allow)\\.([01])(?:;|$)/);if(m){p={theme:m[1],textScale:+m[2],motion:m[3],simple:m[4]==="1"}}else{p=JSON.parse(localStorage.getItem("${DISPLAY_KEY}")||"{}")}var h=document.documentElement;var t=p.theme||"system";if(t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}h.dataset.theme=t;h.dataset.themePref=p.theme||"system";if(p.textScale&&p.textScale!==100)h.dataset.textScale=String(p.textScale);if(p.motion&&p.motion!=="system")h.dataset.motion=p.motion;if(p.simple)h.dataset.simple="true"}catch(e){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}})();`;
