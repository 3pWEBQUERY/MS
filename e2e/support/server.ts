/**
 * Startet den Produktions-Build für die E2E-Tests: Testdatenbank «ms_e2e» neu anlegen,
 * migrieren und seeden, `next build` (überspringbar mit E2E_SKIP_BUILD=1) und `next start -p 3200`.
 * Nie gegen die Demo-Datenbank «ms».
 */
import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
import { E2E_DATA_KEY, E2E_DB_URL } from "./db";

const root = join(__dirname, "../..");
const env = {
  ...process.env,
  DATABASE_URL: E2E_DB_URL,
  DATA_ENCRYPTION_KEY: E2E_DATA_KEY,
  APP_URL: "http://localhost:3200",
  NEXT_TELEMETRY_DISABLED: "1",
  DEMO_MODE: "true",
};

if (process.env.E2E_SKIP_DB_PREPARE !== "1")
  execFileSync("npx", ["tsx", "scripts/test-db/prepare.ts", new URL(E2E_DB_URL).pathname.slice(1), "--seed"], { cwd: root, env, stdio: "inherit" });
if (process.env.E2E_SKIP_BUILD !== "1") execFileSync("npx", ["next", "build"], { cwd: root, env, stdio: "inherit" });

const server = spawn("npx", ["next", "start", "-p", "3200"], { cwd: root, env, stdio: "inherit" });
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => server.kill(sig));
server.on("exit", (code) => process.exit(code ?? 0));
