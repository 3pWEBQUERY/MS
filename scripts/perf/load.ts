/**
 * Lasttest nach PRD 13 «Messprofil» (NFR04, QA10): gleichzeitige Sitzungen mit Anstieg, Mischung
 * 50 % Feed-/Inhaltsabrufe, 20 % persönliche Lesezugriffe, 20 % Chat, 10 % übrige Schreibvorgänge.
 * Ausgabe: p50/p95 je Klasse (Lesen/Schreiben) und Vorgang, Fehlerquote, Datenkonsistenz.
 *
 *   BASE_URL=http://localhost:3200 SESSIONS=100 DURATION_S=150 RAMP_S=30 npx tsx scripts/perf/load.ts
 *
 * Weitere Variablen: THINK_MS (mittlere Denkpause, Standard 1000), STREAMS (offene SSE-Kanäle aktiver
 * Empfänger, Standard SESSIONS/5), OUT (JSON-Ergebnisdatei). Konten und Sitzungen entstehen direkt in
 * der Testdatenbank (E2E_DATABASE_URL, Standard ms_e2e) – nie gegen produktive Daten ausführen.
 */
import { writeFileSync } from "node:fs";
import { BASE_URL, callAction, callFormAction, connect, memberWithSession, opId, percentile, round, sql, type Session } from "./lib";

const SESSIONS = Number(process.env.SESSIONS ?? 100);
const DURATION_S = Number(process.env.DURATION_S ?? 150);
const RAMP_S = Number(process.env.RAMP_S ?? Math.min(30, DURATION_S / 5));
const THINK_MS = Number(process.env.THINK_MS ?? 1000);
const STREAMS = Number(process.env.STREAMS ?? Math.round(SESSIONS / 5));

type Kind = "read" | "write";
type Sample = { op: string; cls: string; kind: Kind; ms: number; ok: boolean };
const samples: Sample[] = [];
const sentMessages = new Map<string, number>();

type User = Session & { conversationId: string; partner: Session };

async function timed(op: string, cls: string, kind: Kind, run: () => Promise<boolean>) {
  const t0 = performance.now();
  let ok = false;
  try {
    ok = await run();
  } catch {
    ok = false;
  }
  samples.push({ op, cls, kind, ms: performance.now() - t0, ok });
}

/** GET einer Seite inkl. vollständig gestreamter Antwort (Suspense-Inhalte). */
const page = (u: Session, path: string) => async () => {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Cookie: u.cookie }, redirect: "manual" });
  const body = await res.text();
  // notFound() im Streaming liefert Status 200 mit Fehler-Digest im RSC-Strom
  return res.status === 200 && !body.includes("NEXT_HTTP_ERROR_FALLBACK");
};

/** Aktions-Antwort (RSC) ohne Fehlerzustand. */
const actionOk = async (res: Response) => res.status < 400 && !(await res.text()).includes('"status":"error"');

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;

