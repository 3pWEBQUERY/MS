/**
 * AT10 / NFR20 Teilstörung: Bei abgeschaltetem Chat bleibt die Sicherheitsseite (S49) ohne
 * Anmeldung lesbar; der Mitgliederbereich zeigt den Teilbetrieb an statt eines Fehlers.
 */
import { expect, test } from "@playwright/test";
import { login, main } from "./support/auth";
import { createMember, setFlag } from "./support/db";

test.describe.configure({ mode: "serial" });

test("AT10: Sicherheitsseite ohne Login und bei abgeschaltetem Chat", async ({ page, browser }) => {
  await setFlag("chat", false);
  try {
    const anonymous = await browser.newContext();
    const p = await anonymous.newPage();
    const res = await p.goto("/sicherheit");
    expect(res?.status()).toBe(200);
    await expect(p.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(main(p)).toContainText("144");
    await anonymous.close();

    // Hauptansichten verlinken die Hilfeseite, auch bei Teilbetrieb (SAF06)
    const m = await createMember();
    await login(page, m.email);
    await page.goto("/community/gespraeche");
    expect(page.url()).not.toContain("/anmelden");
    await expect(page.getByRole("link", { name: /Sicherheit|akute Hilfe/i }).first()).toBeVisible();
    await page.goto("/sicherheit");
    await expect(main(page)).toContainText("144");
  } finally {
    await setFlag("chat", true);
  }
});
