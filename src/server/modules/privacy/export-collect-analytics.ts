import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { analyticsEvents, analyticsSubjects } from "../../db/schema";
import { iso } from "./export-format";

/**
 * Export und Auskunft (PRI03, PRD 15): optionale Nutzungsstatistik dieses Kontos – der eigene
 * zufällige Analysebezug und die zugehörigen Rohereignisse (nur Ereignisname, erlaubte Parameter,
 * Kalendertag). Ohne Einwilligung oder nach Ablauf/Widerruf existieren keine Rohdaten.
 */
export async function collectAnalytics(accountId: string) {
  const [subject] = await db
    .select({ ref: analyticsSubjects.ref, createdAt: analyticsSubjects.createdAt, expiresAt: analyticsSubjects.expiresAt })
    .from(analyticsSubjects)
    .where(eq(analyticsSubjects.accountId, accountId))
    .limit(1);
  const events = subject
    ? await db
        .select({ name: analyticsEvents.name, params: analyticsEvents.params, day: analyticsEvents.day })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.ref, subject.ref))
        .orderBy(asc(analyticsEvents.day), asc(analyticsEvents.name))
        .limit(5000)
    : [];
  return {
    hinweis:
      "Optionale, pseudonyme Nutzungsstatistik (bis zur Löschung deinem Konto zugeordnet). Gespeichert nur mit deiner Einwilligung «Nutzungsstatistik»; Rohdaten werden nach höchstens 30 Tagen und bei Widerruf sofort gelöscht. Ausgewertet werden nur Summen ab zehn Personen.",
    analysebezug: subject
      ? { kennung: subject.ref, angelegt_am_utc: iso(subject.createdAt), loeschung_spaetestens_utc: iso(subject.expiresAt) }
      : null,
    ereignisse: events.map((e) => ({ ereignis: e.name, angaben: e.params, tag: e.day })),
  };
}
