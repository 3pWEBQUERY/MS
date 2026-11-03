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
  // Im Pre-Deploy nur ausführen, wenn die Umgebung ausdrücklich als Demo markiert ist.
  if (process.env.SEED_ONLY_IF_DEMO === "1" && process.env.SEED_DEMO !== "true") {
    console.log("Seed übersprungen (SEED_DEMO ist nicht «true»).");
    return;
  }
  // Öffentliche Umgebungen nie mit den Standard-Zugangsdaten aus dem Repository seeden.
  if (process.env.NODE_ENV === "production" && (!process.env.SEED_PASSWORD || !process.env.SEED_TOTP_SECRET)) {
    throw new Error("In Produktion sind SEED_PASSWORD und SEED_TOTP_SECRET Pflicht.");
  }
  const sql = postgres(process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/ms", { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  const ctx = await seedCore(db);
  await seedHealth(ctx);
  await seedContent(ctx);
  await seedCommunity(ctx);
  await seedModeration(ctx);
  await sql.end();
  console.log("Seed abgeschlossen.");
  if (process.env.NODE_ENV === "production") {
    console.log("Zugangsdaten der Demo-Konten: Railway-Variablen SEED_PASSWORD und SEED_TOTP_SECRET.");
  } else {
    console.log(`Demo-Passwort: ${DEMO_PASSWORD}`);
    console.log(`TOTP-Geheimnis der Demo-Mitarbeitenden: ${DEMO_TOTP_SECRET}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
