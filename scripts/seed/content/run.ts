import { and, eq, inArray } from "drizzle-orm";
import * as s from "../../../src/server/db/schema";
import { HELP_TOPICS } from "../../../src/lib/catalog";
import { DEFAULT_MOMENT_CONFIG } from "../../../src/lib/moment";
import type { SeedContext } from "../types";
import { ARTICLES_1 } from "./articles-1";
import { ARTICLES_2 } from "./articles-2";
import { LEGAL_PAGES } from "./legal";
import { OFFERS_1 } from "./offers-1";
import { OFFERS_2 } from "./offers-2";
import { SAFETY_CONTACTS, SAFETY_VERIFIER } from "./safety";
import { addMonths, DAY, daysAgo, LINK_ONLY, now, RETRIEVED } from "./shared";
import { KNOWLEDGE_TOPICS } from "./sources";

/**
 * Startbestand für Wissen, Hilfe, Sicherheit, Rechtstexte und Mein Moment (CON08, SAF06, HOM02).
 * Idempotent. Alle Inhalte sind redaktionelle Entwürfe: Die Prüfungen sind als «Demo-Prüfung»
 * gekennzeichnet und müssen vor dem Produktivbetrieb durch die benannte medizinische Redaktion,
 * die Fachprüfung Recht (D01) und für S49 durch Krisenfachpersonen ersetzt werden.
 * Daten liegen nach Verantwortung getrennt in den Nachbardateien.
 */

const ARTICLES = [...ARTICLES_1, ...ARTICLES_2];
const OFFERS = [...OFFERS_1, ...OFFERS_2];

