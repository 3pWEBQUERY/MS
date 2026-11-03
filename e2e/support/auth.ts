import { expect, type Page } from "@playwright/test";
import { PASSWORD, totp } from "./db";

/** Anmeldung über das Formular S03 (ACC03). */
export async function login(page: Page, email: string, next?: string, password = PASSWORD) {
  await page.goto(next ? `/anmelden?next=${encodeURIComponent(next)}` : "/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/anmelden") || u.pathname.startsWith("/anmelden/mfa"));
}

/** Mitarbeitende: Passwort und zweiter Faktor (ACC05), danach Verwaltungsbereich erreichbar. */
export async function loginStaff(page: Page, email: string, next = "/verwaltung") {
  await login(page, email, next);
  await expect(page).toHaveURL(/\/anmelden\/mfa/);
  await page.getByLabel("Sechsstelliger Code").fill(totp());
  await page.getByRole("button", { name: "Bestätigen" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/anmelden"));
}

/** Sichtbarer Hauptbereich (Next.js hält vorherige Seiten unsichtbar im DOM). */
export const main = (page: Page) => page.getByRole("main");
