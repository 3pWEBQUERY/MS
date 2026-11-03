/**
 * F02 Check-in und Tagebuch (DIA01–DIA07, AT02): Check-in mit Energie 0 und leerer Stimmung,
 * zweiter Check-in am selben Tag wird abgewiesen, Fatigue-Eintrag, Verlauf mit Datentabelle.
 */
import { expect, test } from "@playwright/test";
import { login, main } from "./support/auth";
import { createMember, sql } from "./support/db";

test("F02: Check-in, Duplikat am selben Tag, Tagebucheintrag und Verlauf", async ({ page }) => {
  const m = await createMember({ health: true });
  await login(page, m.email);
  await expect(page).toHaveURL(/\/heute/);

  await page.goto("/mein-ms/check-in");
  await main(page).getByRole("group", { name: /Energie/ }).getByRole("radio", { name: /^0( –|$)/ }).check();
  await page.getByRole("button", { name: "Check-in speichern" }).click();
  await expect(page).toHaveURL(/\/heute\?gespeichert=checkin/);
  const [stored] = await sql<{ energy: number | null; mood: number | null; n: number }[]>`
    select energy, mood, (select count(*)::int from health.check_ins where account_id = ${m.id}) as n from health.check_ins where account_id = ${m.id}`;
  expect(stored).toEqual({ energy: 0, mood: null, n: 1 });

  // Zweiter Check-in für denselben Tag: verständliche Meldung, kein zweiter Eintrag
  await page.goto("/mein-ms/check-in");
  const form = main(page);
  if (await form.getByRole("button", { name: "Check-in speichern" }).isVisible()) {
    await form.getByRole("group", { name: /Stimmung/ }).getByRole("radio", { name: /^3 · / }).check();
    await form.getByRole("button", { name: "Check-in speichern" }).click();
    await expect(form.getByRole("alert")).toContainText("bereits einen Check-in");
  } else {
    await expect(form).toContainText(/bereits/);
  }
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from health.check_ins where account_id = ${m.id}`;
  expect(n).toBe(1);

  // Tagebuch: Fatigue notieren
  await page.goto("/mein-ms/fatigue/neu");
  await main(page).getByLabel("Uhrzeit").fill("07:15");
  await main(page).getByRole("group", { name: /Fatigue/ }).getByRole("radio", { name: /^6$/ }).check();
  await main(page).getByRole("button", { name: /speichern/ }).click();
  await expect(page).toHaveURL(/\/mein-ms\/eintrag\/[0-9a-f-]{36}\?gespeichert=neu/);

  // Verlauf mit gleichwertiger Datentabelle (A01): Energie 0 erscheint als Wert, nicht als Lücke
  await page.goto("/mein-ms/verlauf");
  const table = main(page).getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.getByRole("row").filter({ hasText: "Energie" })).toContainText("0");
  await expect(table.getByRole("row").filter({ hasText: "Fatigue" }).first()).toContainText("6");
});
