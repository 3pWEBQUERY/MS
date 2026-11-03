/**
 * Wiederanlauf-Übung für den Hintergrundarbeiter (NFR19, NFR08, QA10).
 *
 *   npm run drill:worker            # gegen DATABASE_URL (Entwicklung/Test)
 *
 * Ablauf:
 *  1. legt 20 Übungsereignisse (`ops.drill`, je 400 ms) an und versucht 20 Duplikate (gleicher dedupe_key)
 *  2. startet den Arbeiter, beendet ihn mitten in der Arbeit hart (SIGKILL = Absturz)
 *  3. startet ihn erneut mit kurzer Verwaisungsfrist; verwaiste Ereignisse müssen aufgenommen werden
 *  4. beendet ihn geordnet (SIGTERM) während neuer Arbeit; begonnene Ereignisse laufen zu Ende,
 *     nicht begonnene werden sofort freigegeben
 *  5. prüft: kein Ereignis verloren, keines doppelt angelegt, keines hängt in «processing»,
 *     ein erzwungener Fehler landet mit Backoff in «failed»
 * Übungsereignisse werden am Ende gelöscht. Fachdaten bleiben unberührt.
 * In Produktion nur mit `--allow-production` (der reguläre Arbeiter verarbeitet die Ereignisse dann mit).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/ms";
if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
  console.error("Abbruch: Übung in Produktion nur mit --allow-production.");
  process.exit(2);
}
const sql = postgres(url, { max: 2, onnotice: () => {} });
const run = randomUUID().slice(0, 8);
const N = 20;
const STALE = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const results: { step: string; ok: boolean; detail: string }[] = [];
const check = (step: string, ok: boolean, detail: string) => {
  results.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step} – ${detail}`);
};

function startWorker(): ChildProcess {
  const child = spawn("node_modules/.bin/tsx", ["--conditions=react-server", "src/worker/index.ts"], {
    // Periodische Aufgaben aus: sie würden (z. B. Linkprüfung mit Netzzugriff) die Messung verfälschen
    env: { ...process.env, DATABASE_URL: url, WORKER_POLL_MS: "200", WORKER_STALE_SECONDS: String(STALE), WORKER_DISABLE_PERIODIC: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true, // eigene Prozessgruppe, damit SIGKILL auch tsx-Kindprozesse trifft
  });
  child.stdout?.on("data", (d) => process.env.DRILL_VERBOSE && process.stdout.write(`  [w] ${d}`));
  child.stderr?.on("data", (d) => process.env.DRILL_VERBOSE && process.stdout.write(`  [w!] ${d}`));
  return child;
}
// SIGKILL an die ganze Gruppe (Absturz); SIGTERM nur an tsx, das ihn wie Railway an den Arbeiter weiterreicht.
const signal = (c: ChildProcess, sig: NodeJS.Signals) => c.pid && process.kill(sig === "SIGKILL" ? -c.pid : c.pid, sig);
const exited = (c: ChildProcess) => new Promise<void>((r) => (c.exitCode !== null ? r() : c.once("exit", () => r())));

async function counts() {
  const rows = await sql<{ status: string; n: number }[]>`
    select status::text, count(*)::int as n from ops.outbox_events
    where type = 'ops.drill' and dedupe_key like ${`drill:${run}:%`} group by status`;
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}
async function waitFor(pred: (c: Record<string, number>) => boolean, timeoutMs: number) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const c = await counts();
    if (pred(c)) return c;
    await sleep(150);
  }
  return counts();
}
async function insert(prefix: string, n: number, payload: Record<string, unknown>) {
  const rows = Array.from({ length: n }, (_, i) => ({
    type: "ops.drill",
    aggregate_type: "drill",
    aggregate_id: run,
    payload: sql.json(payload as postgres.JSONValue),
    dedupe_key: `drill:${run}:${prefix}:${i}`,
  }));
  const res = await sql`insert into ops.outbox_events ${sql(rows)} on conflict (dedupe_key) do nothing returning id`;
  return res.length;
}

async function main() {
  console.log(`Übung ${run} gegen ${new URL(url).host}`);

  // 1. Anlegen und Deduplizierung
  const created = await insert("a", N, { ms: 400 });
  const dupes = await insert("a", N, { ms: 400 });
  check("Deduplizierung", created === N && dupes === 0, `${created} angelegt, ${dupes} Duplikate übernommen`);

  // 2. Absturz mitten in der Arbeit
  let w = startWorker();
  const mid = await waitFor((c) => (c.done ?? 0) >= 3 && (c.processing ?? 0) > 0, 60_000);
  signal(w, "SIGKILL");
  await exited(w);
  const afterKill = await counts();
  check("Absturz simuliert", (afterKill.processing ?? 0) > 0, `nach SIGKILL: ${JSON.stringify(afterKill)} (vorher ${JSON.stringify(mid)})`);

  // 3. Wiederanlauf: verwaiste Ereignisse werden nach der Frist aufgenommen
  const t0 = Date.now();
  w = startWorker();
  const recovered = await waitFor((c) => (c.done ?? 0) === N, 60_000);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const [{ retried }] = await sql<{ retried: number }[]>`
    select count(*)::int as retried from ops.outbox_events
    where dedupe_key like ${`drill:${run}:a:%`} and attempts > 1`;
  check("Wiederanlauf", recovered.done === N, `${recovered.done}/${N} erledigt in ${secs} s, ${retried} erneut ausgeführt (mindestens einmal, Handler idempotent)`);

  // 4. Geordnetes Herunterfahren während laufender Arbeit
  await insert("b", 10, { ms: 1500 });
  await waitFor((c) => (c.processing ?? 0) > 0, 30_000);
  signal(w, "SIGTERM");
  await exited(w);
  const afterTerm = await counts();
  check(
    "Geordnetes Herunterfahren",
    (afterTerm.processing ?? 0) === 0,
    `nach SIGTERM: ${JSON.stringify(afterTerm)} – nichts blockiert in «processing»`,
  );
  w = startWorker();
  const all = await waitFor((c) => (c.done ?? 0) === N + 10, 60_000);
  check("Rest nach Neustart", all.done === N + 10, `${all.done}/${N + 10} erledigt`);

  // 5. Fehlversuch mit Backoff
  await insert("c", 1, { fail: true });
  const failed = await waitFor((c) => (c.failed ?? 0) === 1, 60_000);
  const [ev] = await sql<{ attempts: number; wait: number }[]>`
    select attempts, extract(epoch from available_at - now())::int as wait from ops.outbox_events
    where dedupe_key = ${`drill:${run}:c:0`}`;
  check("Backoff nach Fehler", failed.failed === 1 && ev.wait > 0, `Versuch ${ev.attempts}, nächster in ~${ev.wait} s`);

  signal(w, "SIGTERM");
  await exited(w);
}

main()
  .catch((err) => {
    check("Ablauf", false, err instanceof Error ? err.message : String(err));
  })
  .finally(async () => {
    await sql`delete from ops.outbox_events where type = 'ops.drill' and dedupe_key like ${`drill:${run}:%`}`;
    await sql.end({ timeout: 2 });
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed === 0 ? `\nÜbung bestanden (${results.length} Prüfungen).` : `\nÜbung NICHT bestanden: ${failed} Prüfung(en).`);
    process.exit(failed === 0 ? 0 : 1);
  });
