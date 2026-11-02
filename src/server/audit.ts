import "server-only";
import { desc, sql as dsql } from "drizzle-orm";
import { sha256 } from "./crypto";
import { db, type Executor } from "./db";
import { auditEvents, securityEvents } from "./db/schema";

export type AuditInput = {
  actorId: string | null;
  actorRole?: string | null;
  /** z. B. «role.granted», «case.decided», «flag.changed» */
  action: string;
  objectType?: string;
  objectId?: string;
  ticket?: string | null;
  result?: "ok" | "denied" | "failed";
};

/**
 * Hängt ein Audit-Ereignis an die Hash-Kette an (PRI07).
 * Enthält bewusst keine Freitexte, Nachrichten oder Gesundheitswerte.
 */
export async function audit(input: AuditInput, executor: Executor = db): Promise<void> {
  const run = async (tx: Executor) => {
    await tx.execute(dsql`select pg_advisory_xact_lock(7342001)`);
    const [last] = await tx
      .select({ hash: auditEvents.hash })
      .from(auditEvents)
      .orderBy(desc(auditEvents.id))
      .limit(1);
    const prevHash = last?.hash ?? "genesis";
    const occurredAt = new Date();
    const payload = JSON.stringify([
      prevHash,
      occurredAt.toISOString(),
      input.actorId,
      input.actorRole ?? null,
      input.action,
      input.objectType ?? null,
      input.objectId ?? null,
      input.ticket ?? null,
      input.result ?? "ok",
    ]);
    await tx.insert(auditEvents).values({
      occurredAt,
      actorId: input.actorId,
      actorRole: input.actorRole ?? null,
      action: input.action,
      objectType: input.objectType ?? null,
      objectId: input.objectId ?? null,
      ticket: input.ticket ?? null,
      result: input.result ?? "ok",
      prevHash,
      hash: sha256(payload),
    });
  };
  if (executor === db) await db.transaction(run);
  else await run(executor);
}

/** Verweigerter Zugriff, ohne Werte erfasst (AT03). */
export async function recordDenied(kind: string, actorId: string | null, objectType: string, route?: string) {
  try {
    await db.insert(securityEvents).values({ kind, actorId, objectType, route: route ?? null });
  } catch {
    // Sicherheitsprotokoll darf die Antwort nie verändern.
  }
}
