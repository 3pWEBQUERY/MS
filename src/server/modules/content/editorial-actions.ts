"use server";

import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { articles, articleVersions, editorialReviews, knowledgeTopics, mediaAssets, sourceReferences } from "../../db/schema";
import { isVersionAuthor } from "./editorial-queries";
import { ARTICLE_REVIEW_MAX_MONTHS, EDITABLE_STATUSES } from "./shared";
import { actingRole, addMonths, EDITOR_ROLES, isUuid, parseDateInput, REVIEWER_ROLES, WITHDRAW_ROLES } from "./staff";

/**
 * Redaktionelle Freigabe (CON02, CON03, US25, AT08).
 * Entwurf → in Prüfung → (Änderungen nötig →) freigegeben → publiziert → zurückgezogen/archiviert.
 * Jede inhaltliche Änderung nach Freigabe erzeugt eine neue Version; die bisher publizierte
 * bleibt öffentlich, bis die neue Version geprüft und publiziert ist.
 */

const versionSchema = z.object({
  title: z.string().min(5, "Der Titel braucht mindestens 5 Zeichen.").max(140, "Höchstens 140 Zeichen."),
  summary: z.string().min(20, "Die Kurzfassung braucht mindestens 20 Zeichen.").max(600, "Höchstens 600 Zeichen."),
  body: z.string().min(100, "Der Text braucht mindestens 100 Zeichen.").max(40000, "Höchstens 40 000 Zeichen."),
  authorDisplay: z.string().min(2, "Bitte gib die angezeigte Autorenschaft an.").max(80, "Höchstens 80 Zeichen."),
  topicId: z.string().refine(isUuid, "Bitte wähle ein Thema."),
  readingMinutes: z.coerce.number().int("Ganze Minuten").min(1, "Mindestens 1 Minute.").max(60, "Höchstens 60 Minuten."),
  isMedical: z.boolean(),
  coverMediaId: z.string().refine((v) => v === "" || isUuid(v), "Ungültiges Bild."),
});

const VERSION_KEYS = ["title", "summary", "body", "authorDisplay", "topicId", "readingMinutes", "coverMediaId"] as const;

function readVersion(formData: FormData) {
  const values: Record<string, string> = {};
  for (const k of VERSION_KEYS) values[k] = str(formData, k);
  values.title = cleanText(values.title).replace(/\s+/g, " ");
  values.summary = cleanText(values.summary);
  values.body = cleanText(String(formData.get("body") ?? ""));
  values.authorDisplay = cleanText(values.authorDisplay).replace(/\s+/g, " ");
  const isMedical = formData.get("isMedical") === "on";
  values.isMedical = isMedical ? "on" : "";
  return { values, isMedical };
}

async function assertTopicAndCover(topicId: string, coverMediaId: string) {
  const [topic] = await db.select({ id: knowledgeTopics.id }).from(knowledgeTopics).where(eq(knowledgeTopics.id, topicId));
  if (!topic) throw new UserError("Bitte wähle ein gültiges Thema.", { topicId: "Bitte wähle ein gültiges Thema." });
  if (coverMediaId) {
    const [media] = await db.select({ alt: mediaAssets.altText }).from(mediaAssets).where(eq(mediaAssets.id, coverMediaId));
    if (!media) throw new UserError("Das gewählte Bild ist nicht mehr vorhanden.", { coverMediaId: "Bild nicht gefunden." });
  }
}

async function loadVersion(versionId: string) {
  if (!isUuid(versionId)) throw new UserError("Diese Version ist nicht verfügbar.");
  const [v] = await db
    .select({
      id: articleVersions.id,
      articleId: articleVersions.articleId,
      versionNo: articleVersions.versionNo,
      status: articleVersions.status,
      authorId: articleVersions.authorId,
      isMedical: articleVersions.isMedical,
      reviewDueAt: articleVersions.reviewDueAt,
      version: articleVersions.version,
    })
    .from(articleVersions)
    .where(eq(articleVersions.id, versionId));
  if (!v) throw new UserError("Diese Version ist nicht verfügbar.");
  return v;
}

/* ───────────── Artikel anlegen ───────────── */

