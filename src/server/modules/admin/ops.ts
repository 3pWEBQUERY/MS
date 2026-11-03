import "server-only";
import { and, count, desc, eq, gte, inArray, sql as dsql } from "drizzle-orm";
import { env } from "../../env";
import { db } from "../../db";
import { deliveryJobs, featureFlags, outboxEvents, securityEvents } from "../../db/schema";
import { FLAGS, type FlagKey } from "../../flags";
import { storageConfigured, storageHealthy } from "../../storage";
import { pseudonymsFor } from "./common";
import { currentAlarms, lastWorkerHeartbeat } from "./ops-alarms";

/**
 * S60 Betrieb und Konfiguration (HOM08, MSG08, NFR16, NFR19, US26).
 * Ausschliesslich technische Metadaten – keine Inhalte, keine Personendaten.
 */

export const OPS_ROLES = ["ops", "admin"] as const;

export async function listFlags() {
  const rows = await db
    .select({
      key: featureFlags.key,
      enabled: featureFlags.enabled,
      reason: featureFlags.reason,
      updatedBy: featureFlags.updatedBy,
      updatedAt: featureFlags.updatedAt,
      version: featureFlags.version,
    })
    .from(featureFlags);
  const names = await pseudonymsFor(rows.map((r) => r.updatedBy));
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return (Object.keys(FLAGS) as FlagKey[]).map((key) => {
    const r = byKey.get(key);
    return {
      key,
      description: FLAGS[key],
      enabled: r?.enabled ?? true,
      reason: r?.reason ?? null,
      updatedBy: r?.updatedBy ? (names.get(r.updatedBy) ?? "Mitarbeitende Person") : null,
      updatedAt: r?.updatedAt ?? null,
      version: r?.version ?? 0,
    };
  });
}

/** Outbox je Typ und Status, inkl. Queuealter (NFR16). */
export async function outboxSummary() {
  const rows = await db
    .select({
      type: outboxEvents.type,
      status: outboxEvents.status,
      total: count(),
      oldest: dsql<Date | null>`min(${outboxEvents.createdAt})`,
    })
    .from(outboxEvents)
    .where(inArray(outboxEvents.status, ["pending", "processing", "failed", "dead"]))
    .groupBy(outboxEvents.type, outboxEvents.status)
    .orderBy(outboxEvents.type);

  const types = new Map<string, { type: string; pending: number; processing: number; failed: number; dead: number; oldest: Date | null }>();
  for (const r of rows) {
    const e = types.get(r.type) ?? { type: r.type, pending: 0, processing: 0, failed: 0, dead: 0, oldest: null };
    e[r.status as "pending" | "processing" | "failed" | "dead"] = Number(r.total);
    const oldest = r.oldest ? new Date(r.oldest) : null;
    if (r.status !== "dead" && oldest && (!e.oldest || oldest < e.oldest)) e.oldest = oldest;
    types.set(r.type, e);
  }
  const list = [...types.values()];
  const oldest = list.reduce<Date | null>((acc, t) => (t.oldest && (!acc || t.oldest < acc) ? t.oldest : acc), null);
  return {
    types: list,
    totals: {
      pending: list.reduce((a, t) => a + t.pending + t.processing, 0),
      failed: list.reduce((a, t) => a + t.failed, 0),
      dead: list.reduce((a, t) => a + t.dead, 0),
    },
    oldestOpen: oldest,
    /** Queuealter in Millisekunden (NFR16) */
    queueAgeMs: oldest ? Date.now() - oldest.getTime() : 0,
  };
}

/** Technische Fehlercodes ohne Inhalte; mögliche Adressen werden vorsorglich unkenntlich gemacht (NFR15). */
function safeCode(v: string | null): string | null {
  if (!v) return null;
  return v.replace(/[^\s@]+@[^\s@]+/g, "[Adresse]").slice(0, 60);
}

export async function outboxProblems() {
  const rows = await db
    .select({
      id: outboxEvents.id,
      type: outboxEvents.type,
      status: outboxEvents.status,
      attempts: outboxEvents.attempts,
      lastError: outboxEvents.lastError,
      availableAt: outboxEvents.availableAt,
      createdAt: outboxEvents.createdAt,
    })
    .from(outboxEvents)
    .where(inArray(outboxEvents.status, ["failed", "dead"]))
    .orderBy(desc(outboxEvents.createdAt))
    .limit(50);
  return rows.map((r) => ({ ...r, lastError: safeCode(r.lastError) }));
}

export async function deliveryProblems() {
  const rows = await db
    .select({
      id: deliveryJobs.id,
      channel: deliveryJobs.channel,
      status: deliveryJobs.status,
      attempts: deliveryJobs.attempts,
      lastErrorCode: deliveryJobs.lastErrorCode,
      nextRunAt: deliveryJobs.nextRunAt,
      updatedAt: deliveryJobs.updatedAt,
    })
    .from(deliveryJobs)
    .where(inArray(deliveryJobs.status, ["failed", "dead"]))
    .orderBy(desc(deliveryJobs.updatedAt))
    .limit(50);
  const [summary] = await db
    .select({
      pending: dsql<number>`count(*) filter (where ${deliveryJobs.status} = 'pending')`,
      failed: dsql<number>`count(*) filter (where ${deliveryJobs.status} = 'failed')`,
      dead: dsql<number>`count(*) filter (where ${deliveryJobs.status} = 'dead')`,
    })
    .from(deliveryJobs);
  return {
    rows: rows.map((r) => ({ ...r, lastErrorCode: safeCode(r.lastErrorCode) })),
    pending: Number(summary?.pending ?? 0),
    failed: Number(summary?.failed ?? 0),
    dead: Number(summary?.dead ?? 0),
  };
}

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const t = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([p, t]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Technische Statusanzeigen (NFR16). */
export async function systemStatus() {
  const started = Date.now();
  let dbOk = false;
  try {
    await db.execute(dsql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const dbLatencyMs = Date.now() - started;
  const configured = storageConfigured();
  const storageOk = configured ? await withTimeout(storageHealthy(), 3000, false) : false;

  // Lebenszeichen des Arbeiters (NFR16); Rückfall: jüngste Statusänderung in der Outbox.
  const [heartbeat, alarms] = await Promise.all([lastWorkerHeartbeat().catch(() => null), currentAlarms().catch(() => [])]);
  const [worker] = await db
    .select({
      last: dsql<Date | null>`greatest(max(${outboxEvents.lockedAt}), max(${outboxEvents.updatedAt}) filter (where ${outboxEvents.status} <> 'pending'))`,
    })
    .from(outboxEvents);
  const [sec] = await db
    .select({ c: count() })
    .from(securityEvents)
    .where(gte(securityEvents.occurredAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  return {
    dbOk,
    dbLatencyMs,
    storageConfigured: configured,
    storageOk,
    smtpConfigured: Boolean(env.mail.host()),
    lastWorkerActivity: heartbeat?.beatAt ?? (worker?.last ? new Date(worker.last) : null),
    workerHeartbeat: Boolean(heartbeat),
    alarms,
    deniedLast24h: Number(sec?.c ?? 0),
  };
}

export async function flagByKey(key: string) {
  const [r] = await db
    .select({ key: featureFlags.key, enabled: featureFlags.enabled, version: featureFlags.version })
    .from(featureFlags)
    .where(and(eq(featureFlags.key, key)));
  return r ?? null;
}
