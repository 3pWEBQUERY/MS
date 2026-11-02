import { sql } from "drizzle-orm";
import { bigint, check, index, integer, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, version } from "./_shared";
import { accounts } from "./identity";

/** Kontaktfreigabe, Gespräche, Blockierungen, Mitteilungen (MSG01–MSG08, SAF01). */
export const messaging = pgSchema("messaging");

export const contactStatus = messaging.enum("contact_status", [
  "pending",
  "active",
  "ended",
  "declined",
  "withdrawn",
  "expired",
]);

export const notificationType = messaging.enum("notification_type", [
  "contact_request",
  "contact_accepted",
  "comment_reply",
  "group_decision",
  "new_message",
  "moderation_decision",
  "security",
  "system",
]);

export const deliveryStatus = messaging.enum("delivery_status", ["pending", "sent", "skipped", "failed", "dead"]);

/** Genau ein Datensatz je ungeordnetem Personenpaar (MSG02). */
export const contactRelationships = messaging.table(
  "contact_relationships",
  {
    id: id(),
    accountLow: uuid("account_low")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    accountHigh: uuid("account_high")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    initiatorId: uuid("initiator_id").notNull(),
    status: contactStatus("status").notNull(),
    lowConsentAt: ts("low_consent_at"),
    highConsentAt: ts("high_consent_at"),
    requestedAt: ts("requested_at"),
    expiresAt: ts("expires_at"),
    /** Neue Anfrage frühestens nach 30 Tagen (MSG02) */
    cooldownUntil: ts("cooldown_until"),
    endedAt: ts("ended_at"),
    endedBy: uuid("ended_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [
    uniqueIndex("contact_relationships_pair_uq").on(t.accountLow, t.accountHigh),
    index("contact_relationships_high_idx").on(t.accountHigh),
    check("contact_relationships_order", sql`${t.accountLow} < ${t.accountHigh}`),
  ],
);

export const conversations = messaging.table("conversations", {
  id: id(),
  relationshipId: uuid("relationship_id")
    .notNull()
    .unique()
    .references(() => contactRelationships.id, { onDelete: "cascade" }),
  lastSeq: bigint("last_seq", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
});

/** Eigene, nicht geteilte Ansichtsdaten (keine Lesebestätigung für die Gegenseite). */
export const conversationViews = messaging.table(
  "conversation_views",
  {
    id: id(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    lastReadSeq: bigint("last_read_seq", { mode: "number" }).notNull().default(0),
    hiddenAt: ts("hidden_at"),
  },
  (t) => [uniqueIndex("conversation_views_uq").on(t.conversationId, t.accountId)],
);

export const messages = messaging.table(
  "messages",
  {
    id: id(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    seq: bigint("seq", { mode: "number" }).notNull(),
    /** AES-256-GCM, null nach Entfernung */
    bodyEncrypted: text("body_encrypted"),
    clientOpId: uuid("client_op_id").notNull(),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("messages_seq_uq").on(t.conversationId, t.seq),
    uniqueIndex("messages_op_uq").on(t.senderId, t.clientOpId),
  ],
);

/** Gerichtete Blockierung; aktive Blockierung sperrt beidseitig. */
export const blocks = messaging.table(
  "blocks",
  {
    id: id(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    liftedAt: ts("lifted_at"),
  },
  (t) => [
    uniqueIndex("blocks_active_uq").on(t.blockerId, t.blockedId).where(sql`${t.liftedAt} is null`),
    index("blocks_blocked_idx").on(t.blockedId),
  ],
);

/** Keine gespeicherten Nachrichtentexte (PRD 09). */
export const notifications = messaging.table(
  "notifications",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    /** Sichere Zielreferenz, z. B. «conversation», «post», «group» */
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    actorId: uuid("actor_id"),
    readAt: ts("read_at"),
    expiresAt: ts("expires_at"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("notifications_dedupe_uq").on(t.dedupeKey),
    index("notifications_account_idx").on(t.accountId, t.createdAt),
  ],
);

export const deliveryJobs = messaging.table(
  "delivery_jobs",
  {
    id: id(),
    notificationId: uuid("notification_id").references(() => notifications.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("email"),
    status: deliveryStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextRunAt: ts("next_run_at").notNull().defaultNow(),
    dedupeKey: text("dedupe_key").notNull(),
    lastErrorCode: text("last_error_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("delivery_jobs_dedupe_uq").on(t.dedupeKey), index("delivery_jobs_due_idx").on(t.status, t.nextRunAt)],
);