export async function createArticleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { values, isMedical } = readVersion(formData);
  const slug = str(formData, "slug").toLowerCase();
  values.slug = slug;
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const parsed = versionSchema.safeParse({ ...values, isMedical });
    const fieldErrors = parsed.success ? {} : zodFieldErrors(parsed.error.issues);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
      fieldErrors.slug = "Nur Kleinbuchstaben, Ziffern und Bindestriche, z. B. «fatigue-im-alltag».";
    if (!parsed.success || Object.keys(fieldErrors).length) return fail("Bitte prüfe die markierten Felder.", { fieldErrors, values });
    const d = parsed.data;
    await assertTopicAndCover(d.topicId, d.coverMediaId);
    const [exists] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
    if (exists) return fail("Diese Adresse ist bereits vergeben.", { fieldErrors: { slug: "Bereits vergeben." }, values });

    const role = actingRole(viewer, EDITOR_ROLES);
    const articleId = await db.transaction(async (tx) => {
      const [a] = await tx.insert(articles).values({ slug, topicId: d.topicId }).returning({ id: articles.id });
      const [v] = await tx
        .insert(articleVersions)
        .values({
          articleId: a.id,
          versionNo: 1,
          title: d.title,
          summary: d.summary,
          body: d.body,
          authorId: viewer.accountId,
          authorDisplay: d.authorDisplay,
          status: "draft",
          isMedical: d.isMedical,
          readingMinutes: d.readingMinutes,
          coverMediaId: d.coverMediaId || null,
        })
        .returning({ id: articleVersions.id });
      await audit({ actorId: viewer.accountId, actorRole: role, action: "article.created", objectType: "article_version", objectId: v.id }, tx);
      return a.id;
    });
    redirect(`/verwaltung/redaktion/artikel/${articleId}?status=angelegt`);
  }, values);
}

/* ───────────── Version bearbeiten ───────────── */

export async function saveVersionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { values, isMedical } = readVersion(formData);
  const versionId = str(formData, "versionId");
  const readVersionNo = Number(str(formData, "version"));
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const parsed = versionSchema.safeParse({ ...values, isMedical });
    if (!parsed.success) return fail("Bitte prüfe die markierten Felder.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });
    const d = parsed.data;
    const v = await loadVersion(versionId);
    // CON02: Nur Entwürfe und zurückgegebene Versionen sind bearbeitbar.
    if (!EDITABLE_STATUSES.includes(v.status))
      throw new UserError("Diese Version ist gesperrt. Lege für Änderungen eine neue Version an.");
    await assertTopicAndCover(d.topicId, d.coverMediaId);
    const role = actingRole(viewer, EDITOR_ROLES);
    const topicChanged = await db.transaction(async (tx) => {
      const updated = await tx
        .update(articleVersions)
        .set({
          title: d.title,
          summary: d.summary,
          body: d.body,
          authorDisplay: d.authorDisplay,
          isMedical: d.isMedical,
          readingMinutes: d.readingMinutes,
          coverMediaId: d.coverMediaId || null,
          version: v.version + 1,
        })
        .where(and(eq(articleVersions.id, v.id), eq(articleVersions.version, readVersionNo), inArray(articleVersions.status, EDITABLE_STATUSES)))
        .returning({ id: articleVersions.id });
      if (updated.length === 0)
        throw new UserError("Diese Version wurde inzwischen von jemand anderem geändert. Lade die Seite neu, um den aktuellen Stand zu sehen.", undefined, { conflict: true });
      const [a] = await tx.select({ topicId: articles.topicId }).from(articles).where(eq(articles.id, v.articleId));
      if (a && a.topicId !== d.topicId) await tx.update(articles).set({ topicId: d.topicId }).where(eq(articles.id, v.articleId));
      await audit({ actorId: viewer.accountId, actorRole: role, action: "article.version_saved", objectType: "article_version", objectId: v.id }, tx);
      return Boolean(a && a.topicId !== d.topicId);
    });
    // Das Thema gilt sofort auch für die öffentliche Version.
    if (topicChanged) updateTag("articles");
    redirect(`/verwaltung/redaktion/artikel/${v.articleId}?status=gespeichert`);
  }, values);
}

