import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

/** Nicht erratbare Primärschlüssel (PRD 09). */
export const id = () => uuid("id").primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Optimistische Versionierung für veränderliche Datensätze (DIA04, PRD 09). */
export const version = () => integer("version").notNull().default(1);

export const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
