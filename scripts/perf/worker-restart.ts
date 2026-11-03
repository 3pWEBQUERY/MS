/**
 * Kill-/Restart-Test des Hintergrundarbeiters (NFR19): zwei Worker verarbeiten Outbox-Aufträge,
 * einer wird während der Verarbeitung hart beendet (SIGKILL) und neu gestartet. Gemessen wird an
 * einem lokalen Test-SMTP-Server, ob jede Mail genau einmal ankommt (keine Duplikate, nichts verloren).
 *
 *   npx tsx scripts/perf/worker-restart.ts            (legt die Testdatenbank «ms_worker» neu an)
 *
 * Ablauf: Datenbank vorbereiten → N Aufträge (+ doppelte dedupe_keys) einstellen → Worker A und B
 * starten → nach einem Teil der Zustellungen A mit SIGKILL beenden → Ablauf der 5-Minuten-Sperre
 * simulieren (locked_at zurückdatieren) → A neu starten → warten bis alle Aufträge erledigt sind.
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createServer, type Socket } from "node:net";
import { join } from "node:path";
import postgres from "postgres";
import { encrypt, E2E_DATA_KEY } from "../../e2e/support/db";

const DB = "ms_worker";
const URL_ = `postgres://postgres@localhost:5432/${DB}`;
const N = Number(process.env.JOBS ?? 60);
const DELAY_MS = Number(process.env.SMTP_DELAY_MS ?? 120);
const root = join(__dirname, "../..");

const received: string[] = [];

/** Minimaler SMTP-Empfänger, der jede Mail mit kurzer Verzögerung annimmt. */
function smtpServer() {
  return createServer((socket: Socket) => {
    let data = false;
    let buf = "";
    socket.write("220 localhost ESMTP Test\r\n");
    socket.on("data", async (chunk) => {
      buf += chunk.toString("utf8");
      for (;;) {
        if (data) {
          const end = buf.indexOf("\r\n.\r\n");
          if (end < 0) return;
          const body = buf.slice(0, end);
          buf = buf.slice(end + 5);
          data = false;
          await new Promise((r) => setTimeout(r, DELAY_MS));
          received.push(body.replace(/=\r\n/g, "").match(/marker=(?:3D)?([0-9]+)/)?.[1] ?? "?");
          socket.write("250 OK\r\n");
          continue;
        }
        const nl = buf.indexOf("\r\n");
        if (nl < 0) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") socket.write("250-localhost\r\n250 OK\r\n");
        else if (cmd === "DATA") {
          data = true;
          socket.write("354 Ende mit <CRLF>.<CRLF>\r\n");
        } else if (cmd === "QUIT") {
          socket.end("221 Tschüss\r\n");
          return;
        } else socket.write("250 OK\r\n");
      }
    });
    socket.on("error", () => {});
  });
}

function startWorker(name: string, port: number): ChildProcess {
  const child = spawn("npx", ["tsx", "--conditions=react-server", "src/worker/index.ts"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: URL_, DATA_ENCRYPTION_KEY: E2E_DATA_KEY, SMTP_HOST: "127.0.0.1", SMTP_PORT: String(port), WORKER_POLL_MS: "200", NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.stdout?.on("data", (d) => process.env.VERBOSE && process.stdout.write(`[${name}] ${d}`));
  child.stderr?.on("data", (d) => process.env.VERBOSE && process.stdout.write(`[${name}] ${d}`));
  return child;
}

/** Ganze Prozessgruppe (npx → tsx → node) beenden. */
const kill = (c: ChildProcess, sig: NodeJS.Signals) => {
  try {
    process.kill(-c.pid!, sig);
  } catch {}
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  execFileSync("npx", ["tsx", "scripts/test-db/prepare.ts", DB], { cwd: root, stdio: "ignore" });
  const sql = postgres(URL_, { max: 2, onnotice: () => {} });
  const smtp = smtpServer();
  await new Promise<void>((r) => smtp.listen(0, "127.0.0.1", r));
  const port = (smtp.address() as { port: number }).port;

  for (let i = 0; i < N; i++) {
    const payload = { to: encrypt(`worker-test-${i}@example.test`), link: encrypt(`http://localhost/email-bestaetigen?marker=${i}`) };
    // Jeder Auftrag wird zweimal eingestellt – der dedupe_key verhindert den zweiten (NFR19).
    for (let k = 0; k < 2; k++)
      await sql`insert into ops.outbox_events (type, aggregate_type, aggregate_id, payload, dedupe_key)
        values ('email.verification', 'email_token', ${String(i)}, ${sql.json(payload)}, ${`worker-test:${i}`}) on conflict (dedupe_key) do nothing`;
  }
  const [{ queued }] = await sql<{ queued: number }[]>`select count(*)::int as queued from ops.outbox_events where dedupe_key like 'worker-test:%'`;

  const a = startWorker("A", port);
  const b = startWorker("B", port);
  while (received.length < Math.floor(N / 4)) await wait(50);
  kill(a, "SIGKILL");
  const killedAt = received.length;
  await wait(300);
  const [{ stuck }] = await sql<{ stuck: number }[]>`select count(*)::int as stuck from ops.outbox_events where status = 'processing'`;
  // Ablauf der Sperrfrist (5 min) simulieren, damit der Neustart liegengebliebene Aufträge übernimmt
  await sql`update ops.outbox_events set locked_at = now() - interval '6 minutes' where status = 'processing'`;
  const a2 = startWorker("A2", port);

  const deadline = Date.now() + 120_000;
  for (;;) {
    const [{ open }] = await sql<{ open: number }[]>`select count(*)::int as open from ops.outbox_events where dedupe_key like 'worker-test:%' and status not in ('done', 'dead')`;
    if (open === 0 || Date.now() > deadline) break;
    await wait(250);
  }
  kill(b, "SIGTERM");
  kill(a2, "SIGTERM");
  const states = await sql<{ status: string; n: number }[]>`select status::text, count(*)::int as n from ops.outbox_events where dedupe_key like 'worker-test:%' group by status`;
  const counts = new Map<string, number>();
  for (const m of received) counts.set(m, (counts.get(m) ?? 0) + 1);
  const duplicates = [...counts.values()].filter((c) => c > 1).length;
  const missing = Array.from({ length: N }, (_, i) => String(i)).filter((m) => !counts.has(m)).length;
  const result = { jobs: N, queuedAfterDuplicateEnqueue: queued, receivedMails: received.length, killedAfterMails: killedAt, stuckProcessingAtKill: stuck, duplicates, missing, finalStates: states, at: new Date().toISOString() };
  console.log(JSON.stringify(result, null, 2));
  await sql.end();
  smtp.close();
  await wait(500);
  process.exit(duplicates === 0 && missing === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Kill-/Restart-Test abgebrochen:", (err as Error).message);
  process.exit(1);
});
