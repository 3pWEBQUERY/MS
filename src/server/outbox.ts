import "server-only";
import { db, type Executor } from "./db";
import { outboxEvents } from "./db/schema";

/**
 * Ereignistypen, die der Hintergrundarbeiter verarbeitet (src/worker/handlers).
 * Payloads enthalten ausschliesslich IDs, nie Inhalte.
 */
export type OutboxType =
  | "notification.deliver"
  | "export.generate"
  | "erasure.health"
  | "erasure.account"
  | "email.verification"
  | "email.password_reset"
  | "email.email_change"
  | "email.security_notice"
  | "email.deletion_receipt"
  | "email.inactivity_notice";

export async function enqueue(
  input: {
    type: OutboxType;
    aggregateType: string;
    aggregateId: string;
    payload?: Record<string, unknown>;
    dedupeKey?: string;
    availableAt?: Date;
  },
  executor: Executor = db,
) {
  await executor
    .insert(outboxEvents)
    .values({
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload ?? {},
      dedupeKey: input.dedupeKey ?? `${input.type}:${input.aggregateId}:${Date.now()}:${Math.random()}`,
      availableAt: input.availableAt ?? new Date(),
    })
    .onConflictDoNothing({ target: outboxEvents.dedupeKey });
}
