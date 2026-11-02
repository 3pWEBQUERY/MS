/**
 * Startbestand für Test- und Pilotumgebungen (CON08): fiktive Konten, Kataloge,
 * Beispielinhalte. Idempotent. Inhalte sind vor Produktivbetrieb fachlich zu prüfen.
 *   npm run db:seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { seedCommunity } from "./seed/community";
import { seedContent } from "./seed/content";
import { DEMO_PASSWORD, DEMO_TOTP_SECRET, seedCore } from "./seed/core";
import { seedHealth } from "./seed/health";
import { seedModeration } from "./seed/moderation";

async function main() {
  const sql = postgres(process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/ms", { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  const ctx = await seedCore(db);
  await seedHealth(ctx);
  await seedContent(ctx);
  await seedCommunity(ctx);
  await seedModeration(ctx);
  await sql.end();
  console.log("Seed abgeschlossen.");
  console.log(`Demo-Passwort: ${DEMO_PASSWORD}`);
  console.log(`TOTP-Geheimnis der Demo-Mitarbeitenden: ${DEMO_TOTP_SECRET}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
