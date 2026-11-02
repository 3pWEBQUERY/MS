import { index, integer, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./_shared";
import { accounts } from "./identity";

/** Datenschutzaufträge, Löschung, Export (PRI03–PRI06). */
export const privacy = pgSchema("privacy");

export const requestType = privacy.enum("request_type", [
  "access",
  "export",
  "erasure_health",
  "erasure_account",
  "rectification",
]);
export const requestStatus = privacy.enum("request_status", [
  "requested",
  "deactivated",
  "in_progress",
  "verified",
  "completed",
  "failed",
  "rejected",
]);
export const taskStatus = privacy.enum("task_status", ["pending", "done", "failed", "escalated"]);
export const exportStatus = privacy.enum("export_status", ["queued", "running", "ready", "expired", "failed"]);

export const privacyRequests = privacy.table(
  "requests",
  {
    id: id(),
    /** Bleibt nach Kontolöschung als pseudonymisierter Verweis erhalten */
    accountId: uuid("account_id"),
    receiptNumber: text("receipt_number").notNull(),
    type: requestType("type").notNull(),
    status: requestStatus("status").notNull().default("requested"),
    identityMethod: text("identity_method").notNull(),
    dueAt: ts("due_at").notNull(),
    exceptionNote: text("exception_note"),
    handledBy: uuid("handled_by").references(() => accounts.id),
    completedAt: ts("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("privacy_requests_receipt_uq").on(t.receiptNumber), index("privacy_requests_status_idx").on(t.status)],
);

export const erasureTasks = privacy.table("erasure_tasks", {
  id: id(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => privacyRequests.id, { onDelete: "cascade" }),
  /** database | search_index | object_storage | cache | queues | vendors */
  system: text("system").notNull(),
  objectClass: text("object_class").notNull(),
  status: taskStatus("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  receipt: text("receipt"),
  updatedAt: updatedAt(),
  createdAt: createdAt(),
});

export const exportJobs = privacy.table(
  "export_jobs",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: exportStatus("status").notNull().default("queued"),
    /** full | health */
    scope: text("scope").notNull().default("full"),
    objectKey: text("object_key"),
    sizeBytes: integer("size_bytes"),
    clientOpId: uuid("client_op_id").notNull(),
    readyAt: ts("ready_at"),
    expiresAt: ts("expires_at"),
    downloadedAt: ts("downloaded_at"),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("export_jobs_op_uq").on(t.accountId, t.clientOpId)],
);

/** Löschjournal – wird vor Wiederfreigabe eines Restores angewendet (AT09). */
export const deletionJournal = privacy.table("deletion_journal", {
  id: id(),
  accountId: uuid("account_id").notNull(),
  /** account | health | post | comment | message | export */
  objectClass: text("object_class").notNull(),
  objectId: uuid("object_id"),
  recordedAt: ts("recorded_at").notNull().defaultNow(),
});
