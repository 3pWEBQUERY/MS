/**
 * Mobil-Labortest Web Vitals (NFR03, PRD 13 «Messprofil»): LCP, CLS und INP-Näherung je Kernscreen,
 * mindestens fünf Läufe, Median und 75. Perzentil. Profil: Mittelklasse-Smartphone (412 × 915,
 * DPR 2,625, Pixel-5-Kennung), CPU-Drosselung ×4 über CDP, 4G-ähnliches Netz (150 ms RTT,
 * 1,6 Mbit/s ab, 750 kbit/s auf – entspricht Lighthouse «Slow 4G»). Kalter Cache je Lauf.
 *
 *   BASE_URL=http://localhost:3200 RUNS=5 npx tsx scripts/perf/web-vitals.ts
 *
 * INP ist eine Labornäherung: die längste Event-Timing-Dauer einer typischen Interaktion je Screen.
 */
import { writeFileSync } from "node:fs";
import { chromium, devices, type Page } from "@playwright/test";
import { BASE_URL, memberWithSession, percentile, round, sql } from "./lib";

const RUNS = Math.max(5, Number(process.env.RUNS ?? 5));
const CPU = Number(process.env.CPU_THROTTLE ?? 4);

type Screen = { name: string; path: string; auth: boolean; interact: (page: Page) => Promise<void> };

const SCREENS: Screen[] = [
  { name: "Start (S01)", path: "/", auth: false, interact: (p) => p.getByRole("button", { name: /Menü/ }).first().click() },
  { name: "Artikel (S46)", path: "/wissen/haeufige-symptome", auth: false, interact: (p) => p.getByRole("button", { name: /Menü/ }).first().click() },
  { name: "Heute (S18)", path: "/heute", auth: true, interact: (p) => p.getByRole("button", { name: /Etwas festhalten/ }).click() },
  {
    name: "Check-in (S20)",
    path: "/mein-ms/check-in",
    auth: true,
    interact: (p) => p.getByRole("main").getByRole("group", { name: /Energie/ }).getByRole("radio", { name: /^5$/ }).check({ force: true }),
  },
  { name: "Community-Feed (S29)", path: "/community", auth: true, interact: (p) => p.getByRole("button", { name: /Profil und Einstellungen|Menü/ }).first().click() },
];

/**
 * Beobachter vor dem ersten Byte registrieren (LCP, CLS mit Sitzungsfenstern, Event Timing).
 * Als Zeichenkette, damit der Transpiler (tsx/esbuild) keine Hilfsfunktionen einfügt.
 */
const OBSERVERS = `(() => {
  const v = (window.__vitals = { lcp: 0, cls: 0, inp: 0 });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) v.lcp = Math.max(v.lcp, e.startTime); })
    .observe({ type: "largest-contentful-paint", buffered: true });
  let session = 0, last = 0, first = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      if (e.startTime - last > 1000 || e.startTime - first > 5000) { session = 0; first = e.startTime; }
      session += e.value; last = e.startTime; v.cls = Math.max(v.cls, session);
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) v.inp = Math.max(v.inp, e.duration); })
    .observe({ type: "event", buffered: true, durationThreshold: 16 });
})();`;

type Vitals = { lcp: number; cls: number; inp: number };
const readVitals = (page: Page) => page.evaluate("window.__vitals") as Promise<Vitals>;

async function measure(screen: Screen, cookie: string | null) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["Pixel 5"], locale: "de-CH", timezoneId: "Europe/Zurich" });
  // Sitzungs-Cookie als Header (das __Host-Cookie lässt sich über CDP nicht für http://localhost setzen)
  if (cookie) await ctx.setExtraHTTPHeaders({ Cookie: cookie });
  await ctx.addInitScript({ content: OBSERVERS });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  const t0 = Date.now();
  await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
  const loadMs = Date.now() - t0;
  const { lcp } = await readVitals(page);
  try {
    await screen.interact(page);
  } catch {
    await page.mouse.click(20, 200);
  }
  await page.waitForTimeout(800);
  const v = await readVitals(page);
  const url = page.url();
  await browser.close();
  if (screen.auth && url.includes("/anmelden")) throw new Error(`${screen.name}: Sitzung nicht akzeptiert`);
  return { lcp, cls: v.cls, inp: v.inp, loadMs };
}

async function main() {
  const member = await memberWithSession({ health: true });
  const results = [];
  for (const screen of SCREENS) {
    const runs: Awaited<ReturnType<typeof measure>>[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(screen, screen.auth ? member.cookie : null));
    const stat = (k: "lcp" | "cls" | "inp" | "loadMs", d = 0) => ({
      median: round(percentile(runs.map((r) => r[k]), 50), d),
      p75: round(percentile(runs.map((r) => r[k]), 75), d),
    });
    const row = { screen: screen.name, path: screen.path, runs: RUNS, lcpMs: stat("lcp"), cls: stat("cls", 3), inpMs: stat("inp"), loadMs: stat("loadMs") };
    console.log(JSON.stringify(row));
    results.push(row);
  }
  const out = {
    baseUrl: BASE_URL,
    profile: { device: "Pixel 5 (412×915, DPR 2.625)", cpuThrottle: CPU, network: "150 ms RTT, 1.6 Mbit/s ab, 750 kbit/s auf", cache: "kalt je Lauf" },
    targets: { lcpMs: 2500, inpMs: 200, cls: 0.1 },
    results,
    at: new Date().toISOString(),
  };
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  await sql.end();
}

main().catch(async (err) => {
  console.error("Labortest abgebrochen:", (err as Error).message);
  await sql.end();
  process.exit(1);
});
