/**
 * Führt Migrationen aus (Railway preDeployCommand: `npm run db:migrate`).
 * Vorwärtskompatibel; risikoreiche Änderungen benötigen Sicherung (PRD 14).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL ?? (process.env.NODE_ENV === "production" ? "" : "postgres://postgres@localhost:5432/ms");
  if (!url) throw new Error("DATABASE_URL fehlt");
  // Host ohne Zugangsdaten protokollieren – hilft bei Netzwerkfehlern
  console.log(`Verbinde mit ${new URL(url).hostname}`);
  const sql = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 15 });
  // Datenbank startet evtl. noch: bis zu 6 Versuche mit Backoff
  for (let attempt = 1; ; attempt++) {
    try {
      await sql`select 1`;
      break;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "error";
      if (attempt >= 6) throw err;
      console.log(`Datenbank nicht erreichbar (${code}), Versuch ${attempt}/6`);
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  const db = drizzle(sql);
  await sql`create extension if not exists pgcrypto`;
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrationen angewendet");
}

main().catch((err) => {
  const e = err as { message?: string; code?: string; errors?: { code?: string; address?: string }[] };
  console.error("Migration fehlgeschlagen:", e.message || e.code || String(err), e.errors?.map((x) => `${x.code} ${x.address ?? ""}`).join(", ") ?? "");
  process.exit(1);
});
