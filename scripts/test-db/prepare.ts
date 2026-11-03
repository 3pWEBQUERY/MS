/**
 * Legt eine frische Testdatenbank an (PRD 16 «Integrationstests prüfen Datenbankregeln»,
 * NFR18: keine produktiven Daten in Testumgebungen) und wendet alle Migrationen an.
 *
 *   tsx scripts/test-db/prepare.ts ms_test            → leere, migrierte DB + Testrolle
 *   tsx scripts/test-db/prepare.ts ms_e2e --seed      → zusätzlich Demo-Seed (für E2E/Leistung)
 *
 * Verbindet sich mit der Wartungsdatenbank aus TEST_ADMIN_URL (Standard: lokale «postgres»).
 * Die Demo-Datenbank «ms» wird nie angefasst. Zusätzlich wird die nicht privilegierte Rolle
 * gemäss docs/db-roles.sql angelegt (Name «ms_app_test», ohne BYPASSRLS) – für RLS-Tests (AT03).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { TEST_ROLE } from "./config";

const ADMIN_URL = process.env.TEST_ADMIN_URL ?? "postgres://postgres@localhost:5432/postgres";

function targetUrl(name: string): string {
  const u = new URL(ADMIN_URL);
  u.pathname = `/${name}`;
  return u.toString();
}

/** Rechte der Web-Rolle aus docs/db-roles.sql übernehmen (gleiche Grants, Testrollenname). */
function roleStatements(root: string): string[] {
  const text = readFileSync(join(root, "docs/db-roles.sql"), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  return text
    .split(";")
    .map((s) => s.trim())
    // Nur die Rechte der Web-Rolle «ms_app»; weitere Rollen (z. B. Hilfe-Dienst) sind hier nicht nötig.
    .filter((s) => s.length > 0 && !/^CREATE ROLE/i.test(s) && /\bms_app\b/.test(s))
    .map((s) => s.replace(/\bms_app\b/g, TEST_ROLE));
}

async function main() {
  const name = process.argv[2] ?? "ms_test";
  const seed = process.argv.includes("--seed");
  if (!/^ms_[a-z0-9_]+$/.test(name) || name === "ms") throw new Error("Nur Testdatenbanken «ms_…» (nie «ms») sind erlaubt.");
  const root = join(__dirname, "../..");

  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${name}' and pid <> pg_backend_pid()`);
  await admin.unsafe(`drop database if exists ${name}`);
  await admin.unsafe(`create database ${name}`);
  const [role] = await admin`select 1 from pg_roles where rolname = ${TEST_ROLE}`;
  if (!role) await admin.unsafe(`create role ${TEST_ROLE} nologin nosuperuser nobypassrls nocreatedb nocreaterole`);
  await admin.end();

  const url = targetUrl(name);
  const env = { ...process.env, DATABASE_URL: url };
  execFileSync("npx", ["tsx", "scripts/migrate.ts"], { cwd: root, env, stdio: "inherit" });

  const db = postgres(url, { max: 1, onnotice: () => {} });
  for (const stmt of roleStatements(root)) await db.unsafe(stmt);
  // Der Eigentümer darf für Tests in die Testrolle wechseln (SET ROLE).
  await db.unsafe(`grant ${TEST_ROLE} to current_user`).catch(() => {});
  await db.end();

  if (seed) execFileSync("npx", ["tsx", "--conditions=react-server", "scripts/seed.ts"], { cwd: root, env, stdio: "inherit" });
  console.log(`Testdatenbank ${name} bereit${seed ? " (mit Demo-Seed)" : ""}.`);
}

main().catch((err) => {
  console.error("Testdatenbank konnte nicht vorbereitet werden:", (err as Error).message);
  process.exit(1);
});
