/**
 * QA06 / AT08 – Redaktion gegen die echte Datenbank: neue Fassung bleibt unpubliziert bis zur
 * Fremdprüfung (Vieraugenprinzip in Action und DB-Trigger), abgelaufener Prüftermin entfernt den
 * Artikel aus Suche, Detailansicht und gespeicherten Verweisen; der Worker zieht ihn zurück.
 */
import { randomUUID } from "node:crypto";
import { sql as dsql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { articles, articleVersions, editorialReviews, knowledgeTopics } from "@/server/db/schema";
import { getPublicArticle, getVisibleArticleRefs } from "@/server/modules/content/articles";
import { newVersionAction, reviewVersionAction } from "@/server/modules/content/editorial-actions";
import { searchKnowledge } from "@/server/modules/content/search";
import { contentTasks } from "@/worker/handlers/content";
import { createMember, form, pgError, redirectTarget, rows, signIn } from "./fixtures";

const idle = { status: "idle" } as const;
const inDays = (d: number) => new Date(Date.now() + d * 86400_000);
const dateInput = (d: Date) => d.toISOString().slice(0, 10);

async function publishedArticle(authorId: string, reviewerId: string, word: string) {
  const tag = randomUUID().slice(0, 8);
  const [topic] = await db.insert(knowledgeTopics).values({ slug: `thema-${tag}`, name: "Testthema", description: "Test" }).returning({ id: knowledgeTopics.id });
  const [article] = await db.insert(articles).values({ slug: `artikel-${tag}`, topicId: topic!.id }).returning({ id: articles.id });
  const [v1] = await db
    .insert(articleVersions)
    .values({
      articleId: article!.id,
      versionNo: 1,
      title: `${word} im Alltag`,
      summary: "Geprüfte Fassung",
      body: `Text über ${word}.`,
      authorId,
      authorDisplay: "Redaktion",
      status: "published",
      isMedical: true,
      reviewDueAt: inDays(90),
      publishedAt: new Date(),
    })
    .returning({ id: articleVersions.id });
  await db.insert(editorialReviews).values({ versionId: v1!.id, reviewerId, reviewerDisplay: "Prüfung", specialty: "Neurologie", decision: "approved" });
  await db.update(articles).set({ publishedVersionId: v1!.id }).where(dsql`${articles.id} = ${article!.id}`);
  return { articleId: article!.id, slug: `artikel-${tag}`, v1: v1!.id };
}

describe("AT08 Redaktion", () => {
  it("geänderte medizinische Fassung bleibt unpubliziert bis zur Fremdprüfung; Eigenfreigabe scheitert in Action und Trigger", async () => {
    // Autorin hat zusätzlich die Prüfrolle – die Vieraugenregel muss trotzdem greifen
    const author = await createMember({ roles: ["editor", "medical_reviewer"] });
    const reviewer = await createMember({ roles: ["medical_reviewer"] });
    const art = await publishedArticle(author.id, reviewer.id, "Kühlwesten");

    await signIn(author.id);
    expect(await redirectTarget(newVersionAction(idle, form({ articleId: art.articleId })))).toContain("neue-version");
    const [v2] = await rows<{ id: string; status: string }>(
      dsql`select id, status from content.article_versions where article_id = ${art.articleId} and version_no = 2`,
    );
    expect(v2!.status).toBe("draft");
    await db.execute(dsql`update content.article_versions set title = 'Neue Fassung', status = 'in_review' where id = ${v2!.id}`);
    expect((await getPublicArticle(art.slug))!.title).toBe("Kühlwesten im Alltag");

    const review = { versionId: v2!.id, decision: "approved", reviewerDisplay: "Prüfung", specialty: "Neurologie", comment: "", nextReviewDueAt: dateInput(inDays(60)) };
    const self = await reviewVersionAction(idle, form(review));
    expect(self.status).toBe("error");
    expect(self.message).toMatch(/mitgeschrieben/);
    expect(await pgError(db.insert(editorialReviews).values({ versionId: v2!.id, reviewerId: author.id, reviewerDisplay: "x", specialty: "y", decision: "approved" }))).toMatch(
      /Eigenfreigabe ist ausgeschlossen/,
    );

    await signIn(reviewer.id);
    expect(await redirectTarget(reviewVersionAction(idle, form(review)))).toContain(`/verwaltung/redaktion/artikel/${art.articleId}`);
    const [after] = await rows<{ status: string }>(dsql`select status from content.article_versions where id = ${v2!.id}`);
    expect(after!.status).toBe("approved");
    // freigegeben, aber erst nach Publikation öffentlich
    expect((await getPublicArticle(art.slug))!.title).toBe("Kühlwesten im Alltag");
  });

  it("abgelaufener Prüftermin: weg aus Suche, Detail und gespeicherten Verweisen; Worker zieht zurück", async () => {
    const author = await createMember({ roles: ["editor"] });
    const reviewer = await createMember({ roles: ["medical_reviewer"] });
    const word = `Zimtschnecke${randomUUID().slice(0, 4)}`;
    const art = await publishedArticle(author.id, reviewer.id, word);
    expect((await searchKnowledge(word)).total).toBe(1);
    expect((await getVisibleArticleRefs([art.articleId])).has(art.articleId)).toBe(true);

    await db.execute(dsql`update content.article_versions set review_due_at = now() - interval '1 day' where id = ${art.v1}`);
    expect((await searchKnowledge(word)).total).toBe(0);
    expect(await getPublicArticle(art.slug)).toBeNull();
    expect((await getVisibleArticleRefs([art.articleId])).size).toBe(0);

    await contentTasks.find((t) => t.name === "content-withdraw-overdue-articles")!.run();
    const [v] = await rows<{ status: string; withdrawn_at: Date | null }>(
      dsql`select status, withdrawn_at from content.article_versions where id = ${art.v1}`,
    );
    expect(v!.status).toBe("withdrawn");
    expect(v!.withdrawn_at).not.toBeNull();
    const [audited] = await rows<{ n: number }>(
      dsql`select count(*)::int as n from ops.audit_events where action = 'article.withdrawn_overdue' and object_id = ${art.v1}`,
    );
    expect(audited!.n).toBe(1);
  });
});
