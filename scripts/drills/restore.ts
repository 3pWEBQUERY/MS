/**
 * Restore-Übung mit Löschjournal (NFR08 «Wiederanlauf ≤ 4 h, quartalsweiser Restore inkl. Löschjournal»,
 * AT09 «Restore wendet Journal an», Runbook R4). Arbeitet ausschliesslich auf Kopien.
 *
 *   npm run drill:restore          # Quelle: DATABASE_URL (Entwicklung/Test, nie Produktion)
 *
 *  1. Kopie A der Quelle anlegen (pg_dump | pg_restore)
 *  2. verschlüsselte Sicherung von A mit dem echten Backup-Code (scripts/backup/run.ts --local)
 *  3. in A mit dem echten Fachcode löschen: ein ganzes Konto (PRI05) und die Gesundheitsdaten eines
 *     zweiten Kontos (PRI04) – danach steht beides im Löschjournal
 *  4. Sicherung entschlüsseln (scripts/backup/restore.ts) und in eine NEUE Datenbank B einspielen;
 *     dort sind die gelöschten Daten wieder da («Wiederauferstehung»)
 *  5. Löschjournal von A auf B anwenden (scripts/apply-deletion-journal.ts)
 *  6. prüfen: gelöschtes Konto ohne Personendaten und nicht anmeldbar, Gesundheitsdaten weg,
 *     andere Konten unverändert, keine alten Hintergrundaufträge offen; Dauer je Schritt (RTO)
 * Am Ende werden beide Kopien entfernt. Ausgabe nur Anzahlen und Dauer, keine Inhalte.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";

const sourceUrl = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/ms";
if (process.env.NODE_ENV === "production") {
  console.error("Abbruch: Restore-Übung nie gegen Produktion – nur mit einer Kopie in Entwicklung oder Test.");
  process.exit(2);
}
const run = randomUUID().slice(0, 8);
const dbUrl = (name: string) => {
  const u = new URL(sourceUrl);
  u.pathname = `/${name}`;
  return u.toString();
};
const A = `ms_drill_a_${run}`;
const B = `ms_drill_b_${run}`;
const admin = postgres(dbUrl("postgres"), { max: 1, onnotice: () => {} });
const dir = mkdtempSync(join(tmpdir(), "ms-restore-drill-"));
const results: { step: string; ok: boolean; detail: string }[] = [];
const timings: [string, number][] = [];
const check = (step: string, ok: boolean, detail: string) => {
  results.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step} – ${detail}`);
};
async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const t = Date.now();
  const r = await fn();
  timings.push([label, (Date.now() - t) / 1000]);
  return r;
}
function sh(cmd: string, args: string[], env: Record<string, string> = {}) {
  const r = spawnSync(cmd, args, { env: { ...process.env, ...env }, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args[0] ?? ""} fehlgeschlagen: ${(r.stderr || r.stdout).split("\n").slice(-3).join(" ").slice(0, 300)}`);
  return r.stdout;
}

type Snapshot = { status: string; email: string; checkIns: number; diary: number; sessions: number };
async function snapshot(sql: postgres.Sql, id: string): Promise<Snapshot> {
  const [r] = await sql<Snapshot[]>`
    select a.status::text as status, a.email,
      (select count(*)::int from health.check_ins where account_id = a.id) as "checkIns",
      (select count(*)::int from health.diary_entries where account_id = a.id) as diary,
      (select count(*)::int from identity.sessions where account_id = a.id and revoked_at is null) as sessions
    from identity.accounts a where a.id = ${id}`;
  return r;
}

async function main() {
  console.log(`Restore-Übung ${run} (Quelle ${new URL(sourceUrl).host}${new URL(sourceUrl).pathname})`);
  const backupKey = randomBytes(32).toString("base64");

  // 1. Kopie A
  await timed("Kopie A anlegen", async () => {
    await admin.unsafe(`create database ${A}`);
    execFileSync("sh", ["-c", `pg_dump --format=custom --no-owner "${sourceUrl}" | pg_restore --no-owner --no-privileges --dbname "${dbUrl(A)}"`]);
  });
  const a = postgres(dbUrl(A), { max: 2, onnotice: () => {} });

  // Zwei Mitgliedskonten ohne Rollen und Exporte wählen; dem zweiten in der Kopie fiktive
  // Check-ins geben (Kopie der Check-ins des ersten), falls der Demo-Seed nur eines füllt.
  const members = await a<{ id: string; n: number }[]>`
    select ac.id, (select count(*)::int from health.check_ins c where c.account_id = ac.id) as n
    from identity.accounts ac
    where ac.status = 'active'
      and not exists (select 1 from identity.role_assignments r where r.account_id = ac.id and r.revoked_at is null)
      and not exists (select 1 from privacy.export_jobs e where e.account_id = ac.id)
    order by 2 desc, ac.created_at limit 2`;
  if (members.length < 2 || members[0].n === 0) throw new Error("Quelle braucht zwei Mitgliedskonten, eines mit Check-ins (Demo-Seed)");
  const [gone, healthOnly] = members.map((m) => m.id);
  if (members[1].n === 0) {
    await a.unsafe(`
      create temp table drill_ci as select * from health.check_ins where account_id = '${gone}';
      update drill_ci set id = gen_random_uuid(), account_id = '${healthOnly}';
      insert into health.check_ins select * from drill_ci;`);
  }
  const othersQuery = (sql: postgres.Sql) => sql<{ v: string }[]>`
    select (select count(*) from identity.accounts where status = 'active' and id not in (${gone}, ${healthOnly}))
      || '/' || (select count(*) from content.articles)
      || '/' || (select count(*) from community.posts where author_id not in (${gone}, ${healthOnly}) and status <> 'deleted') as v`;
  const others = await othersQuery(a);
  const before = { gone: await snapshot(a, gone), healthOnly: await snapshot(a, healthOnly) };

  // 2. Sicherung mit dem echten Backup-Code
  const enc = join(dir, "a.dump.enc");
  await timed("Sicherung (pg_dump + Verschlüsselung)", () =>
    sh("npx", ["tsx", "scripts/backup/run.ts", "--local", enc], { BACKUP_DATABASE_URL: dbUrl(A), BACKUP_ENCRYPTION_KEY: backupKey }),
  );

  // 3. Löschen mit dem echten Fachcode in A (Arbeiter-Schritte direkt ausgeführt)
  process.env.DATABASE_URL = dbUrl(A);
  const erasure = await import("@/server/modules/privacy/erasure");
  const acc = await erasure.deactivateAccountForErasure(gone, {});
  if (!acc) throw new Error("Konto liess sich nicht deaktivieren");
  await erasure.runErasureRequest(acc.requestId);
  await erasure.eraseHealthData(healthOnly, { actorId: healthOnly, identityMethod: "drill" });
  const afterErase = { gone: await snapshot(a, gone), healthOnly: await snapshot(a, healthOnly) };
  const [{ n: journal }] = await a<{ n: number }[]>`select count(*)::int as n from privacy.deletion_journal where account_id in (${gone}, ${healthOnly})`;
  check(
    "Löschung in der laufenden Datenbank",
    afterErase.gone.checkIns === 0 && afterErase.gone.sessions === 0 && afterErase.healthOnly.checkIns === 0 && journal >= 2,
    `Konto ${afterErase.gone.status}, Check-ins ${before.gone.checkIns}→${afterErase.gone.checkIns}; zweites Konto Check-ins ${before.healthOnly.checkIns}→${afterErase.healthOnly.checkIns}; Journal ${journal} Einträge`,
  );

  // 4. Restore in neue Datenbank B
  const plain = join(dir, "a.dump");
  await timed("Entschlüsseln", () => sh("npx", ["tsx", "scripts/backup/restore.ts", "--file", enc, "--out", plain], { BACKUP_ENCRYPTION_KEY: backupKey }));
  await timed("Einspielen in neue Datenbank", async () => {
    await admin.unsafe(`create database ${B}`);
    sh("pg_restore", ["--no-owner", "--no-privileges", "--dbname", dbUrl(B), plain]);
  });
  const b = postgres(dbUrl(B), { max: 2, onnotice: () => {} });
  const resurrected = await snapshot(b, gone);
  check("Sicherung enthält den alten Stand", resurrected.status === before.gone.status && resurrected.checkIns === before.gone.checkIns,
    `ohne Journal wäre das gelöschte Konto wieder ${resurrected.status} mit ${resurrected.checkIns} Check-ins`);

  // 5. Journal anwenden
  await timed("Löschjournal anwenden", () =>
    sh("npx", ["tsx", "scripts/apply-deletion-journal.ts", "--source", dbUrl(A), "--target", dbUrl(B)]),
  );

  // 6. Prüfungen
  const final = { gone: await snapshot(b, gone), healthOnly: await snapshot(b, healthOnly) };
  check("Gelöschtes Konto bleibt gelöscht",
    final.gone.status === "deleted" && final.gone.email.endsWith("@invalid.invalid") && final.gone.checkIns === 0 && final.gone.diary === 0 && final.gone.sessions === 0,
    `Status ${final.gone.status}, E-Mail anonymisiert ${final.gone.email.endsWith("@invalid.invalid")}, Check-ins ${final.gone.checkIns}, Sitzungen ${final.gone.sessions}`);
  const [{ hash }] = await b<{ hash: string }[]>`select password_hash as hash from identity.accounts where id = ${gone}`;
  check("Nicht mehr anmeldbar", hash === "!", "Passwort-Hash entfernt");
  check("Gesundheitsdaten des zweiten Kontos bleiben gelöscht",
    final.healthOnly.checkIns === 0 && final.healthOnly.diary === 0 && final.healthOnly.status === "active",
    `Check-ins ${final.healthOnly.checkIns}, Tagebuch ${final.healthOnly.diary}, Konto weiterhin ${final.healthOnly.status}`);
  const [{ v: othersAfter }] = await othersQuery(b);
  check("Andere Daten unverändert", othersAfter === others[0].v, `aktive Konten/Artikel/fremde Beiträge ${othersAfter} (vorher ${others[0].v})`);
  const [{ n: open }] = await b<{ n: number }[]>`select count(*)::int as n from ops.outbox_events where status in ('pending', 'failed', 'processing')`;
  check("Keine alten Hintergrundaufträge offen", open === 0, `${open} offene Outbox-Ereignisse`);

  const total = timings.reduce((s, [, t]) => s + t, 0);
  console.log("\nDauer je Schritt:");
  for (const [l, t] of timings) console.log(`  ${l.padEnd(40)} ${t.toFixed(1)} s`);
  console.log(`  ${"gesamt (technisch)".padEnd(40)} ${total.toFixed(1)} s  (Ziel NFR08: ≤ 4 h inkl. Prüfung)`);
  await a.end();
  await b.end();
  const { sql: appSql } = await import("@/server/db");
  await appSql.end({ timeout: 2 });
}

main()
  .catch((err) => check("Ablauf", false, err instanceof Error ? err.message : String(err)))
  .finally(async () => {
    for (const name of [A, B]) await admin.unsafe(`drop database if exists ${name} with (force)`).catch(() => {});
    await admin.end();
    rmSync(dir, { recursive: true, force: true });
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed === 0 ? `\nÜbung bestanden (${results.length} Prüfungen).` : `\nÜbung NICHT bestanden: ${failed} Prüfung(en).`);
    process.exit(failed === 0 ? 0 : 1);
  });