/** Neue Version auf Basis der letzten Version (nach Freigabe, Publikation oder Rückzug). */
export async function newVersionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const articleId = str(formData, "articleId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(articleId)) throw new UserError("Dieser Artikel ist nicht verfügbar.");
    const role = actingRole(viewer, EDITOR_ROLES);
    await db.transaction(async (tx) => {
      const [latest] = await tx
        .select()
        .from(articleVersions)
        .where(eq(articleVersions.articleId, articleId))
        .orderBy(desc(articleVersions.versionNo))
        .limit(1)
        .for("update");
      if (!latest) throw new UserError("Dieser Artikel ist nicht verfügbar.");
      if ([...EDITABLE_STATUSES, "in_review"].includes(latest.status))
        throw new UserError("Es gibt bereits eine offene Version. Bearbeite zuerst diese.");
      const [nv] = await tx
        .insert(articleVersions)
        .values({
          articleId,
          versionNo: latest.versionNo + 1,
          title: latest.title,
          summary: latest.summary,
          body: latest.body,
          authorId: viewer.accountId,
          authorDisplay: latest.authorDisplay,
          status: "draft",
          isMedical: latest.isMedical,
          readingMinutes: latest.readingMinutes,
          coverMediaId: latest.coverMediaId,
        })
        .returning({ id: articleVersions.id });
      const srcs = await tx
        .select()
        .from(sourceReferences)
        .where(eq(sourceReferences.versionId, latest.id))
        .orderBy(asc(sourceReferences.sort));
      if (srcs.length)
        await tx.insert(sourceReferences).values(
          srcs.map((s) => ({
            versionId: nv.id,
            title: s.title,
            publisher: s.publisher,
            url: s.url,
            publishedOn: s.publishedOn,
            rightsNote: s.rightsNote,
            sort: s.sort,
          })),
        );
      await audit({ actorId: viewer.accountId, actorRole: role, action: "article.version_created", objectType: "article_version", objectId: nv.id }, tx);
    });
    redirect(`/verwaltung/redaktion/artikel/${articleId}?status=neue-version`);
  });
}

/* ───────────── Quellen ───────────── */

const sourceSchema = z.object({
  title: z.string().min(3, "Bitte gib den Titel der Quelle an.").max(200, "Höchstens 200 Zeichen."),
  publisher: z.string().min(2, "Bitte gib den Herausgeber an.").max(120, "Höchstens 120 Zeichen."),
  url: z
    .string()
    .max(500, "Höchstens 500 Zeichen.")
    .refine((v) => v === "" || /^https:\/\/[^\s<>"']+$/.test(v), "Nur vollständige https-Adressen."),
  publishedOn: z.string().max(40, "Höchstens 40 Zeichen."),
  rightsNote: z.string().max(200, "Höchstens 200 Zeichen."),
});

export async function addSourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    title: cleanText(str(formData, "title")),
    publisher: cleanText(str(formData, "publisher")),
    url: str(formData, "url"),
    publishedOn: cleanText(str(formData, "publishedOn")),
    rightsNote: cleanText(str(formData, "rightsNote")),
  };
  const versionId = str(formData, "versionId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const parsed = sourceSchema.safeParse(values);
    if (!parsed.success) return fail("Bitte prüfe die Angaben zur Quelle.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });
    const v = await loadVersion(versionId);
    if (!EDITABLE_STATUSES.includes(v.status)) throw new UserError("Quellen können nur in einem Entwurf geändert werden.");
    const existing = await db.select({ sort: sourceReferences.sort }).from(sourceReferences).where(eq(sourceReferences.versionId, v.id));
    if (existing.length >= 20) throw new UserError("Höchstens 20 Quellen je Version.");
    await db.transaction(async (tx) => {
      await tx.insert(sourceReferences).values({
        versionId: v.id,
        title: parsed.data.title,
        publisher: parsed.data.publisher,
        url: parsed.data.url || null,
        publishedOn: parsed.data.publishedOn || null,
        rightsNote: parsed.data.rightsNote || null,
        sort: Math.max(0, ...existing.map((e) => e.sort)) + 1,
      });
      await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "article.source_added", objectType: "article_version", objectId: v.id }, tx);
    });
    redirect(`/verwaltung/redaktion/artikel/${v.articleId}?status=quelle`);
  }, values);
}

