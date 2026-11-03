import { bigserial, boolean, index, integer, jsonb, pgSchema, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, version } from "./_shared";
import { accounts } from "./identity";

/** Betrieb: Audit, Feature-Schalter, Outbox, Sonderzugriff, Limits (HOM08, PRI07, NFR19). */
export const ops = pgSchema("ops");

export const outboxStatus = ops.enum("outbox_status", ["pending", "processing", "done", "failed", "dead"]);
export const grantStatus = ops.enum("grant_status", ["requested", "approved", "rejected", "expired", "revoked"]);

/** Manipulationsgeschützt über Hash-Kette. Enthält nie Freitexte oder Gesundheitswerte. */
export const auditEvents = ops.table(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
    actorId: uuid("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    objectType: text("object_type"),
    objectId: text("object_id"),
    ticket: text("ticket"),
    result: text("result").notNull().default("ok"),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [index("audit_events_time_idx").on(t.occurredAt), index("audit_events_actor_idx").on(t.actorId)],
);

/** Technisch erfasste verweigerte Zugriffe ohne Werte (AT03). */
export const securityEvents = ops.table("security_events", {
  id: id(),
  kind: text("kind").notNull(),
  actorId: uuid("actor_id"),
  objectType: text("object_type"),
  route: text("route"),
  occurredAt: ts("occurred_at").notNull().defaultNow(),
});

export const featureFlags = ops.table("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description").notNull(),
  reason: text("reason"),
  updatedBy: uuid("updated_by").references(() => accounts.id),
  updatedAt: updatedAt(),
  version: version(),
});

/** Transaktionale Outbox (PRD 14). Payload enthält nur IDs, keine Inhalte. */
export const outboxEvents = ops.table(
  "outbox_events",
  {
    id: id(),
    type: text("type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: ts("available_at").notNull().defaultNow(),
    lockedAt: ts("locked_at"),
    lastError: text("last_error"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("outbox_dedupe_uq").on(t.dedupeKey), index("outbox_due_idx").on(t.status, t.availableAt)],
);

/** Sonderzugriff: Ticket, Zweck, zweite Freigabe, Ablauf ≤ 60 min (PRD 03, PRI07). */
export const specialAccessGrants = ops.table("special_access_grants", {
  id: id(),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => accounts.id),
  approverId: uuid("approver_id").references(() => accounts.id),
  ticket: text("ticket").notNull(),
  purpose: text("purpose").notNull(),
  scope: text("scope").notNull(),
  status: grantStatus("status").notNull().default("requested"),
  approvedAt: ts("approved_at"),
  expiresAt: ts("expires_at"),
  createdAt: createdAt(),
});

export const rateLimitCounters = ops.table(
  "rate_limit_counters",
  {
    key: text("key").notNull(),
    windowStart: ts("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/** Quartalsweise Rechteprüfung (PRI08). */
export const accessReviews = ops.table("access_reviews", {
  id: id(),
  reviewerId: uuid("reviewer_id").references(() => accounts.id),
  period: text("period").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

/**
 * Lebenszeichen des Hintergrundarbeiters und Stand der Betriebsalarme (NFR16, NFR19).
 * Eine Zeile je Instanzname; nur technische Zeitpunkte, keine Inhalte.
 */
export const workerHeartbeats = ops.table("worker_heartbeats", {
  name: text("name").primaryKey(),
  beatAt: ts("beat_at").notNull().defaultNow(),
  /** Zuletzt gemeldete Alarmcodes, z. B. «queue_age,dead_letters» */
  alarms: text("alarms"),
  alarmsAt: ts("alarms_at"),
});
