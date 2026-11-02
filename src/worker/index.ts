/**
 * Hintergrundarbeiter (PRD 14): verarbeitet die transaktionale Outbox und periodische
 * Aufgaben. Läuft als eigener Railway-Service: `npm run worker`.
 * – dedupliziert über dedupe_key, begrenzte Wiederholung mit Backoff, Fehlerwarteschlange («dead»)
 * – prüft Rechte und aktuellen Status vor jeder Ausführung erneut (in den Handlern)
 */
import { sql as dsql } from "drizzle-orm";
import { db, sql } from "@/server/db";
import { HANDLERS, PERIODIC } from "./registry";

const MAX_ATTEMPTS = 6;
const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
let stopping = false;

type Claimed = { id: string; type: string; aggregate_id: string; payload: Record<string, unknown>; attempts: number };

async function claimBatch(limit = 10): Promise<Claimed[]> {
  return (await db.execute(dsql`
    update ops.outbox_events set status = 'processing', locked_at = now(), attempts = attempts + 1
    where id in (
      select id from ops.outbox_events
      where (status = 'pending' or (status = 'failed' and available_at <= now())
             or (status = 'processing' and locked_at < now() - interval '5 minutes'))
        and available_at <= now()
      order by available_at
      limit ${limit}
      for update skip locked
    )
    returning id, type, aggregate_id, payload, attempts
  `)) as unknown as Claimed[];
}

async function processOne(ev: Claimed) {
  const handler = HANDLERS[ev.type];
  if (!handler) {
    await db.execute(dsql`update ops.outbox_events set status = 'dead', last_error = 'unknown_type' where id = ${ev.id}`);
    console.error(`[worker] unbekannter Typ ${ev.type}`);
    return;
  }
  try {
    await handler({ id: ev.id, aggregateId: ev.aggregate_id, payload: ev.payload ?? {}, attempt: ev.attempts });
    await db.execute(dsql`update ops.outbox_events set status = 'done', locked_at = null, last_error = null where id = ${ev.id}`);
  } catch (err) {
    const code = err instanceof Error ? err.name : "error";
    const dead = ev.attempts >= MAX_ATTEMPTS;
    const backoffSec = Math.min(3600, 2 ** ev.attempts * 15);
    await db.execute(dsql`
      update ops.outbox_events
      set status = ${dead ? "dead" : "failed"}::ops.outbox_status, locked_at = null,
          last_error = ${code}, available_at = now() + make_interval(secs => ${backoffSec})
      where id = ${ev.id}`);
    // Nur technischer Fehlercode, keine Inhalte (NFR15)
    console.error(`[worker] ${ev.type} ${ev.id} Versuch ${ev.attempts} fehlgeschlagen: ${code}${dead ? " → Fehlerwarteschlange" : ""}`);
  }
}

async function runPeriodic(lastRun: Map<string, number>) {
  const now = Date.now();
  for (const task of PERIODIC) {
    if (now - (lastRun.get(task.name) ?? 0) < task.everyMs) continue;
    lastRun.set(task.name, now);
    try {
      // Advisory Lock verhindert parallele Ausführung bei mehreren Instanzen.
      const [row] = (await db.execute(dsql`select pg_try_advisory_lock(hashtext(${task.name})) as ok`)) as unknown as { ok: boolean }[];
      if (!row?.ok) continue;
      try {
        await task.run();
      } finally {
        await db.execute(dsql`select pg_advisory_unlock(hashtext(${task.name}))`);
      }
    } catch (err) {
      console.error(`[worker] periodisch ${task.name} fehlgeschlagen: ${err instanceof Error ? err.name + " " + err.message.slice(0, 120) : "error"}`);
    }
  }
}

async function main() {
  console.log("[worker] gestartet");
  const lastRun = new Map<string, number>();
  while (!stopping) {
    const batch = await claimBatch();
    for (const ev of batch) await processOne(ev);
    await runPeriodic(lastRun);
    if (batch.length === 0) await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await sql.end({ timeout: 5 });
  console.log("[worker] beendet");
}

for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => (stopping = true));

main().catch((err) => {
  console.error("[worker] Abbruch", err);
  process.exit(1);
});
