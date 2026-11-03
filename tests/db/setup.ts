import { afterAll } from "vitest";
import { sql } from "@/server/db";

/** Verbindungspool je Testdatei schliessen (DB-Integrationstests, vitest.db.config.mts). */
afterAll(async () => {
  await sql.end({ timeout: 5 });
});
