/**
 * F03 Wissen und Hilfe ohne Konto (CON01–CON06, S44–S49): Lesen und Suchen ohne Login,
 * Speichern fordert die Anmeldung und führt danach zurück.
 */
import { expect, test } from "@playwright/test";
import { main } from "./support/auth";

test("F03: Wissen und Hilfe ohne Login, Speichern fordert Login", async ({ page }) => {
  await page.goto("/wissen");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await main(page).getByRole("link", { name: /Häufige Beschwerden/ }).first().click();
  await expect(page).toHaveURL(/\/wissen\/haeufige-symptome/);
  await expect(main(page)).toContainText(/geprüft/i);
  await main(page).getByRole("link", { name: "Anmelden zum Speichern" }).click();
  await expect(page).toHaveURL(/\/anmelden\?next=%2Fwissen%2Fhaeufige-symptome/);

  await page.goto("/hilfe");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/hilfe/ms-gesellschaft-beratung");
  await expect(main(page).getByRole("link", { name: /externer Link/ }).first()).toBeVisible();
  await expect(main(page).getByRole("link", { name: "Anmelden zum Speichern" })).toHaveAttribute("href", /\/anmelden\?next=/);

  // Suche ohne Konto, keine Treffer verständlich
  await page.goto("/suche?q=fatigue");
  await expect(main(page)).toContainText(/Fatigue/i);
  await page.goto("/suche?q=xyzunbekanntesWort");
  await expect(main(page)).toContainText(/kein|keine/i);
});
