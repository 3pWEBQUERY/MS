import "server-only";
import { sql as dsql } from "drizzle-orm";
import { errorRatePercent } from "@/lib/request-counter";
import { db } from "../../db";

/**
 * Betriebsalarme (NFR16, NFR19): gemeinsame Prüfung für Worker («[alarm]»-Logzeilen), S60 und
 * /api/v1/health/worker. Nur Zähler und technische Codes, keine Inhalte oder Personendaten.
 */

export const QUEUE_AGE_ALARM_MINUTES = 15;
export type AlarmCheck = { code: string; value: number };

/** Liefert alle aktuell verletzten Schwellen (rein lesend). */
export async function currentAlarms(): Promise<AlarmCheck[]> {
  const [row] = (await db.execute(dsql`
    select
      coalesce(extract(epoch from now() - min(created_at) filter (where status in ('pending', 'failed', 'processing'))) / 60, 0)::int as queue_age_min,
      count(*) filter (where status = 'dead')::int as dead,
      (select count(*)::int from messaging.delivery_jobs where status = 'dead') as delivery_dead,
      (select count(*)::int from privacy.requests where status = 'failed') as privacy_failed,
      (select count(*)::int from content.safety_contacts where active and (next_due_at is null or next_due_at < now())) as safety_overdue,
      (select coalesce(sum(requests), 0)::int from ops.request_metrics where minute >= now() - interval '5 minutes') as http_requests,
      (select coalesce(sum(errors), 0)::int from ops.request_metrics where minute >= now() - interval '5 minutes') as http_errors
    from ops.outbox_events`)) as unknown as {
    queue_age_min: number;
    dead: number;
    delivery_dead: number;
    privacy_failed: number;
    safety_overdue: number;
    http_requests: number;
    http_errors: number;
  }[];
  if (!row) return [];
  const out: AlarmCheck[] = [];
  if (row.queue_age_min > QUEUE_AGE_ALARM_MINUTES) out.push({ code: "queue_age", value: row.queue_age_min });
  if (row.dead > 0) out.push({ code: "outbox_dead_letters", value: row.dead });
  if (row.delivery_dead > 0) out.push({ code: "delivery_dead", value: row.delivery_dead });
  if (row.privacy_failed > 0) out.push({ code: "privacy_request_failed", value: row.privacy_failed });
  if (row.safety_overdue > 0) out.push({ code: "safety_verification_overdue", value: row.safety_overdue });
  // NFR16: > 2 % Serverfehler über 5 Minuten (ab 50 Anfragen), Wert in Prozent
  const rate = errorRatePercent(row.http_requests, row.http_errors);
  if (rate !== null) out.push({ code: "http_5xx_rate", value: rate });
  return out;
}

/** Jüngstes Lebenszeichen eines Arbeiters (null = noch nie). */
export async function lastWorkerHeartbeat(): Promise<{ beatAt: Date; alarms: string | null } | null> {
  const [row] = (await db.execute(dsql`
    select beat_at, alarms from ops.worker_heartbeats order by beat_at desc limit 1`)) as unknown as { beat_at: string | Date; alarms: string | null }[];
  return row ? { beatAt: new Date(row.beat_at), alarms: row.alarms } : null;
}

/** Arbeiter gilt als aktiv, wenn das Lebenszeichen höchstens 5 Minuten alt ist. */
export const WORKER_STALE_MS = 5 * 60 * 1000;
