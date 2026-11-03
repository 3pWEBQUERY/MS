/**
 * F06 Melden (SAF02, SAF03, AT07): Mitglied meldet einen Beitrag und erhält eine Belegnummer;
 * die Moderationsleitung sieht den Fall nach Anmeldung mit zweitem Faktor (ACC05), ohne
 * Melderidentität. Ohne MFA kein Zugang zur Verwaltung.
 */
import { expect, test } from "@playwright/test";
import { login, loginStaff, main } from "./support/auth";
import { createMember, sql } from "./support/db";

test("F06: Meldung mit Belegnummer, Fall in der Verwaltung mit MFA sichtbar", async ({ page, browser }) => {
  const author = await createMember();
  const reporter = await createMember();
  const lead = await createMember({ roles: ["moderation_lead", "moderator"] });
  const [topic] = await sql<{ id: string }[]>`select id from community.topics order by sort limit 1`;
  const [post] = await sql<{ id: string }[]>`
    insert into community.posts (author_id, topic_id, title, body) values (${author.id}, ${topic!.id}, 'Gemeldeter Testbeitrag', 'Werbung für ein Wundermittel') returning id`;

  await login(page, reporter.email);
  await page.goto(`/melden?typ=post&id=${post!.id}`);
  await main(page).getByRole("radio", { name: /Spam oder Betrug/ }).check();
  await main(page).getByRole("button", { name: "Meldung senden" }).click();
  const receipt = main(page).getByText(/M-[A-Z0-9-]{4,}/).first();
  await expect(receipt).toBeVisible();
  const receiptNumber = (await receipt.innerText()).match(/M-[A-Z0-9-]+/)![0];
  const [kase] = await sql<{ case_number: string; id: string }[]>`
    select c.case_number, c.id from moderation.reports r join moderation.cases c on c.id = r.case_id where r.receipt_number = ${receiptNumber}`;
  expect(kase).toBeTruthy();

  // Ohne zweiten Faktor: Verwaltung nicht erreichbar
  const ctx = await browser.newContext();
  const ps = await ctx.newPage();
  await login(ps, lead.email, "/verwaltung/moderation");
  await expect(ps).toHaveURL(/\/anmelden\/mfa/);
  await ctx.close();

  const ctx2 = await browser.newContext();
  const pl = await ctx2.newPage();
  await loginStaff(pl, lead.email, "/verwaltung/moderation");
  await expect(pl).toHaveURL(/\/verwaltung\/moderation/);
  await pl.goto("/verwaltung/moderation?ansicht=unassigned");
  await expect(main(pl).getByText(kase!.case_number).first()).toBeVisible();
  await pl.goto(`/verwaltung/moderation/${kase!.id}`);
  await expect(main(pl)).toContainText(kase!.case_number);
  await expect(main(pl)).toContainText("Werbung für ein Wundermittel");
  await expect(main(pl)).not.toContainText(reporter.pseudonym);
  await ctx2.close();
});
