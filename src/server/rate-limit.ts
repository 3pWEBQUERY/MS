import "server-only";
import { sql as dsql } from "drizzle-orm";
import { db } from "./db";

/**
 * Serverseitige Limits mit festem Zeitfenster (ACC02, ACC04, MSG02, SAF08).
 * Gibt true zurück, wenn die Aktion erlaubt ist, und zählt sie dann.
 */
export async function consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const rows = await db.execute<{ count: number }>(dsql`
    insert into ops.rate_limit_counters (key, window_start, count)
    values (${key}, ${windowStart.toISOString()}::timestamptz, 1)
    on conflict (key, window_start) do update set count = ops.rate_limit_counters.count + 1
    returning count
  `);
  const count = Number(rows[0]?.count ?? 1);
  return count <= limit;
}

/** Zählt, ohne zu erhöhen (z. B. für Drosselung nach Fehlversuchen). */
export async function peek(key: string, windowSeconds: number): Promise<number> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const rows = await db.execute<{ count: number }>(dsql`
    select count from ops.rate_limit_counters where key = ${key} and window_start = ${windowStart.toISOString()}::timestamptz
  `);
  return Number(rows[0]?.count ?? 0);
}

export const LIMITS = {
  verificationResend: { limit: 3, window: 3600 },
  loginFailures: { limit: 10, window: 900 },
  passwordReset: { limit: 3, window: 3600 },
  contactRequestsPerDay: { limit: 5, window: 86400 },
  postsPerHour: { limit: 5, window: 3600 },
  commentsPerHour: { limit: 20, window: 3600 },
  messagesPerMinute: { limit: 30, window: 60 },
  contactForm: { limit: 5, window: 3600 },
  reportsPerHour: { limit: 20, window: 3600 },
} as const;