async function main() {
  const [articles, offers, groups] = await Promise.all([
    sql<{ slug: string }[]>`select a.slug from content.articles a join content.article_versions v on v.id = a.published_version_id where v.status = 'published' and v.review_due_at > now()`,
    sql<{ slug: string }[]>`select slug from content.support_offers where status = 'published'`,
    sql<{ slug: string }[]>`select slug from community.groups where type = 'open' and status = 'active'`,
  ]);
  if (articles.length === 0) throw new Error("Keine publizierten Artikel – Seed fehlt?");

  console.log(`Lege ${SESSIONS} Testkonten mit Sitzungen und Kontakten an …`);
  const users: User[] = [];
  for (let i = 0; i < SESSIONS; i += 2) {
    const a = await memberWithSession({ health: true });
    const b = await memberWithSession({ health: true });
    const conversationId = await connect(a, b);
    users.push({ ...a, conversationId, partner: b }, { ...b, conversationId, partner: a });
  }

  const feed = [
    (u: User) => timed("Feed /community", "Feed/Inhalt", "read", page(u, "/community")),
    (u: User) => timed("Wissen /wissen", "Feed/Inhalt", "read", page(u, "/wissen")),
    (u: User) => timed("Artikel /wissen/[slug]", "Feed/Inhalt", "read", page(u, `/wissen/${pick(articles).slug}`)),
    (u: User) => timed("Hilfe /hilfe/[slug]", "Feed/Inhalt", "read", page(u, offers.length ? `/hilfe/${pick(offers).slug}` : "/hilfe")),
    (u: User) => timed("Gruppe /community/gruppen/[slug]", "Feed/Inhalt", "read", page(u, `/community/gruppen/${pick(groups).slug}`)),
  ];
  const personal = [
    (u: User) => timed("Heute /heute", "Persönlich lesen", "read", page(u, "/heute")),
    (u: User) => timed("Mein MS /mein-ms", "Persönlich lesen", "read", page(u, "/mein-ms")),
    (u: User) => timed("Verlauf /mein-ms/verlauf", "Persönlich lesen", "read", page(u, "/mein-ms/verlauf")),
    (u: User) => timed("Mitteilungen /mitteilungen", "Persönlich lesen", "read", page(u, "/mitteilungen")),
  ];
  const chat = [
    (u: User) =>
      timed("Nachricht senden (Action)", "Chat", "write", async () => {
        const res = await callAction(u, `/community/gespraeche/${u.conversationId}`, "sendMessageAction", [u.conversationId, `Lasttest ${Date.now()}`, opId()]);
        const ok = res.status < 400 && (await res.text()).includes('"ok":true');
        if (ok) sentMessages.set(u.conversationId, (sentMessages.get(u.conversationId) ?? 0) + 1);
        return ok;
      }),
    (u: User) => timed("Gespräch lesen /community/gespraeche/[id]", "Chat", "read", page(u, `/community/gespraeche/${u.conversationId}`)),
  ];
  const writes = [
    (u: User) =>
      timed("Fatigue-Eintrag (Action)", "Übrige Schreibvorgänge", "write", async () => {
        const now = new Date();
        const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(now);
        const res = await callFormAction(u, "/mein-ms/fatigue/neu", "createFatigueEntryAction", { clientOpId: opId(), date, time: "07:00", fatigue: String(Math.floor(Math.random() * 11)) });
        return res.status < 400 && (res.headers.get("x-action-redirect") ?? "").includes("/mein-ms/eintrag/");
      }),
    (u: User) =>
      timed("Artikel merken (Action)", "Übrige Schreibvorgänge", "write", async () => {
        const [a] = await sql<{ id: string }[]>`select id from content.articles where slug = ${pick(articles).slug}`;
        return actionOk(await callAction(u, "/wissen", "toggleBookmarkAction", ["article", a!.id, Math.random() < 0.5]));
      }),
    (u: User) =>
      timed("Gelesen markieren (Action)", "Übrige Schreibvorgänge", "write", async () =>
        actionOk(await callAction(u, `/community/gespraeche/${u.conversationId}`, "markConversationReadAction", [u.conversationId, 1])),
      ),
  ];

  // Aktive Empfänger mit offenem SSE-Kanal (Echtzeit-Last wie im Betrieb)
  const controller = new AbortController();
  for (const u of users.slice(0, STREAMS))
    void fetch(`${BASE_URL}/api/v1/conversations/${u.conversationId}/stream`, { headers: { Cookie: u.cookie }, signal: controller.signal })
      .then(async (r) => {
        const reader = r.body?.getReader();
        while (reader && !(await reader.read()).done);
      })
      .catch(() => {});

  const start = Date.now();
  const end = start + DURATION_S * 1000;
  console.log(`Last: ${SESSIONS} Sitzungen, Anstieg ${RAMP_S}s, Dauer ${DURATION_S}s, ${STREAMS} SSE-Kanäle, Denkpause ~${THINK_MS}ms`);
  const loops = users.map(async (u, i) => {
    await new Promise((r) => setTimeout(r, (RAMP_S * 1000 * i) / users.length));
    while (Date.now() < end) {
      const r = Math.random();
      const set = r < 0.5 ? feed : r < 0.7 ? personal : r < 0.9 ? chat : writes;
      await pick(set)(u);
      await new Promise((res) => setTimeout(res, -Math.log(1 - Math.random()) * THINK_MS));
    }
  });
  const ticker = setInterval(() => console.log(`  ${Math.round((Date.now() - start) / 1000)}s: ${samples.length} Anfragen, Fehler ${samples.filter((s) => !s.ok).length}`), 15_000);
  await Promise.all(loops);
  clearInterval(ticker);
  controller.abort();

  // Auswertung nur der Dauerlast nach dem Anstieg wäre strenger; hier alle Messungen (konservativ)
  const summarize = (xs: Sample[]) => ({
    n: xs.length,
    p50: round(percentile(xs.map((s) => s.ms), 50)),
    p95: round(percentile(xs.map((s) => s.ms), 95)),
    max: round(Math.max(...xs.map((s) => s.ms))),
    errors: xs.filter((s) => !s.ok).length,
    errorRate: round((100 * xs.filter((s) => !s.ok).length) / Math.max(1, xs.length), 2),
  });
  const byKind = Object.fromEntries((["read", "write"] as Kind[]).map((k) => [k, summarize(samples.filter((s) => s.kind === k))]));
  const ops = [...new Set(samples.map((s) => s.op))].map((op) => ({ op, cls: samples.find((s) => s.op === op)!.cls, ...summarize(samples.filter((s) => s.op === op)) }));
  const classes = [...new Set(samples.map((s) => s.cls))].map((cls) => ({ cls, share: round((100 * samples.filter((s) => s.cls === cls).length) / samples.length, 1) }));

  // Datenkonsistenz: jede bestätigte Nachricht genau einmal, Sequenzen lückenlos
  const convIds = [...new Set(users.map((u) => u.conversationId))];
  const stored = await sql<{ conversation_id: string; n: number; max_seq: number; distinct_seq: number }[]>`
    select conversation_id, count(*)::int as n, max(seq)::int as max_seq, count(distinct seq)::int as distinct_seq
    from messaging.messages where conversation_id in ${sql(convIds)} group by conversation_id`;
  let mismatches = 0;
  for (const s of stored) if (s.n !== (sentMessages.get(s.conversation_id) ?? 0) || s.max_seq !== s.n || s.distinct_seq !== s.n) mismatches++;
  const confirmed = [...sentMessages.values()].reduce((a, b) => a + b, 0);
  const consistency = { confirmedMessages: confirmed, storedMessages: stored.reduce((a, s) => a + s.n, 0), conversationsWithMismatch: mismatches };

  const result = { baseUrl: BASE_URL, sessions: SESSIONS, durationS: DURATION_S, rampS: RAMP_S, thinkMs: THINK_MS, streams: STREAMS, total: summarize(samples), byKind, classes, ops, consistency, at: new Date().toISOString() };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(result, null, 2));
  await sql.end();
}

main().catch(async (err) => {
  console.error("Lasttest abgebrochen:", (err as Error).message);
  await sql.end();
  process.exit(1);
});
