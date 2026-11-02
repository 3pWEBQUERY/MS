import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, version } from "./_shared";
import { accounts } from "./identity";

/** Wissen, Unterstützungsverzeichnis, Sicherheitsseite, Medien, Kontakt, Mein Moment (CON01–CON08, HOM02, SAF06). */
export const content = pgSchema("content");

export const articleStatus = content.enum("article_status", [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "published",
  "withdrawn",
  "archived",
]);

export const reviewDecision = content.enum("review_decision", ["approved", "changes_requested"]);

export const offerStatus = content.enum("offer_status", ["draft", "in_review", "published", "hidden", "expired"]);

export const knowledgeTopics = content.table("knowledge_topics", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const helpTopics = content.table("help_topics", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sort: integer("sort").notNull().default(0),
});

export const mediaAssets = content.table("media_assets", {
  id: id(),
  /** Objektschlüssel im Railway Bucket */
  objectKey: text("object_key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text").notNull().default(""),
  uploadedBy: uuid("uploaded_by").references(() => accounts.id),
  createdAt: createdAt(),
});

export const articles = content.table("articles", {
  id: id(),
  slug: text("slug").notNull().unique(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => knowledgeTopics.id),
  /** Aktuell öffentliche, freigegebene Version */
  publishedVersionId: uuid("published_version_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const articleVersions = content.table(
  "article_versions",
  {
    id: id(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    /** Einfaches Textformat: Absätze, «## » Zwischentitel, «- » Listen */
    body: text("body").notNull(),
    authorId: uuid("author_id").references(() => accounts.id),
    /** Angezeigte Autorenschaft, z. B. «Redaktion» */
    authorDisplay: text("author_display").notNull(),
    status: articleStatus("status").notNull().default("draft"),
    isMedical: boolean("is_medical").notNull().default(true),
    readingMinutes: integer("reading_minutes").notNull().default(3),
    coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id),
    reviewDueAt: ts("review_due_at"),
    publishedAt: ts("published_at"),
    withdrawnAt: ts("withdrawn_at"),
    withdrawReason: text("withdraw_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [
    uniqueIndex("article_versions_no_uq").on(t.articleId, t.versionNo),
    index("article_versions_search_idx").using(
      "gin",
      sql`to_tsvector('german', ${t.title} || ' ' || ${t.summary} || ' ' || ${t.body})`,
    ),
  ],
);

/** Vieraugenprüfung – Eigenfreigabe ausgeschlossen (CON02). */
export const editorialReviews = content.table("editorial_reviews", {
  id: id(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => articleVersions.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").references(() => accounts.id),
  reviewerDisplay: text("reviewer_display").notNull(),
  specialty: text("specialty").notNull(),
  decision: reviewDecision("decision").notNull(),
  comment: text("comment"),
  nextReviewDueAt: ts("next_review_due_at"),
  createdAt: createdAt(),
});

export const sourceReferences = content.table("source_references", {
  id: id(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => articleVersions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  url: text("url"),
  publishedOn: text("published_on"),
  rightsNote: text("rights_note"),
  sort: integer("sort").notNull().default(0),
});

export const supportOffers = content.table(
  "support_offers",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    organization: text("organization").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    topicSlugs: text("topic_slugs").array().notNull().default(sql`'{}'::text[]`),
    /** Kantonskürzel oder «CH» für schweizweit */
    cantons: text("cantons").array().notNull().default(sql`'{CH}'::text[]`),
    languages: text("languages").array().notNull().default(sql`'{de}'::text[]`),
    audience: text("audience").notNull(),
    responsibility: text("responsibility").notNull(),
    access: text("access").notNull(),
    costNote: text("cost_note").notNull().default("Kosten gemäss Anbieter"),
    contactWay: text("contact_way").notNull(),
    url: text("url").notNull(),
    status: offerStatus("status").notNull().default("draft"),
    changeFlag: boolean("change_flag").notNull().default(false),
    changeNote: text("change_note"),
    reviewedAt: ts("reviewed_at"),
    nextReviewAt: ts("next_review_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [
    index("support_offers_search_idx").using(
      "gin",
      sql`to_tsvector('german', ${t.organization} || ' ' || ${t.title} || ' ' || ${t.summary} || ' ' || ${t.description})`,
    ),
  ],
);

export const verificationRecords = content.table("verification_records", {
  id: id(),
  /** offer | safety_contact */
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  verifierId: uuid("verifier_id").references(() => accounts.id),
  method: text("method").notNull(),
  verifiedAt: ts("verified_at").notNull().defaultNow(),
  nextDueAt: ts("next_due_at").notNull(),
  note: text("note"),
});

/** Inhalte der Sicherheitsseite S49 – nur nach fachlicher Prüfung aktiv. */
export const safetyContacts = content.table("safety_contacts", {
  id: id(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  phone: text("phone"),
  url: text("url"),
  availability: text("availability").notNull(),
  region: text("region").notNull().default("Schweiz"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(false),
  verifiedAt: ts("verified_at"),
  verifiedBy: text("verified_by"),
  nextDueAt: ts("next_due_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Versionierte redaktionelle Regelkonfiguration für Mein Moment (HOM02). */
export const momentRules = content.table("moment_rules", {
  id: id(),
  versionLabel: text("version_label").notNull(),
  active: boolean("active").notNull().default(false),
  /** { record: Target[], connect: Target[], learn: Target[] } – je höchstens drei */
  config: jsonb("config").notNull(),
  createdBy: uuid("created_by").references(() => accounts.id),
  publishedAt: ts("published_at"),
  createdAt: createdAt(),
});

/** Öffentliches Kontaktformular (CON06). Anliegen verschlüsselt. */
export const contactMessages = content.table("contact_messages", {
  id: id(),
  category: text("category").notNull(),
  messageEncrypted: text("message_encrypted").notNull(),
  replyEmailEncrypted: text("reply_email_encrypted"),
  refType: text("ref_type"),
  refId: uuid("ref_id"),
  status: text("status").notNull().default("open"),
  createdAt: createdAt(),
});

export const pages = content.table("legal_pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  textVersion: text("text_version").notNull(),
  validFrom: date("valid_from", { mode: "string" }).notNull(),
  updatedAt: updatedAt(),
  version: version(),
});