export async function removeSourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const sourceId = str(formData, "sourceId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(sourceId)) throw new UserError("Diese Quelle ist nicht verfügbar.");
    const [src] = await db.select({ versionId: sourceReferences.versionId }).from(sourceReferences).where(eq(sourceReferences.id, sourceId));
    if (!src) throw new UserError("Diese Quelle ist nicht verfügbar.");
    const v = await loadVersion(src.versionId);
    if (!EDITABLE_STATUSES.includes(v.status)) throw new UserError("Quellen können nur in einem Entwurf geändert werden.");
    await db.transaction(async (tx) => {
      await tx.delete(sourceReferences).where(eq(sourceReferences.id, sourceId));
      await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "article.source_removed", objectType: "article_version", objectId: v.id }, tx);
    });
    redirect(`/verwaltung/redaktion/artikel/${v.articleId}?status=quelle-entfernt`);
  });
}

/* ───────────── Prüfauftrag ───────────── */

export async function submitForReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const versionId = str(formData, "versionId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const v = await loadVersion(versionId);
    if (!EDITABLE_STATUSES.includes(v.status)) throw new UserError("Nur Entwürfe können zur Prüfung gesendet werden.");
    const sources = await db.select({ id: sourceReferences.id }).from(sourceReferences).where(eq(sourceReferences.versionId, v.id));
    // CON01/PRD 09: Medizinische Inhalte brauchen belegte Quellen.
    if (v.isMedical && sources.length === 0) throw new UserError("Medizinische Artikel brauchen mindestens eine Quelle, bevor sie geprüft werden können.");
    await db.transaction(async (tx) => {
      const res = await tx
        .update(articleVersions)
        .set({ status: "in_review", version: v.version + 1 })
        .where(and(eq(articleVersions.id, v.id), eq(articleVersions.version, v.version)))
        .returning({ id: articleVersions.id });
      if (!res.length) throw new UserError("Die Version wurde inzwischen geändert. Bitte lade die Seite neu.");
      await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "article.review_requested", objectType: "article_version", objectId: v.id }, tx);
    });
    redirect(`/verwaltung/redaktion/artikel/${v.articleId}?status=pruefung`);
  });
}

/* ───────────── Fachliche Prüfung ───────────── */

const reviewSchema = z.object({
  decision: z.enum(["approved", "changes_requested"], { message: "Bitte wähle einen Entscheid." }),
  reviewerDisplay: z.string().min(2, "Bitte gib die angezeigte Prüfstelle an.").max(120, "Höchstens 120 Zeichen."),
  specialty: z.string().min(2, "Bitte gib das Fachgebiet an.").max(80, "Höchstens 80 Zeichen."),
  comment: z.string().max(2000, "Höchstens 2 000 Zeichen."),
  nextReviewDueAt: z.string(),
});

