import { index, integer, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, version } from "./_shared";
import { accounts } from "./identity";

/** Meldungen, Fälle, Massnahmen, Einsprüche (SAF02–SAF05, Kapitel 10). */
export const moderation = pgSchema("moderation");

export const reportTarget = moderation.enum("report_target", ["post", "comment", "profile", "message", "group"]);
export const reportReason = moderation.enum("report_reason", [
  "harassment",
  "privacy",
  "dangerous_medical",
  "spam_fraud",
  "acute_danger",
  "other",
]);
export const priority = moderation.enum("priority", ["P0", "P1", "P2", "P3"]);
export const caseStatus = moderation.enum("case_status", [
  "new",
  "triaged",
  "in_progress",
  "escalated",
  "decided",
  "appeal",
  "closed",
]);
export const actionKind = moderation.enum("action_kind", [
  "note",
  "warn",
  "hide_content",
  "request_edit",
  "write_suspend",
  "account_suspend",
  "restore",
  "no_action",
]);
export const appealStatus = moderation.enum("appeal_status", ["open", "in_review", "upheld", "overturned"]);

export const moderationCases = moderation.table(
  "cases",
  {
    id: id(),
    caseNumber: text("case_number").notNull(),
    status: caseStatus("status").notNull().default("new"),
    priority: priority("priority").notNull(),
    assigneeId: uuid("assignee_id").references(() => accounts.id),
    dueAt: ts("due_at").notNull(),
    targetType: reportTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    /** Betroffenes Konto (Autor des gemeldeten Inhalts) */
    subjectAccountId: uuid("subject_account_id").references(() => accounts.id, { onDelete: "set null" }),
    decisionSummary: text("decision_summary"),
    ruleRef: text("rule_ref"),
    decidedAt: ts("decided_at"),
    closedAt: ts("closed_at"),
    evidencePurgeAfter: ts("evidence_purge_after"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [uniqueIndex("cases_number_uq").on(t.caseNumber), index("cases_queue_idx").on(t.status, t.priority, t.dueAt)],
);

export const reports = moderation.table(
  "reports",
  {
    id: id(),
    /** Belegnummer für die meldende Person */
    receiptNumber: text("receipt_number").notNull(),
    caseId: uuid("case_id").references(() => moderationCases.id, { onDelete: "set null" }),
    reporterId: uuid("reporter_id").references(() => accounts.id, { onDelete: "set null" }),
    targetType: reportTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: reportReason("reason").notNull(),
    detailsEncrypted: text("details_encrypted"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reports_receipt_uq").on(t.receiptNumber), index("reports_reporter_idx").on(t.reporterId)],
);

/** Minimierte Belege mit unveränderbarem Erfassungszeitpunkt und Hash (SAF02). */
export const evidenceItems = moderation.table("evidence_items", {
  id: id(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => moderationCases.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  /** Pseudonym des Verfassers zum Erfassungszeitpunkt */
  authorLabel: text("author_label").notNull(),
  snapshotEncrypted: text("snapshot_encrypted").notNull(),
  contentHash: text("content_hash").notNull(),
  sourceCreatedAt: ts("source_created_at"),
  capturedAt: ts("captured_at").notNull().defaultNow(),
});

export const moderationActions = moderation.table("actions", {
  id: id(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => moderationCases.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => accounts.id),
  kind: actionKind("kind").notNull(),
  ruleRef: text("rule_ref"),
  /** Für Betroffene sichere Begründung */
  publicReason: text("public_reason"),
  internalNote: text("internal_note"),
  durationHours: integer("duration_hours"),
  requiresSecondApproval: integer("requires_second_approval").notNull().default(0),
  approvedBy: uuid("approved_by").references(() => accounts.id),
  approvedAt: ts("approved_at"),
  createdAt: createdAt(),
});

export const sanctions = moderation.table(
  "sanctions",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** write_suspend | account_suspend */
    kind: text("kind").notNull(),
    caseId: uuid("case_id").references(() => moderationCases.id, { onDelete: "set null" }),
    startsAt: ts("starts_at").notNull().defaultNow(),
    endsAt: ts("ends_at"),
    liftedAt: ts("lifted_at"),
    createdAt: createdAt(),
  },
  (t) => [index("sanctions_account_idx").on(t.accountId)],
);

export const appeals = moderation.table("appeals", {
  id: id(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => moderationCases.id, { onDelete: "cascade" }),
  appellantId: uuid("appellant_id").references(() => accounts.id, { onDelete: "set null" }),
  reasonEncrypted: text("reason_encrypted").notNull(),
  assignedReviewerId: uuid("assigned_reviewer_id").references(() => accounts.id),
  status: appealStatus("status").notNull().default("open"),
  decisionNote: text("decision_note"),
  decidedAt: ts("decided_at"),
  createdAt: createdAt(),
});
