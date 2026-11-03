/**
 * F01 Registrierung bis erster Nutzen (ACC01–ACC03, S02–S07): Registrierung, Bestätigungslink
 * aus der Outbox, Anmeldung, Einstieg in fünf Schritten, «Heute».
 */
import { expect, test } from "@playwright/test";
import { main } from "./support/auth";
import { PASSWORD, verificationLink } from "./support/db";

test("F01: Registrierung → Bestätigung → Einstieg → Heute", async ({ page }) => {
  const email = `e2e.f01.${Date.now()}@example.test`;
  await page.goto("/registrieren");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/mindestens 18 Jahre/).check();
  await page.getByLabel(/Nutzungsbedingungen/).check();
  await page.getByRole("button", { name: "Konto anlegen" }).click();
  await expect(page).toHaveURL(/\/email-bestaetigen\?status=gesendet/);

  // Ohne Bestätigung keine Anmeldung in den Mitgliederbereich
  const link = await verificationLink(email);
  expect(link).toContain("/email-bestaetigen?token=");
  await page.goto(new URL(link).pathname + new URL(link).search);
  await main(page).getByRole("button", { name: "E-Mail-Adresse bestätigen" }).click();
  await expect(page).toHaveURL(/\/anmelden\?status=bestaetigt/);

  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/willkommen/);

  await page.getByLabel("Pseudonym").fill(`Ruhewald${Date.now().toString(36).slice(-5)}`);
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Ohne Angaben weiter" }).click();
  await page.getByRole("radio", { name: /Andere Menschen kennenlernen/ }).check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("radio", { name: /Nein, nicht mitzählen/ }).check();
  // Weitere Schritte bis zum Abschluss (Regeln/Zusammenfassung)
  for (let i = 0; i < 3; i++) {
    const next = page.getByRole("button", { name: "Weiter" });
    if ((await next.count()) === 0) break;
    await next.click();
  }
  await page.getByRole("button", { name: "Profil anlegen und loslegen" }).click();
  await expect(page).toHaveURL(/\/heute/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Guten (Morgen|Tag|Abend)|Hallo|Willkommen/);
});

test("F01: doppelte Registrierung verrät die Kontoexistenz nicht", async ({ page }) => {
  await page.goto("/registrieren");
  await page.getByLabel("E-Mail-Adresse").fill("mitglied.a@demo.ms-plattform.ch");
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/mindestens 18 Jahre/).check();
  await page.getByLabel(/Nutzungsbedingungen/).check();
  await page.getByRole("button", { name: "Konto anlegen" }).click();
  await expect(page).toHaveURL(/\/email-bestaetigen\?status=gesendet/);
});
