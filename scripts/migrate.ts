/**
 * Führt Migrationen aus (Railway preDeployCommand: `npm run db:migrate`).
 * Vorwärtskompatibel; risikoreiche Änderungen benötigen Sicherung (PRD 14).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/ms";
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(sql);
  await sql`create extension if not exists pgcrypto`;
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrationen angewendet");
}

main().catch((err) => {
  console.error("Migration fehlgeschlagen:", err instanceof Error ? err.message : err);
  process.exit(1);
});
