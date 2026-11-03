import "server-only";
import { hostname } from "node:os";
import { sql as dsql } from "drizzle-orm";
import { takeCounts } from "@/lib/request-counter";
import { db } from "../db";

/**
 * Schreibt die Zähler des Web-Prozesses minütlich in ops.request_metrics (NFR16). Eine Zeile je
 * Minute und Instanz; der Arbeiter wertet die letzten 5 Minuten aus (ops-alarms.ts).
 */
const INSTANCE = (process.env.RAILWAY_REPLICA_ID ?? hostname()).slice(0, 60);
const FLUSH_MS = 60_000;

export async function flushRequestMetrics(now = new Date()) {
  const { requests, errors } = takeCounts();
  if (requests === 0 && errors === 0) return;
  const minute = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  try {
    await db.execute(dsql`
      insert into ops.request_metrics (minute, instance, requests, errors)
      values (${minute.toISOString()}::timestamptz, ${INSTANCE}, ${requests}, ${errors})
      on conflict (minute, instance) do update
        set requests = ops.request_metrics.requests + excluded.requests,
            errors = ops.request_metrics.errors + excluded.errors`);
  } catch (err) {
    // Messung darf den Betrieb nie stören; nur Fehlercode protokollieren (NFR15)
    console.error(`[metrics] Schreiben fehlgeschlagen: ${(err as { code?: string }).code ?? "error"}`);
  }
}

let started = false;

export function startRequestMetrics() {
  if (started) return;
  started = true;
  const timer = setInterval(() => void flushRequestMetrics(), FLUSH_MS);
  timer.unref();
}