export async function reviewVersionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    decision: str(formData, "decision"),
    reviewerDisplay: cleanText(str(formData, "reviewerDisplay")),
    specialty: cleanText(str(formData, "specialty")),
    comment: cleanText(String(formData.get("comment") ?? "")),
    nextReviewDueAt: str(formData, "nextReviewDueAt"),
  };
  const versionId = str(formData, "versionId");
  return runAction(async () => {
    // Prüfrolle; nicht-medizinische Artikel dürfen auch von einer anderen Person der Redaktion geprüft werden.
    const viewer = await actionStaff([...REVIEWER_ROLES, ...EDITOR_ROLES]);
    const parsed = reviewSchema.safeParse(values);
    if (!parsed.success) return fail("Bitte prüfe die markierten Felder.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });
    const d = parsed.data;
    const v = await loadVersion(versionId);
    const isReviewer = viewer.roles.includes("medical_reviewer");
    if (v.isMedical && !isReviewer) throw new UserError("Medizinische Artikel können nur von der medizinischen Prüfung freigegeben werden.");
    // CON01/US25: Wer eine frühere Fassung als medizinisch geführt hat, kann die Fachprüfung nicht durch Abwählen umgehen.
    if (!v.isMedical && !isReviewer) {
      const [wasMedical] = await db
        .select({ id: articleVersions.id })
        .from(articleVersions)
        .where(and(eq(articleVersions.articleId, v.articleId), eq(articleVersions.isMedical, true), ne(articleVersions.id, v.id)))
        .limit(1);
      if (wasMedical)
        throw new UserError("Eine frühere Fassung dieses Artikels war medizinisch. Die Einstufung als nicht medizinisch prüft die medizinische Prüfung.");
    }
    if (v.status !== "in_review") throw new UserError("Diese Version wartet nicht auf eine Prüfung.");
    // CON02: Keine Eigenfreigabe – auch nicht durch Personen, die an der Version mitgeschrieben haben.
    if (await isVersionAuthor(v.id, v.authorId, viewer.accountId))
      throw new UserError("Du hast an dieser Version mitgeschrieben. Die Prüfung muss eine andere Person übernehmen.");

    let due: Date | null = null;
    if (d.decision === "approved") {
      due = parseDateInput(d.nextReviewDueAt);
      const max = addMonths(new Date(), ARTICLE_REVIEW_MAX_MONTHS);
      if (!due || due.getTime() <= Date.now())
        return fail("Bitte prüfe die markierten Felder.", { fieldErrors: { nextReviewDueAt: "Bitte wähle ein Datum in der Zukunft." }, values });
      if (due.getTime() > max.getTime() + 86400_000)
        return fail("Bitte prüfe die markierten Felder.", { fieldErrors: { nextReviewDueAt: "Spätestens in zwölf Monaten (CON03)." }, values });
    } else if (d.comment.length < 10) {
      return fail("Bitte prüfe die markierten Felder.", { fieldErrors: { comment: "Bitte beschreibe, was geändert werden muss." }, values });
    }

    const role = isReviewer ? "medical_reviewer" : actingRole(viewer, EDITOR_ROLES);
    try {
      await db.transaction(async (tx) => {
        const res = await tx
          .update(articleVersions)
          .set({
            status: d.decision === "approved" ? "approved" : "changes_requested",
            reviewDueAt: d.decision === "approved" ? due : null,
            version: v.version + 1,
          })
          .where(and(eq(articleVersions.id, v.id), eq(articleVersions.version, v.version), eq(articleVersions.status, "in_review")))
          .returning({ id: articleVersions.id });
        if (!res.length) throw new UserError("Diese Version wurde inzwischen geändert. Bitte lade die Seite neu.");
        await tx.insert(editorialReviews).values({
          versionId: v.id,
          reviewerId: viewer.accountId,
          reviewerDisplay: d.reviewerDisplay,
          specialty: d.specialty,
          decision: d.decision,
          comment: d.comment || null,
          nextReviewDueAt: due,
        });
        await audit(
          {
            actorId: viewer.accountId,
            actorRole: role,
            action: d.decision === "approved" ? "article.review_approved" : "article.review_changes_requested",
            objectType: "article_version",
            objectId: v.id,
          },
          tx,
        );
      });
    } catch (err) {
      // Zusätzlich sichert ein Datenbank-Trigger das Vieraugenprinzip.
      if (err instanceof Error && /Eigenfreigabe/.test(err.message)) throw new UserError("Eigenfreigabe ist ausgeschlossen.");
      throw err;
    }
    redirect(`/verwaltung/redaktion/artikel/${v.articleId}?status=${d.decision === "approved" ? "freigegeben" : "zurueckgegeben"}`);
  }, values);
}

/* ───────────── Publikation, Rückzug, Archiv ───────────── */

export async function publishVersionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const versionId = str(formData, "versionId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const v = await loadVersion(versionId);
    // CON02: Nur eine bereits freigegebene Version kann publiziert werden.
    if (v.status !== "approved") throw new UserError("Nur freigegebene Versionen können publiziert werden.");
    if (!v.reviewDueAt || v.reviewDueAt.getTime() <= Date.now())
      throw new UserError("Der Prüftermin dieser Freigabe ist abgelaufen. Die Version muss erneut geprüft werden.");
    const [approval] = await db
      .select({ id: editorialReviews.id })
      .from(editorialReviews)
      .where(and(eq(editorialReviews.versionId, v.id), eq(editorialReviews.decision, "approved")))
      .limit(1);
    if (!approval) throw new UserError("Für diese Version fehlt eine dokumentierte Freigabe.");
    const role = actingRole(viewer, EDITOR_ROLES);
    await db.transaction(async (tx) => {
      const [a] = await tx
        .select({ publishedVersionId: articles.publishedVersionId })
        .from(articles)
        .where(eq(articles.id, v.articleId))
        .for("update");
      const res = await tx
        .update(articleVersions)
        .set({ status: "published", publishedAt: new Date(), version: v.version + 1 })
        .where(and(eq(articleVersions.id, v.id), eq(articleVersions.status, "approved"), eq(articleVersions.version, v.version)))
        .returning({ id: articleVersions.id });
      if (!res.length) throw new UserError("Diese Version wurde inzwischen geändert. Bitte lade die Seite neu.");
      // Die bisher publizierte Version wird ersetzt und archiviert; zurückgezogene bleiben dokumentiert.
      if (a?.publishedVersionId && a.publishedVersionId !== v.id) {
        await tx
          .update(articleVersions)
          .set({ status: "archived" })
          .where(and(eq(articleVersions.id, a.publishedVersionId), eq(articleVersions.status, "published")));
      }
      await tx.update(articles).set({ publishedVersionId: v.id }).where(eq(articles.id, v.articleId));
      await audit({ actorId: viewer.accountId, actorRole: role, action: "article.published", objectType: "article_version", objectId: v.id }, tx);
    });
    updateTag("articles");
    redirect(`/verwaltung/redaktion/artikel/${v.articleId}?status=publiziert`);
  });
}

