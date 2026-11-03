/**
 * F04 Beitrag in einer Gruppe (COM01–COM06, AT04): Mitglied schreibt in einer geschlossenen Gruppe;
 * ein Nichtmitglied sieht weder Gruppe noch Beitrag (neutrale 404) noch Treffer in der Suche.
 */
import { expect, test } from "@playwright/test";
import { login, main } from "./support/auth";
import { createClosedGroup, createMember } from "./support/db";

test("F04: Beitrag in geschlossener Gruppe, für Nichtmitglieder unsichtbar", async ({ page, browser }) => {
  const a = await createMember();
  const b = await createMember();
  const group = await createClosedGroup([a.id]);
  const word = `Sonnenblume${Date.now().toString(36)}`;

  await login(page, a.email);
  await page.goto(`/community/neu?gruppe=${group.slug}`);
  const form = main(page);
  await form.getByLabel("Thema").selectOption({ index: 1 });
  await form.getByLabel("Titel").fill(`${word} im Garten`);
  await form.getByLabel("Dein Text").fill(`Heute habe ich ${word} gepflanzt. Wie geht es euch damit?`);
  await form.getByRole("radio", { name: /geschlossenen Gruppe/ }).filter({ hasText: "" }).first().check();
  await form.getByRole("button", { name: "Vorschau ansehen" }).click();
  await form.getByRole("button", { name: "Beitrag veröffentlichen" }).click();
  await expect(page).toHaveURL(/\/community\/beitrag\/[0-9a-f-]{36}\?status=veroeffentlicht/);
  const postPath = new URL(page.url()).pathname;
  await expect(main(page)).toContainText(word);

  // Nichtmitglied: Direktlink und Gruppe neutral nicht verfügbar, keine Suchtreffer
  const ctx = await browser.newContext();
  const pb = await ctx.newPage();
  await login(pb, b.email);
  // Hinweis: Mit Streaming (Cache Components) bleibt der HTTP-Status 200; angezeigt wird die neutrale Seite.
  const unavailable = pb.getByRole("heading", { level: 1, name: "Diese Seite ist nicht verfügbar." });
  await pb.goto(postPath);
  await expect(unavailable).toBeVisible();
  await expect(pb.getByText(word)).toHaveCount(0);
  await pb.goto(`/community/gruppen/${group.slug}`);
  await expect(unavailable).toBeVisible();
  // Die Suche wiederholt nur den Suchbegriff, zeigt aber weder Titel noch Text des Beitrags
  await pb.goto(`/suche?q=${word}`);
  await expect(pb.getByText(`${word} im Garten`)).toHaveCount(0);
  await expect(pb.getByText("gepflanzt")).toHaveCount(0);
  await pb.goto("/community");
  await expect(pb.getByText(word)).toHaveCount(0);
  await ctx.close();
});
