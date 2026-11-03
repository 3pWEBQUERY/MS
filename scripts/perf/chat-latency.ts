/**
 * Chat-Latenz (NFR05): Zeit vom Senden einer Nachricht (Server Action) bis zur Sichtbarkeit beim
 * aktiven Empfänger über den SSE-Kanal /api/v1/conversations/[id]/stream. Ziel: p95 ≤ 3 s.
 * Kann parallel zum Lasttest laufen («unter Planlast inkl. Zustellung»).
 *
 *   BASE_URL=http://localhost:3200 PAIRS=10 MESSAGES=20 INTERVAL_MS=1500 npx tsx scripts/perf/chat-latency.ts
 */
import { writeFileSync } from "node:fs";
import { BASE_URL, callAction, connect, memberWithSession, opId, percentile, round, sql } from "./lib";

const PAIRS = Number(process.env.PAIRS ?? 10);
const MESSAGES = Number(process.env.MESSAGES ?? 20);
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 1500);
const TIMEOUT_MS = 15_000;

async function main() {
  const latencies: number[] = [];
  let lost = 0;
  let sendErrors = 0;

  const pairs = [];
  for (let i = 0; i < PAIRS; i++) {
    const a = await memberWithSession();
    const b = await memberWithSession();
    pairs.push({ a, b, conversationId: await connect(a, b) });
  }
  console.log(`Chat-Latenz: ${PAIRS} Gesprächspaare × ${MESSAGES} Nachrichten, Abstand ${INTERVAL_MS} ms`);

  await Promise.all(
    pairs.map(async ({ a, b, conversationId }, idx) => {
      const pending = new Map<string, { t0: number; resolve: () => void }>();
      const controller = new AbortController();
      const res = await fetch(`${BASE_URL}/api/v1/conversations/${conversationId}/stream`, {
        headers: { Cookie: b.cookie, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (res.status !== 200 || !res.body) throw new Error(`SSE-Kanal nicht geöffnet (${res.status})`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      const readLoop = (async () => {
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let cut: number;
            while ((cut = buffer.indexOf("\n\n")) >= 0) {
              const block = buffer.slice(0, cut);
              buffer = buffer.slice(cut + 2);
              if (!block.includes("event: message")) continue;
              const data = block.split("\n").find((l) => l.startsWith("data: "))?.slice(6);
              const marker = data?.match(/Messung ([0-9a-f-]{36})/)?.[1];
              const p = marker ? pending.get(marker) : undefined;
              if (p) {
                latencies.push(performance.now() - p.t0);
                pending.delete(marker!);
                p.resolve();
              }
            }
          }
        } catch {
          // abgebrochen
        }
      })();

      // gestaffelter Start, damit nicht alle Paare im selben Abfragezyklus senden
      await new Promise((r) => setTimeout(r, (idx * INTERVAL_MS) / PAIRS));
      for (let i = 0; i < MESSAGES; i++) {
        const marker = opId();
        const seen = new Promise<void>((resolve) => pending.set(marker, { t0: performance.now(), resolve }));
        const sent = await callAction(a, `/community/gespraeche/${conversationId}`, "sendMessageAction", [conversationId, `Messung ${marker}`, opId()]);
        if (!(sent.status < 400 && (await sent.text()).includes('"ok":true'))) {
          sendErrors++;
          pending.delete(marker);
        } else {
          const timeout = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), TIMEOUT_MS));
          if ((await Promise.race([seen, timeout])) === "timeout") {
            lost++;
            pending.delete(marker);
          }
        }
        await new Promise((r) => setTimeout(r, INTERVAL_MS * (0.5 + Math.random())));
      }
      controller.abort();
      await readLoop;
    }),
  );

  const result = {
    baseUrl: BASE_URL,
    pairs: PAIRS,
    messages: PAIRS * MESSAGES,
    received: latencies.length,
    notReceivedWithin15s: lost,
    sendErrors,
    p50: round(percentile(latencies, 50)),
    p95: round(percentile(latencies, 95)),
    max: round(Math.max(...latencies)),
    targetP95Ms: 3000,
    at: new Date().toISOString(),
  };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(result, null, 2));
  await sql.end();
}

main().catch(async (err) => {
  console.error("Chat-Latenzmessung abgebrochen:", (err as Error).message);
  await sql.end();
  process.exit(1);
});
