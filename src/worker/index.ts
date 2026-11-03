/**
 * Hintergrundarbeiter (PRD 14): verarbeitet die transaktionale Outbox und periodische
 * Aufgaben. Läuft als eigener Railway-Service: `npm run worker`.
 * – dedupliziert über dedupe_key, begrenzte Wiederholung mit Backoff, Fehlerwarteschlange («dead»)
 * – prüft Rechte und aktuellen Status vor jeder Ausführung erneut (in den Handlern)
 */
import { sql as dsql } from "drizzle-orm";
import { redactLogText } from "@/lib/log-safety";
import { db, sql } from "@/server/db";
import { HANDLERS, PERIODIC } from "./registry";

const MAX_ATTEMPTS = 6;
const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
/** Nach dieser Zeit gilt ein «processing»-Ereignis als verwaist (Absturz) und wird erneut aufgenommen. */
const STALE_SECONDS = Math.max(1, Number(process.env.WORKER_STALE_SECONDS ?? 300));
/** Nur Outbox, keine periodischen Aufgaben (Übungen, Wartung); in Produktion nie setzen. */
const PERIODIC_DISABLED = process.env.WORKER_DISABLE_PERIODIC === "1";
let stopping = false;

type Claimed = { id: string; type: string; aggregate_id: string; payload: Record<string, unknown>; attempts: number };

async function claimBatch(limit = 10): Promise<Claimed[]> {
  return (await db.execute(dsql`
    update ops.outbox_events set status = 'processing', locked_at = now(), attempts = attempts + 1
    where id in (
      select id from ops.outbox_events
      where (status = 'pending' or (status = 'failed' and available_at <= now())
             or (status = 'processing' and locked_at < now() - make_interval(secs => ${STALE_SECONDS})))
        and available_at <= now()
      order by available_at
      limit ${limit}
      for update skip locked
    )
    returning id, type, aggregate_id, payload, attempts
  `)) as unknown as Claimed[];
}

async function releaseClaimed(ids: string[]) {
  if (ids.length === 0) return;
  await db.execute(dsql`
    update ops.outbox_events set status = 'pending', locked_at = null, attempts = greatest(attempts - 1, 0)
    where status = 'processing' and id in (${dsql.join(ids.map((i) => dsql`${i}::uuid`), dsql`, `)})`);
  console.log(`[worker] ${ids.length} Ereignis(se) beim Herunterfahren freigegeben`);
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
    // NFR19: Alarm nach ausgeschöpften Versuchen (zusätzlich zur periodischen Prüfung in handlers/ops.ts)
    if (dead) console.error(`[alarm] code=outbox_dead_letter typ=${ev.type}`);
  }
}

async function runPeriodic(lastRun: Map<string, number>) {
  const now = Date.now();
  for (const task of PERIODIC) {
    if (now - (lastRun.get(task.name) ?? 0) < task.everyMs) continue;
    lastRun.set(task.name, now);
    // Advisory Lock verhindert parallele Ausführung bei mehreren Instanzen. Sperren gelten je
    // Verbindung: Sperren und Freigeben müssen über DIESELBE reservierte Verbindung laufen –
    // über den Pool landete die Freigabe sonst auf einer anderen Verbindung und die Sperre blieb hängen.
    let conn: Awaited<ReturnType<typeof sql.reserve>> | null = null;
    try {
      conn = await sql.reserve();
      const [row] = await conn<{ ok: boolean }[]>`select pg_try_advisory_lock(hashtext(${task.name})) as ok`;
      if (!row?.ok) continue;
      try {
        await task.run();
      } finally {
        await conn`select pg_advisory_unlock(hashtext(${task.name}))`;
      }
    } catch (err) {
      console.error(`[worker] periodisch ${task.name} fehlgeschlagen: ${err instanceof Error ? err.name + " " + redactLogText(err, 120) : "error"}`);
    } finally {
      conn?.release();
    }
  }
}

/**
 * Periodische Aufgaben in eigener Schleife: eine langsame Aufgabe (z. B. Linkprüfung mit
 * Netzzugriff) darf Zustellungen und Löschaufträge der Outbox nicht verzögern (NFR05, NFR19).
 */
async function periodicLoop() {
  const lastRun = new Map<string, number>();
  while (!stopping) {
    try {
      await runPeriodic(lastRun);
    } catch {
      // runPeriodic fängt Fehler je Aufgabe ab; hier nur zur Sicherheit
    }
    await new Promise((r) => setTimeout(r, Math.max(POLL_MS, 1000)));
  }
}

async function main() {
  console.log("[worker] gestartet");
  const periodic = PERIODIC_DISABLED ? Promise.resolve() : periodicLoop();
  let failures = 0;
  while (!stopping) {
    try {
      const batch = await claimBatch();
      for (let i = 0; i < batch.length; i++) {
        if (stopping) {
          // Geordnetes Herunterfahren: noch nicht begonnene Ereignisse sofort zurückgeben,
          // statt sie bis zur Verwaisungsfrist zu blockieren (NFR19).
          await releaseClaimed(batch.slice(i).map((e) => e.id));
          break;
        }
        await processOne(batch[i]);
      }
      if (failures > 0) console.log("[worker] Datenbank wieder erreichbar");
      failures = 0;
      if (batch.length === 0) await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (err) {
      // Vorübergehende Störung (z. B. Datenbank startet noch): nicht abstürzen, mit Backoff wiederholen (NFR19).
      failures += 1;
      const waitMs = Math.min(60_000, 1000 * 2 ** Math.min(failures, 6));
      const code = (err as { cause?: { code?: string }; code?: string })?.cause?.code ?? (err as { code?: string })?.code ?? "error";
      console.error(`[worker] Durchlauf fehlgeschlagen (${code}), neuer Versuch in ${Math.round(waitMs / 1000)} s`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  await periodic;
  await sql.end({ timeout: 5 });
  console.log("[worker] beendet");
}

for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => (stopping = true));

main().catch((err) => {
  console.error("[worker] Abbruch", err);
  process.exit(1);
});