export async function withdrawArticleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { reason: cleanText(String(formData.get("reason") ?? "")) };
  const articleId = str(formData, "articleId");
  return runAction(async () => {
    const viewer = await actionStaff(WITHDRAW_ROLES);
    if (values.reason.length < 5)
      return fail("Bitte gib einen Grund an.", { fieldErrors: { reason: "Bitte gib einen kurzen Grund an (intern)." }, values });
    if (values.reason.length > 500) return fail("Höchstens 500 Zeichen.", { fieldErrors: { reason: "Höchstens 500 Zeichen." }, values });
    if (!isUuid(articleId)) throw new UserError("Dieser Artikel ist nicht verfügbar.");
    const role = actingRole(viewer, WITHDRAW_ROLES);
    await db.transaction(async (tx) => {
      const [a] = await tx.select({ pv: articles.publishedVersionId }).from(articles).where(eq(articles.id, articleId)).for("update");
      if (!a?.pv) throw new UserError("Dieser Artikel ist nicht publiziert.");
      // CON03: Dringende Korrektur – Rückzug wirkt sofort, Metadaten bleiben intern dokumentiert.
      const res = await tx
        .update(articleVersions)
        .set({ status: "withdrawn", withdrawnAt: new Date(), withdrawReason: values.reason })
        .where(and(eq(articleVersions.id, a.pv), eq(articleVersions.status, "published")))
        .returning({ id: articleVersions.id });
      if (!res.length) throw new UserError("Dieser Artikel ist bereits zurückgezogen.");
      await audit({ actorId: viewer.accountId, actorRole: role, action: "article.withdrawn", objectType: "article_version", objectId: a.pv }, tx);
    });
    updateTag("articles");
    redirect(`/verwaltung/redaktion/artikel/${articleId}?status=zurueckgezogen`);
  }, values);
}

export async function archiveArticleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const articleId = str(formData, "articleId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(articleId)) throw new UserError("Dieser Artikel ist nicht verfügbar.");
    await db.transaction(async (tx) => {
      const [live] = await tx
        .select({ id: articleVersions.id })
        .from(articleVersions)
        .where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.status, "published")));
      if (live) throw new UserError("Ziehe den Artikel zuerst zurück, bevor du ihn archivierst.");
      const res = await tx
        .update(articleVersions)
        .set({ status: "archived" })
        .where(and(eq(articleVersions.articleId, articleId), ne(articleVersions.status, "archived"), ne(articleVersions.status, "withdrawn")))
        .returning({ id: articleVersions.id });
      const [latest] = await tx
        .select({ id: articleVersions.id })
        .from(articleVersions)
        .where(eq(articleVersions.articleId, articleId))
        .orderBy(desc(articleVersions.versionNo))
        .limit(1);
      if (!latest) throw new UserError("Dieser Artikel ist nicht verfügbar.");
      // Zurückgezogene Versionen bleiben als solche dokumentiert; die neueste wird jedenfalls archiviert.
      if (!res.some((r) => r.id === latest.id)) await tx.update(articleVersions).set({ status: "archived" }).where(eq(articleVersions.id, latest.id));
      await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "article.archived", objectType: "article", objectId: articleId }, tx);
    });
    redirect(`/verwaltung/redaktion/artikel/${articleId}?status=archiviert`);
  });
}
