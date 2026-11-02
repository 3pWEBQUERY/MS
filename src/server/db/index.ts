import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

declare global {
  var __msSql: postgres.Sql | undefined;
}

/** Ein Verbindungspool pro Prozess (Hot Reload sicher). */
export const sql =
  globalThis.__msSql ??
  postgres(env.databaseUrl(), {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });

if (!env.isProd) globalThis.__msSql = sql;

export const db = drizzle(sql, { schema, casing: "snake_case" });

/*
 * drizzle setzt die Serialisierer für Zeittypen auf «durchreichen». Dadurch würden
 * Date-Objekte in rohen sql`…`-Parametern als «Mon Nov 02 2026 …» gesendet. Date-Werte
 * werden deshalb immer als ISO-8601-Zeitpunkt (UTC) übertragen.
 */
const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : v);
for (const oid of [1082, 1083, 1114, 1184, 1266]) {
  const serializers = (sql.options as unknown as { serializers: Record<number, (v: unknown) => unknown> }).serializers;
  const previous = serializers[oid];
  serializers[oid] = (v: unknown) => (previous ? previous(toIso(v)) : toIso(v));
}
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

export { schema };