export async function seedContent(ctx: SeedContext): Promise<void> {
  const { db, staff } = ctx;

  // Themen für Hilfe (Katalog) und Wissen
  for (const [i, [slug, name]] of HELP_TOPICS.entries()) {
    await db.insert(s.helpTopics).values({ slug, name, sort: i }).onConflictDoUpdate({ target: s.helpTopics.slug, set: { name, sort: i } });
  }
  const topicIds = new Map<string, string>();
  for (const [i, t] of KNOWLEDGE_TOPICS.entries()) {
    const [row] = await db
      .insert(s.knowledgeTopics)
      .values({ ...t, sort: i })
      .onConflictDoUpdate({ target: s.knowledgeTopics.slug, set: { name: t.name, description: t.description, sort: i } })
      .returning({ id: s.knowledgeTopics.id });
    topicIds.set(t.slug, row.id);
  }

  // Artikel: publiziert, mit Fremdprüfung (Demo) und nächstem Prüftermin in 12 Monaten (CON03)
  for (const [i, a] of ARTICLES.entries()) {
    const topicId = topicIds.get(a.topic);
    if (!topicId) throw new Error(`Unbekanntes Thema ${a.topic}`);
    const reviewedAt = daysAgo(3 + (i % 20));
    const publishedAt = new Date(reviewedAt.getTime() + DAY / 2);
    const reviewDueAt = addMonths(reviewedAt, 12);
    const [existing] = await db.select({ id: s.articles.id, pv: s.articles.publishedVersionId }).from(s.articles).where(eq(s.articles.slug, a.slug));
    let versionId: string;
    if (!existing) {
      const [article] = await db.insert(s.articles).values({ slug: a.slug, topicId }).returning({ id: s.articles.id });
      const [v] = await db
        .insert(s.articleVersions)
        .values({
          articleId: article.id,
          versionNo: 1,
          title: a.title,
          summary: a.summary,
          body: a.body,
          authorId: staff.editor,
          authorDisplay: "Redaktion MS Plattform",
          status: "published",
          isMedical: a.medical,
          readingMinutes: a.minutes,
          reviewDueAt,
          publishedAt,
        })
        .returning({ id: s.articleVersions.id });
      versionId = v.id;
      await db.update(s.articles).set({ publishedVersionId: v.id }).where(eq(s.articles.id, article.id));
    } else {
      // Seed erneut ausgeführt: Text der Seed-Version aktualisieren, Prüftermin auffrischen.
      const [v] = await db
        .select({ id: s.articleVersions.id })
        .from(s.articleVersions)
        .where(and(eq(s.articleVersions.articleId, existing.id), eq(s.articleVersions.versionNo, 1)));
      versionId = v.id;
      await db.update(s.articles).set({ topicId }).where(eq(s.articles.id, existing.id));
      await db
        .update(s.articleVersions)
        .set({ title: a.title, summary: a.summary, body: a.body, isMedical: a.medical, readingMinutes: a.minutes })
        .where(eq(s.articleVersions.id, v.id));
      // Nur die Seed-Version wieder publizieren, wenn keine neuere Version publiziert ist.
      if (!existing.pv || existing.pv === v.id) {
        await db
          .update(s.articleVersions)
          .set({ status: "published", reviewDueAt, publishedAt, withdrawnAt: null, withdrawReason: null })
          .where(eq(s.articleVersions.id, v.id));
        await db.update(s.articles).set({ publishedVersionId: v.id }).where(eq(s.articles.id, existing.id));
      }
      await db.delete(s.sourceReferences).where(eq(s.sourceReferences.versionId, v.id));
    }
    await db.insert(s.sourceReferences).values(
      a.sources.map((src, j) => ({
        versionId,
        title: src.title,
        publisher: src.publisher,
        url: src.url,
        publishedOn: "publishedOn" in src && src.publishedOn ? `${src.publishedOn}, ${RETRIEVED}` : RETRIEVED,
        rightsNote: LINK_ONLY,
        sort: j,
      })),
    );
    const [review] = await db.select({ id: s.editorialReviews.id }).from(s.editorialReviews).where(eq(s.editorialReviews.versionId, versionId));
    if (review) {
      await db.update(s.editorialReviews).set({ specialty: a.specialty, nextReviewDueAt: reviewDueAt, createdAt: reviewedAt }).where(eq(s.editorialReviews.id, review.id));
    } else {
      // Vieraugenprinzip: Autor (Redaktion) ≠ Prüfperson (medizinische Prüfung), DB-Trigger prüft zusätzlich.
      await db.insert(s.editorialReviews).values({
        versionId,
        reviewerId: staff.reviewer,
        reviewerDisplay: "Medizinische Redaktion (Demo-Prüfung)",
        specialty: a.specialty,
        decision: "approved",
        comment: "Demo-Prüfung für die Testumgebung. Vor Produktivbetrieb durch die benannte Prüfperson ersetzen.",
        nextReviewDueAt: reviewDueAt,
        createdAt: reviewedAt,
      });
    }
  }

  // Hilfsangebote: geprüft (Demo) und publiziert, nächste Prüfung spätestens nach sechs Monaten (CON05)
  for (const [i, o] of OFFERS.entries()) {
    const reviewedAt = daysAgo(2 + (i % 25));
    const nextReviewAt = addMonths(reviewedAt, 6);
    const values = {
      slug: o.slug,
      organization: o.organization,
      title: o.title,
      summary: o.summary,
      description: o.description,
      topicSlugs: o.topics,
      cantons: o.cantons,
      languages: o.languages,
      audience: o.audience,
      responsibility: o.responsibility,
      access: o.access,
      costNote: o.costNote ?? "Kosten gemäss Anbieter",
      contactWay: o.contactWay,
      url: o.url,
      status: "published" as const,
      reviewedAt,
      nextReviewAt,
    };
    const { slug: _slug, ...update } = values;
    void _slug;
    const [row] = await db
      .insert(s.supportOffers)
      .values(values)
      .onConflictDoUpdate({ target: s.supportOffers.slug, set: update })
      .returning({ id: s.supportOffers.id });
    const [rec] = await db
      .select({ id: s.verificationRecords.id })
      .from(s.verificationRecords)
      .where(and(eq(s.verificationRecords.targetType, "offer"), eq(s.verificationRecords.targetId, row.id)));
    if (!rec) {
      await db.insert(s.verificationRecords).values({
        targetType: "offer",
        targetId: row.id,
        verifierId: staff.editor,
        method: "website",
        verifiedAt: reviewedAt,
        nextDueAt: nextReviewAt,
        note: "Demo: Abgleich mit der offiziellen Website. Vor Produktivbetrieb beim Anbieter bestätigen.",
      });
    }
  }

  // Sicherheitskontakte (SAF06) – Prüfung vor Produktivbetrieb erforderlich
  const safetyNames = SAFETY_CONTACTS.map((c) => c.name);
  const existingSafety = await db.select({ id: s.safetyContacts.id, name: s.safetyContacts.name }).from(s.safetyContacts).where(inArray(s.safetyContacts.name, safetyNames));
  for (const c of SAFETY_CONTACTS) {
    const values = { ...c, active: true, verifiedAt: now, verifiedBy: SAFETY_VERIFIER, nextDueAt: new Date(now.getTime() + 30 * DAY) };
    const found = existingSafety.find((e) => e.name === c.name);
    let id = found?.id;
    if (id) await db.update(s.safetyContacts).set(values).where(eq(s.safetyContacts.id, id));
    else id = (await db.insert(s.safetyContacts).values(values).returning({ id: s.safetyContacts.id }))[0].id;
    const [rec] = await db
      .select({ id: s.verificationRecords.id })
      .from(s.verificationRecords)
      .where(and(eq(s.verificationRecords.targetType, "safety_contact"), eq(s.verificationRecords.targetId, id)));
    if (!rec) {
      await db.insert(s.verificationRecords).values({
        targetType: "safety_contact",
        targetId: id,
        verifierId: staff.editor,
        method: "website",
        verifiedAt: now,
        nextDueAt: new Date(now.getTime() + 30 * DAY),
        note: "Demo-Eintrag. Prüfung vor Produktivbetrieb durch Krisenfachpersonen erforderlich (PRD 10).",
      });
    }
  }

  // Rechtstexte (S50)
  for (const p of LEGAL_PAGES) {
    await db
      .insert(s.pages)
      .values(p)
      .onConflictDoUpdate({ target: s.pages.slug, set: { title: p.title, body: p.body, textVersion: p.textVersion, validFrom: p.validFrom } });
  }

  // Mein Moment: eine aktive Version mit der Standardkonfiguration (HOM02)
  const [rule] = await db.select({ id: s.momentRules.id }).from(s.momentRules).limit(1);
  if (!rule) {
    await db.insert(s.momentRules).values({
      versionLabel: "Standard 2026-11",
      active: true,
      config: DEFAULT_MOMENT_CONFIG,
      createdBy: staff.editor,
      publishedAt: now,
    });
  }

  console.log(`Inhalte: ${ARTICLES.length} Artikel, ${OFFERS.length} Angebote, ${SAFETY_CONTACTS.length} Sicherheitskontakte, ${LEGAL_PAGES.length} Rechtstexte.`);
}
