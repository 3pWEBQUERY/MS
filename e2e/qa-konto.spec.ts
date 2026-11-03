/**
 * QA01/QA02 (PRD 16): Passwort zurücksetzen (ACC04), Rollenentzug wirkt sofort (ACC06, PRI08)
 * und einfache Ansicht (HOM06). Arbeitet nur mit fiktiven Konten der Testdatenbank «ms_e2e».
 */
import { expect, test } from "@playwright/test";
import { login, loginStaff, main } from "./support/auth";
import { PASSWORD, createMember, sql, verificationLink } from "./support/db";

test("QA01: Passwort zurücksetzen – einmaliger Link, alte Sitzungen und altes Passwort ungültig", async ({ browser }) => {
  const m = await createMember();
  const NEW = "ein ganz anderer satz fuer den neuen zugang";

  // Bestehende Sitzung auf einem «anderen Gerät»
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, m.email);
  await expect(otherPage).toHaveURL(/\/heute/);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/passwort-vergessen");
  await page.getByLabel("E-Mail-Adresse").fill(m.email);
  await page.getByRole("button", { name: "Link anfordern" }).click();
  // Neutrale Antwort, unabhängig davon, ob das Konto existiert (ACC04)
  await expect(page.getByRole("status").or(page.getByRole("alert")).first()).toBeVisible();

  const link = new URL(await verificationLink(m.email, "email.password_reset"));
  expect(link.pathname).toBe("/passwort-zuruecksetzen");
  await page.goto(link.pathname + link.search);
  await page.getByLabel("Neues Passwort", { exact: true }).fill(NEW);
  await page.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(page).toHaveURL(/\/anmelden\?status=passwort/);

  // Der Link ist nur einmal gültig: beim zweiten Aufruf gibt es kein Formular mehr
  await page.goto(link.pathname + link.search);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Link nicht mehr gültig");
  await expect(page.getByLabel("Neues Passwort", { exact: true })).toHaveCount(0);

  // Alle bisherigen Sitzungen sind beendet
  await otherPage.goto("/heute");
  await expect(otherPage).toHaveURL(/\/anmelden/);

  // Altes Passwort abgelehnt, neues angenommen
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill(m.email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(main(page)).toContainText(/stimmen nicht/);
  await expect(page).toHaveURL(/\/anmelden/);
  await login(page, m.email, undefined, NEW);
  await expect(page).toHaveURL(/\/heute/);
  await other.close();
  await ctx.close();
});

test("QA01: Rollenentzug wirkt sofort – ohne Rolle kein Zugriff auf die Verwaltung", async ({ page }) => {
  const staff = await createMember({ roles: ["moderator"] });
  await loginStaff(page, staff.email, "/verwaltung/moderation");
  await expect(page).toHaveURL(/\/verwaltung\/moderation/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Austritt: Rolle wird entzogen (wie über «Rollen und Audit»), die laufende Sitzung bleibt bestehen
  await sql`update identity.role_assignments set revoked_at = now() where account_id = ${staff.id} and revoked_at is null`;
  await page.goto("/verwaltung/moderation");
  // Neutrale Seite ohne Inhalte der Verwaltung; der Status bleibt wegen Streaming 200 (notFound in Suspense)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Diese Seite ist nicht verfügbar.");
  await expect(page.getByRole("navigation", { name: /Verwaltung/ })).toHaveCount(0);
});

test("QA02/HOM06: einfache Ansicht blendet Zusatzinformationen aus, Navigation und Hilfe bleiben", async ({ page }) => {
  const m = await createMember({ health: true });
  await login(page, m.email);
  await page.goto("/heute");
  const dateLine = page.locator("main [data-optional]").first();
  await expect(dateLine).toBeVisible();

  await page.goto("/konto/anzeige");
  await page.getByRole("switch", { name: /Einfache Ansicht/ }).or(page.getByLabel("Einfache Ansicht")).first().check();
  // Gespeichert ist erst, was der Server bestätigt hat
  await expect.poll(async () => (await sql<{ v: boolean }[]>`select simple_view as v from identity.user_preferences where account_id = ${m.id}`)[0]?.v, { timeout: 15_000 }).toBe(true);

  await page.goto("/heute");
  await expect(page.locator("html")).toHaveAttribute("data-simple", "true");
  await expect(page.locator("main [data-optional]").first()).toBeHidden();
  // Pflichtwege bleiben erreichbar (PRD 12)
  await expect(page.getByRole("link", { name: /Sicherheit und akute Hilfe|Akute Hilfe/ }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" }).first()).toBeVisible();
});
