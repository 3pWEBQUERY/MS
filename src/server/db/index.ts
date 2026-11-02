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
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

export { schema };
