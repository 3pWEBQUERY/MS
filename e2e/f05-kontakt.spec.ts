/**
 * F05 Kontakt und Gespräch (MSG01–MSG06, AT05): Anfrage, bewusste Annahme, Nachricht in Echtzeit
 * beim Gegenüber sichtbar (SSE), Kontakt beenden – danach kein Senden mehr.
 */
import { expect, test } from "@playwright/test";
import { login, main } from "./support/auth";
import { createMember } from "./support/db";

test("F05: Kontaktanfrage, Annahme, Nachricht, Kontakt beenden", async ({ page, browser }) => {
  const a = await createMember();
  const b = await createMember();

  await login(page, a.email);
  await page.goto(`/community/mitglied/${b.id}/anfrage`);
  await main(page).getByRole("button", { name: "Anfrage senden" }).click();
  await expect(main(page).getByText("Deine Anfrage ist ausstehend")).toBeVisible();

  const ctxB = await browser.newContext();
  const pb = await ctxB.newPage();
  await login(pb, b.email);
  await pb.goto("/community/kontakte");
  await main(pb).getByRole("button", { name: "Annehmen" }).click();
  await expect(pb).toHaveURL(/\/community\/gespraeche\/[0-9a-f-]{36}\?status=verbunden/);
  const conversationPath = new URL(pb.url()).pathname;

  // A hat das Gespräch offen; B sendet – die Nachricht erscheint ohne Neuladen (MSG05, NFR05)
  await page.goto(conversationPath);
  await expect(main(page).getByLabel(`Nachricht an ${b.pseudonym}`)).toBeVisible();
  const text = `Hallo ${a.pseudonym}, schön dich kennenzulernen.`;
  await main(pb).getByLabel(`Nachricht an ${a.pseudonym}`).fill(text);
  await main(pb).getByRole("button", { name: "Senden" }).click();
  await expect(main(pb).getByText(text)).toBeVisible();
  await expect(main(page).getByText(text)).toBeVisible({ timeout: 10_000 });

  // A beendet den Kontakt (Bestätigungsdialog erklärt die Folgen)
  await main(page).getByRole("button", { name: "Kontakt beenden" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Kontakt beenden" }).click();
  await expect(page).toHaveURL(/status=beendet/);
  await expect(main(page).getByLabel(`Nachricht an ${b.pseudonym}`)).toHaveCount(0);
  // Verlauf bleibt lesbar (MSG04)
  await expect(main(page).getByText(text)).toBeVisible();
  await pb.reload();
  await expect(main(pb).getByLabel(`Nachricht an ${a.pseudonym}`)).toHaveCount(0);
  await ctxB.close();
});
