import { telHref, type SafetyContact } from "@/lib/safety-static";

/**
 * NFR20 «Öffentliche Hilfe unabhängig bereitstellbar»: Die Sicherheitsseite S49 als eigenständiges,
 * statisches HTML ohne JavaScript, ohne Next.js und ohne externe Ressourcen. Wird vom Hilfe-Dienst
 * (src/static-help/server.ts) ausgeliefert, damit Notrufnummern und Grenzen der Plattform auch bei
 * einem Ausfall der Web-App erreichbar bleiben (SAF06, AT10).
 *
 * Gestaltung nach docs/DESIGN.md: keine Verläufe, keine Schatten, Radien 28/20/14 px, Kontrast ≥ 4.5:1.
 */

export type HelpPageData = {
  contacts: SafetyContact[];
  /** «database» = gepflegte Liste, «fallback» = statische Notrufnummern */
  source: "database" | "fallback";
  moderationHours: string;
  /** Adresse der Plattform, z. B. https://… (ohne abschliessenden Schrägstrich) */
  platformUrl: string | null;
  generatedAt: Date;
};

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Nur https-Links mit gültiger Adresse ausgeben (kein javascript:, keine Parameter-Weitergabe). */
function safeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });
const stampFmt = new Intl.DateTimeFormat("de-CH", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Zurich" });

function contactCard(c: SafetyContact): string {
  const url = safeUrl(c.url);
  const checked = c.verifiedAt
    ? `${dateFmt.format(new Date(c.verifiedAt))}${c.verifiedBy ? `, ${escapeHtml(c.verifiedBy)}` : ""}`
    : "Prüfung ausstehend";
  return `<li><article class="card" aria-labelledby="k-${escapeHtml(c.id)}">
  <div class="card-body">
    <h3 id="k-${escapeHtml(c.id)}">${escapeHtml(c.name)}</h3>
    <p>${escapeHtml(c.description)}</p>
    <dl>
      <div><dt>Erreichbar:</dt><dd>${escapeHtml(c.availability)}</dd></div>
      <div><dt>Region:</dt><dd>${escapeHtml(c.region)}</dd></div>
      <div><dt>Geprüft:</dt><dd>${checked}</dd></div>
    </dl>
    ${url ? `<a class="ext" href="${escapeHtml(url)}" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">${escapeHtml(url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, ""))} <span class="sr">(externer Link)</span></a>` : ""}
  </div>
  ${c.phone ? `<a class="call" href="${escapeHtml(telHref(c.phone))}">${escapeHtml(c.phone)} <span class="sr">anrufen</span></a>` : ""}
</article></li>`;
}

const LIMITS: [string, string][] = [
  ["Kein Notfalldienst", "Bei akuter Gefahr hilft nur der direkte Anruf bei einer der Nummern oben."],
  ["Keine Überwachung rund um die Uhr", "Ausserhalb der Moderationszeiten liest niemand mit."],
  ["Kein automatischer Notruf", "Meldungen, Beiträge oder Tagebucheinträge lösen nie einen Notruf aus."],
  ["Keine Ortung", "Die Plattform kennt deinen Standort nicht und kann niemanden zu dir schicken."],
  ["Keine medizinische Beratung", "Für Fragen zu Beschwerden, Medikamenten oder Therapie sind deine behandelnden Fachpersonen da."],
];

const CSS = `
:root{color-scheme:light dark;--bg:#f5f4f0;--surface:#fff;--ink:#16181c;--ink2:#474b53;--line:#dddbd3;--line2:#cfccc2;--danger:#b42318;--danger-soft:#f8e1de;--warning-soft:#f6ead3;--focus:#b8400f}
@media (prefers-color-scheme:dark){:root{--bg:#0f1012;--surface:#17181b;--ink:#edece7;--ink2:#b6b4ad;--line:#2b2c31;--line2:#3a3b41;--danger:#f97066;--danger-soft:#3a1714;--warning-soft:#33280f;--focus:#f2814b}}
*{box-sizing:border-box;box-shadow:none}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:1.0625rem/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:inherit}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.wrap{max-width:46rem;margin:0 auto;padding:2rem 1rem 4rem}
header.top{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:2rem}
.brand{font-weight:700;font-size:1.125rem;text-decoration:none}
.eyebrow{font-size:.875rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);margin:0 0 .5rem}
h1{font-size:2.25rem;line-height:1.1;letter-spacing:-.025em;margin:0 0 .75rem}
h2{font-size:1.375rem;line-height:1.3;margin:0 0 .75rem}
h3{font-size:1.125rem;margin:0 0 .25rem}
p{margin:0 0 .5rem}
.lead{font-size:1.1875rem;color:var(--ink2)}
section{margin-top:3rem}
.urgent{background:var(--danger-soft);border-radius:28px;padding:1.5rem}
.urgent p{font-size:1.1875rem}
.big{display:flex;align-items:center;justify-content:center;min-height:4rem;margin-top:1rem;border-radius:16px;background:var(--danger);color:#fff;font-size:1.25rem;font-weight:650;text-decoration:none}
@media (prefers-color-scheme:dark){.big{color:#0f1012}}
ul.list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.75rem}
.card{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1.25rem}
.card-body{flex:1 1 18rem;min-width:0}
dl{margin:.5rem 0;font-size:.9375rem;color:var(--ink2)}
dl div{display:flex;gap:.375rem}
dt{font-weight:600}dd{margin:0}
.ext{font-weight:600;text-underline-offset:.2em;word-break:break-all}
.call{display:inline-flex;align-items:center;justify-content:center;min-height:3.5rem;min-width:7rem;padding:0 1.5rem;border:1px solid var(--line2);border-radius:14px;background:var(--surface);font-size:1.125rem;font-weight:650;text-decoration:none}
.note{background:var(--warning-soft);border-radius:16px;padding:1rem 1.25rem;margin-bottom:1rem}
.limits{list-style:none;padding:0 1.25rem;margin:0;background:var(--surface);border:1px solid var(--line);border-radius:20px}
.limits li{padding:1rem 0;border-top:1px solid var(--line)}
.limits li:first-child{border-top:0}
.limits strong{display:block}
.limits span{color:var(--ink2)}
footer{margin-top:3rem;font-size:.875rem;color:var(--ink2)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

export function renderHelpPage(data: HelpPageData): string {
  const platform = safeUrl(data.platformUrl);
  return `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sicherheit und akute Hilfe · MS Plattform</title>
<meta name="description" content="Notrufnummern und Hilfewege in der Schweiz sowie die Grenzen der MS Plattform. Ohne Anmeldung lesbar.">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <span class="brand">MS Plattform</span>
  ${platform ? `<a href="${escapeHtml(platform)}">Zur Plattform</a>` : ""}
</header>
<main id="inhalt">
  <p class="eyebrow">Sicherheit</p>
  <h1>Sicherheit und akute Hilfe</h1>
  <p class="lead">Diese Seite ist immer ohne Anmeldung erreichbar – auch wenn die Plattform selbst gerade gestört ist.</p>

  <section class="urgent" aria-labelledby="akut">
    <h2 id="akut">Bei akuter Lebensgefahr</h2>
    <p>Ruf sofort den Sanitätsnotruf an. Warte nicht auf eine Antwort in der Community – dort liest niemand rund um die Uhr mit.</p>
    <a class="big" href="tel:144">144 anrufen</a>
  </section>

  <section aria-labelledby="hilfewege">
    <h2 id="hilfewege">Hilfewege in der Schweiz</h2>
    <p>Mit Erreichbarkeit, Region und Datum der letzten Prüfung.</p>
    ${data.source === "fallback" ? `<p class="note" role="note">Die gepflegte Liste ist gerade nicht abrufbar. Hier stehen die allgemein bekannten Schweizer Notrufnummern; sie gelten in der ganzen Schweiz und sind kostenlos.</p>` : ""}
    <ul class="list">${data.contacts.map(contactCard).join("\n")}</ul>
  </section>

  <section aria-labelledby="grenzen">
    <h2 id="grenzen">Was diese Plattform nicht ist</h2>
    <ul class="limits">${LIMITS.map(([t, d]) => `<li><strong>${escapeHtml(t)}</strong><span>${escapeHtml(d)}</span></li>`).join("")}</ul>
    <p style="margin-top:1rem">Die Moderation ist <strong>${escapeHtml(data.moderationHours)}</strong> (Zeitzone Zürich) erreichbar, auch am Wochenende.</p>
  </section>
</main>
<footer>
  <p>Stand: ${escapeHtml(stampFmt.format(data.generatedAt))}. Die Hilfewege werden vor der Veröffentlichung und danach monatlich fachlich geprüft.</p>
</footer>
</div>
</body>
</html>
`;
}
