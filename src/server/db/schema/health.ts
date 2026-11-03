import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgSchema,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, version } from "./_shared";
import { accounts } from "./identity";

/**
 * Private Gesundheitsdokumentation (DIA01–DIA08).
 * Getrenntes Schema, Row-Level Security (siehe drizzle/rls.sql), Freitexte verschlüsselt.
 * Zugriff ausschliesslich über src/server/modules/health.
 */
export const health = pgSchema("health");

export const diaryKind = health.enum("diary_kind", ["symptom", "fatigue"]);

export const checkIns = health.table(
  "check_ins",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** Bewusst gewähltes lokales Datum – verschiebt sich bei Zeitzonenwechsel nicht (DIA02) */
    localDate: date("local_date", { mode: "string" }).notNull(),
    timezone: text("timezone").notNull(),
    utcOffsetMinutes: integer("utc_offset_minutes").notNull(),
    /** 0–10, null = nicht erfasst */
    energy: smallint("energy"),
    /** 1–5, null = nicht erfasst */
    mood: smallint("mood"),
    /** 0–10, null = nicht erfasst */
    fatigue: smallint("fatigue"),
    noteEncrypted: text("note_encrypted"),
    scaleVersion: text("scale_version").notNull(),
    clientOpId: uuid("client_op_id").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [
    uniqueIndex("check_ins_account_date_uq").on(t.accountId, t.localDate),
    uniqueIndex("check_ins_op_uq").on(t.accountId, t.clientOpId),
    check("check_ins_energy_range", sql`${t.energy} is null or (${t.energy} between 0 and 10)`),
    check("check_ins_mood_range", sql`${t.mood} is null or (${t.mood} between 1 and 5)`),
    check("check_ins_fatigue_range", sql`${t.fatigue} is null or (${t.fatigue} between 0 and 10)`),
    check(
      "check_ins_has_value",
      sql`${t.energy} is not null or ${t.mood} is not null or ${t.fatigue} is not null`,
    ),
  ],
);

export const diaryEntries = health.table(
  "diary_entries",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    kind: diaryKind("kind").notNull(),
    /** Beobachtungszeit in UTC */
    observedAt: ts("observed_at").notNull(),
    localDate: date("local_date", { mode: "string" }).notNull(),
    localTime: text("local_time").notNull(),
    timezone: text("timezone").notNull(),
    utcOffsetMinutes: integer("utc_offset_minutes").notNull(),
    fatigue: smallint("fatigue"),
    /** Freitext bis 250 Zeichen, verschlüsselt, kein Schlafscore */
    sleepNoteEncrypted: text("sleep_note_encrypted"),
    /** Freitext bis 2000 Zeichen, verschlüsselt */
    noteEncrypted: text("note_encrypted"),
    scaleVersion: text("scale_version").notNull(),
    clientOpId: uuid("client_op_id").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [
    index("diary_entries_account_time_idx").on(t.accountId, t.observedAt),
    uniqueIndex("diary_entries_op_uq").on(t.accountId, t.clientOpId),
    check("diary_entries_fatigue_range", sql`${t.fatigue} is null or (${t.fatigue} between 0 and 10)`),
    /** PRD 09 «mindestens ein Messinhalt»: Fatigue-Einträge tragen immer einen Wert (Symptome über symptom_observations) */
    check("diary_entries_fatigue_value", sql`${t.kind} <> 'fatigue' or ${t.fatigue} is not null`),
  ],
);

/** Gemeinsamer Katalog (ownerAccountId null) oder private eigene Bezeichnung. */
export const symptomDefinitions = health.table(
  "symptom_definitions",
  {
    id: id(),
    code: text("code"),
    label: text("label").notNull(),
    ownerAccountId: uuid("owner_account_id").references(() => accounts.id, { onDelete: "cascade" }),
    catalogVersion: text("catalog_version"),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("symptom_definitions_code_uq").on(t.code),
    index("symptom_definitions_owner_idx").on(t.ownerAccountId),
  ],
);

export const symptomObservations = health.table(
  "symptom_observations",
  {
    id: id(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => diaryEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    definitionId: uuid("definition_id").references(() => symptomDefinitions.id, { onDelete: "set null" }),
    /** Bezeichnung zum Erfassungszeitpunkt – bleibt historisch verständlich */
    labelSnapshot: text("label_snapshot").notNull(),
    intensity: smallint("intensity").notNull(),
    durationMinutes: integer("duration_minutes"),
    createdAt: createdAt(),
  },
  (t) => [
    index("symptom_observations_entry_idx").on(t.entryId),
    check("symptom_observations_intensity", sql`${t.intensity} between 0 and 10`),
    check(
      "symptom_observations_duration",
      sql`${t.durationMinutes} is null or (${t.durationMinutes} between 0 and 10080)`,
    ),
  ],
);
