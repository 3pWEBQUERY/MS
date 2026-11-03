/**
 * QA09 / A01–A04 / NFR01 – Automatische Barrierefreiheitsprüfung (axe, WCAG 2.2 AA) über die
 * wichtigen öffentlichen, Mitglieder- und Verwaltungsseiten in Hell- und Dunkelmodus, Reflow bei
 * 320 CSS-Pixeln (entspricht 400 % Zoom bei 1280 px) und vergrösserte Schrift (150 %-Einstellung
 * bei 640 px, entspricht 200 % Zoom) ohne horizontales Scrollen. Dazu Tastaturbedienung.
 * Automatische Prüfungen ersetzen keine Prüfung mit Screenreadern und Betroffenen (PRD 12).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { login, loginStaff } from "./support/auth";
import { createMember } from "./support/db";

// Die Prüfungen sind unabhängig voneinander und laufen parallel.
test.describe.configure({ mode: "parallel" });

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const DEMO_MEMBER = { email: "mitglied.a@demo.ms-plattform.ch", password: "ruhiger-moment-2026-demo" };

const PUBLIC = [
  "/",
  "/wissen",
  "/wissen/haeufige-symptome",
  "/hilfe",
  "/hilfe/ms-gesellschaft-beratung",
  "/suche?q=fatigue",
  "/sicherheit",
  "/regeln",
  "/barrierefreiheit",
  "/datenschutz",
  "/bedingungen",
  "/impressum",
  "/kontakt",
  "/anmelden",
  "/registrieren",
  "/passwort-vergessen",
  "/anzeige",
];

const MEMBER = [
  "/heute",
  "/mein-ms",
  "/mein-ms/check-in",
  "/mein-ms/eintrag/neu",
  "/mein-ms/fatigue/neu",
  "/mein-ms/verlauf",
  "/mein-ms/verlauf?zeitraum=30",
  "/mein-ms/symptome",
  "/community",
  "/community/gruppen",
  "/community/gruppen/kennenlernen-neu-mit-ms",
  "/community/neu",
  "/community/kontakte",
  "/community/gespraeche",
  "/community/meine-gruppen",
  "/community/blockiert",
  "/gespeichert",
  "/mitteilungen",
  "/meldungen",
  "/profil",
  "/konto",
  "/konto/anzeige",
  "/konto/daten",
  "/konto/privatsphaere",
  "/konto/sicherheit",
  "/konto/mitteilungen",
  "/konto/loeschen",
];

const STAFF: { roles: ("admin" | "ops" | "moderation_lead" | "moderator" | "editor" | "privacy_officer")[]; pages: string[] }[] = [
  {
    roles: ["admin", "ops", "privacy_officer"],
    pages: ["/verwaltung", "/verwaltung/audit", "/verwaltung/audit/rollen", "/verwaltung/betrieb", "/verwaltung/mitglieder", "/verwaltung/gruppen", "/verwaltung/datenschutz"],
  },
  { roles: ["moderation_lead", "moderator"], pages: ["/verwaltung/moderation", "/verwaltung/moderation?ansicht=all", "/verwaltung/moderation/einsprueche"] },
  { roles: ["editor"], pages: ["/verwaltung/redaktion", "/verwaltung/redaktion/neu", "/verwaltung/verzeichnis", "/verwaltung/verzeichnis/sicherheit"] },
];

type Mode = { name: string; theme: "light" | "dark"; width: number; textScale?: number };
const MODES: Mode[] = [
  { name: "hell 1280", theme: "light", width: 1280 },
  { name: "dunkel 1280", theme: "dark", width: 1280 },
  { name: "hell 320 (Reflow)", theme: "light", width: 320 },
  { name: "dunkel 640, Schrift 150 %", theme: "dark", width: 640, textScale: 150 },
];

async function newPage(browser: Browser, mode: Mode): Promise<Page> {
  const ctx = await browser.newContext({ colorScheme: mode.theme, viewport: { width: mode.width, height: 900 } });
  if (mode.textScale)
    await ctx.addInitScript((scale) => {
      try {
        localStorage.setItem("ms-display", JSON.stringify({ theme: "system", textScale: scale, motion: "system", simple: false }));
      } catch {}
    }, mode.textScale);
  return ctx.newPage();
}

/** Prüft eine Seite und liefert lesbare Befunde (leer = bestanden). */
async function audit(page: Page, path: string, mode: Mode): Promise<string[]> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  if (mode.textScale) await page.evaluate((s) => (document.documentElement.dataset.textScale = String(s)), mode.textScale);
  const problems: string[] = [];
  // @axe-core/playwright bringt eigene Playwright-Typen mit (gleiche Laufzeit, andere Version der Typen)
  const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(TAGS).analyze();
  for (const v of results.violations)
    problems.push(`${path} [${mode.name}] ${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  // Reflow (WCAG 1.4.10, A02): kein horizontales Scrollen der Seite; Tabellen scrollen im eigenen Container
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) problems.push(`${path} [${mode.name}] horizontales Scrollen um ${overflow}px`);
  return problems;
}

for (const mode of MODES) {
  test.describe(`axe ${mode.name}`, () => {
    test("öffentliche Seiten", async ({ browser }) => {
      const page = await newPage(browser, mode);
      const problems: string[] = [];
      for (const path of PUBLIC) problems.push(...(await audit(page, path, mode)));
      expect(problems).toEqual([]);
      await page.context().close();
    });

    test("Mitgliederseiten", async ({ browser }) => {
      const page = await newPage(browser, mode);
      await login(page, DEMO_MEMBER.email, undefined, DEMO_MEMBER.password);
      const problems: string[] = [];
      for (const path of MEMBER) problems.push(...(await audit(page, path, mode)));
      expect(problems).toEqual([]);
      await page.context().close();
    });

    test("Verwaltungsseiten", async ({ browser }) => {
      const problems: string[] = [];
      for (const group of STAFF) {
        const page = await newPage(browser, mode);
        const staff = await createMember({ roles: group.roles });
        await loginStaff(page, staff.email, group.pages[0]);
        for (const path of group.pages) problems.push(...(await audit(page, path, mode)));
        await page.context().close();
      }
      expect(problems).toEqual([]);
    });
  });
}

test.describe("Tastatur (A03, WCAG 2.1.1, 2.4.7, 2.4.11)", () => {
  /** Fokus sichtbar: Umriss vorhanden und Element im sichtbaren Bereich (nicht verdeckt). */
  const focusInfo = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 10));
      return {
        label: (el.getAttribute("aria-label") || el.textContent || (el as HTMLInputElement).name || el.tagName).trim().slice(0, 60),
        outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2,
        inView: r.bottom > 0 && r.top < window.innerHeight && r.width > 0,
        obscured: Boolean(top && top !== el && !el.contains(top) && !top.contains(el)),
      };
    });

  test("Skip-Link und Anmeldeformular per Tab erreichbar, Fokus sichtbar", async ({ page }) => {
    await page.goto("/anmelden");
    await page.keyboard.press("Tab");
    const skip = await focusInfo(page);
    expect(skip?.label).toBe("Zum Inhalt springen");
    expect(skip?.outline).toBe(true);
    expect(skip?.inView).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#inhalt$/);

    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const f = await focusInfo(page);
      if (!f) continue;
      expect(f.outline, `Fokus sichtbar: ${f.label}`).toBe(true);
      expect(f.inView && !f.obscured, `Fokus nicht verdeckt: ${f.label}`).toBe(true);
      seen.push(f.label);
      if (f.label === "Anmelden") break;
    }
    expect(seen).toEqual(expect.arrayContaining(["email", "password", "Anmelden"]));
  });

  test("Check-in vollständig per Tastatur speicherbar (F02)", async ({ page }) => {
    const m = await createMember({ health: true });
    await login(page, m.email);
    await page.goto("/mein-ms/check-in");
    // Bis zur Energie-Skala tabben, Pfeiltaste wählt einen Wert, dann bis «Check-in speichern»
    let reached = false;
    for (let i = 0; i < 60 && !reached; i++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.name ?? "");
      if (name === "energy") {
        await page.keyboard.press("ArrowRight");
        reached = true;
      }
    }
    expect(reached).toBe(true);
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const f = await focusInfo(page);
      if (f?.label === "Check-in speichern") {
        expect(f.outline).toBe(true);
        await page.keyboard.press("Enter");
        break;
      }
    }
    await expect(page).toHaveURL(/\/heute\?gespeichert=checkin/);
  });
});
