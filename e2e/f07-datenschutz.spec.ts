/**
 * F07 Widerruf und Löschung (PRI01–PRI05, AT09): Gesundheitsbereich widerrufen (Folgen werden
 * vorher erklärt), Konto löschen mit Bestätigung – danach ist keine Anmeldung mehr möglich.
 */
import { expect, test } from "@playwright/test";
import { login, main } from "./support/auth";
import { createMember, PASSWORD, sql } from "./support/db";

test("F07: Einwilligung widerrufen, Konto löschen, danach keine Anmeldung", async ({ page }) => {
  const m = await createMember({ health: true });
  await login(page, m.email);

  await page.goto("/konto/privatsphaere");
  await main(page).getByRole("button", { name: "Gesundheitsbereich widerrufen" }).click();
  await expect(main(page).getByText("Was der Widerruf bewirkt")).toBeVisible();
  await main(page).getByLabel("Ich habe die Folgen gelesen und möchte widerrufen.").check();
  await main(page).getByRole("button", { name: "Widerruf bestätigen" }).click();
  await expect(main(page).getByRole("button", { name: "Gesundheitsbereich aktivieren" })).toBeVisible();
  const [consent] = await sql<{ decision: string }[]>`
    select decision from identity.consent_records where account_id = ${m.id} and purpose = 'health_area' order by decided_at desc limit 1`;
  expect(consent!.decision).toBe("withdrawn");

  await page.goto("/konto/loeschen");
  await main(page).getByLabel("Tippe LÖSCHEN zur Bestätigung").fill("LÖSCHEN");
  await main(page).getByLabel(/Ich habe die Folgen und Fristen gelesen/).check();
  await main(page).getByRole("button", { name: "Konto endgültig löschen" }).click();
  await expect(page).toHaveURL(/\/konto-geloescht/);

  // Bestehende Sitzung ist ungültig, erneute Anmeldung scheitert neutral
  await page.goto("/heute");
  await expect(page).toHaveURL(/\/anmelden/);
  await page.getByLabel("E-Mail-Adresse").fill(m.email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(main(page).getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/anmelden/);
  const [acc] = await sql<{ status: string }[]>`select status from identity.accounts where id = ${m.id}`;
  expect(["deletion_pending", "deleted"]).toContain(acc!.status);
});
