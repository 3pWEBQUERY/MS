import { date, index, integer, jsonb, pgSchema, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts } from "./_shared";
import { accounts } from "./identity";

/**
 * Optionale Produktanalytics (PRD 15) – eigenes Schema, getrennt vom Betriebsmonitoring.
 * Standardmässig aus; Ereignisse nur mit gültiger Einwilligung «analytics».
 * Kein Bezug zu Tagebuch, Moderation oder Inhalten; Rohdaten höchstens 30 Tage.
 */
export const analytics = pgSchema("analytics");

export const analyticsEventName = analytics.enum("event_name", [
  "onboarding_completed",
  "moment_path_selected",
  "useful_action_completed",
  "core_flow_failed",
  "preference_changed",
]);

/**
 * Zufälliger Analysebezug je Konto, höchstens 30 Tage gültig. Läuft er ab oder wird die
 * Einwilligung widerrufen, löscht der Worker den Bezug samt Rohdaten (Kaskade).
 */
export const analyticsSubjects = analytics.table("subjects", {
  ref: uuid("ref").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .unique()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
  expiresAt: ts("expires_at").notNull(),
});

/** Rohereignisse: nur Ereignisname, erlaubte Parameter und Kalendertag (keine Uhrzeit). */
export const analyticsEvents = analytics.table(
  "events",
  {
    id: id(),
    ref: uuid("ref")
      .notNull()
      .references(() => analyticsSubjects.ref, { onDelete: "cascade" }),
    name: analyticsEventName("name").notNull(),
    params: jsonb("params").notNull().default({}),
    day: date("day", { mode: "string" }).notNull(),
    /** Ereignis + Parameter; je Bezug und Tag höchstens einmal gespeichert */
    dedupe: text("dedupe").notNull(),
  },
  (t) => [uniqueIndex("analytics_events_dedupe_uq").on(t.ref, t.day, t.dedupe), index("analytics_events_name_day_idx").on(t.name, t.day)],
);

/**
 * Kohortenzähler je Einstiegstag (onboarding_completed), vom Worker vor Ablauf der Rohdaten
 * berechnet. Enthält keinen Bezug; Ausgabe erst ab zehn Personen.
 */
export const analyticsCohortDays = analytics.table("cohort_days", {
  day: date("day", { mode: "string" }).primaryKey(),
  entered: integer("entered").notNull(),
  activated7d: integer("activated_7d").notNull(),
  /** { article_opened: n, … } – Personen je Aktionstyp innerhalb von 7 Tagen */
  activatedByType: jsonb("activated_by_type").notNull().default({}),
  activeWeek4: integer("active_week4").notNull(),
  computedAt: ts("computed_at").notNull().defaultNow(),
});
