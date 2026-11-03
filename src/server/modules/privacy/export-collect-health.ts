import "server-only";
import { asc, eq } from "drizzle-orm";
import { decryptOptional } from "../../crypto";
import { checkIns, diaryEntries, symptomDefinitions, symptomObservations } from "../../db/schema";
import { withOwnerScope } from "../../db/scoped";
import { iso, measure, type CsvCheckIn, type CsvEntry } from "./export-format";

/**
 * Export: eigene Gesundheitsdaten (PRI03, DIA08). Nur im Inhaberkontext (RLS) und
 * zusätzlich mit Eigentümerfilter gelesen; Notizen werden erst hier entschlüsselt.
 */
async function loadHealth(accountId: string) {
  return withOwnerScope(accountId, async (tx) => {
    const ci = await tx
      .select({
        id: checkIns.id,
        localDate: checkIns.localDate,
        timezone: checkIns.timezone,
        utcOffsetMinutes: checkIns.utcOffsetMinutes,
        energy: checkIns.energy,
        mood: checkIns.mood,
        fatigue: checkIns.fatigue,
        noteEncrypted: checkIns.noteEncrypted,
        scaleVersion: checkIns.scaleVersion,
        createdAt: checkIns.createdAt,
        updatedAt: checkIns.updatedAt,
      })
      .from(checkIns)
      .where(eq(checkIns.accountId, accountId))
      .orderBy(asc(checkIns.localDate));
    const entries = await tx
      .select({
        id: diaryEntries.id,
        kind: diaryEntries.kind,
        observedAt: diaryEntries.observedAt,
        localDate: diaryEntries.localDate,
        localTime: diaryEntries.localTime,
        timezone: diaryEntries.timezone,
        utcOffsetMinutes: diaryEntries.utcOffsetMinutes,
        fatigue: diaryEntries.fatigue,
        sleepNoteEncrypted: diaryEntries.sleepNoteEncrypted,
        noteEncrypted: diaryEntries.noteEncrypted,
        scaleVersion: diaryEntries.scaleVersion,
        createdAt: diaryEntries.createdAt,
        updatedAt: diaryEntries.updatedAt,
      })
      .from(diaryEntries)
      .where(eq(diaryEntries.accountId, accountId))
      .orderBy(asc(diaryEntries.observedAt));
    const obs = await tx
      .select({
        entryId: symptomObservations.entryId,
        label: symptomObservations.labelSnapshot,
        intensity: symptomObservations.intensity,
        durationMinutes: symptomObservations.durationMinutes,
        code: symptomDefinitions.code,
        own: symptomDefinitions.ownerAccountId,
      })
      .from(symptomObservations)
      .leftJoin(symptomDefinitions, eq(symptomDefinitions.id, symptomObservations.definitionId))
      .where(eq(symptomObservations.accountId, accountId))
      .orderBy(asc(symptomObservations.createdAt));
    const ownDefs = await tx
      .select({ label: symptomDefinitions.label, active: symptomDefinitions.active, createdAt: symptomDefinitions.createdAt })
      .from(symptomDefinitions)
      .where(eq(symptomDefinitions.ownerAccountId, accountId))
      .orderBy(asc(symptomDefinitions.createdAt));
    return { ci, entries, obs, ownDefs };
  });
}

/** Gesundheitsabschnitt der JSON-Datei und die (entschlüsselten) Zeilen für die Tagebuch-CSV. */
export async function collectHealth(accountId: string) {
  const health = await loadHealth(accountId);
  const obsByEntry = new Map<string, typeof health.obs>();
  for (const o of health.obs) obsByEntry.set(o.entryId, [...(obsByEntry.get(o.entryId) ?? []), o]);

  const checkInRows: CsvCheckIn[] = health.ci.map((c) => ({ ...c, note: decryptOptional(c.noteEncrypted) }));
  const entryRows: CsvEntry[] = health.entries.map((e) => ({
    ...e,
    sleepNote: decryptOptional(e.sleepNoteEncrypted),
    note: decryptOptional(e.noteEncrypted),
    observations: (obsByEntry.get(e.id) ?? []).map((o) => ({ label: o.label, intensity: o.intensity, durationMinutes: o.durationMinutes })),
  }));

  const section = {
    quelle: "selbst erfasst",
    check_ins: health.ci.map((c, i) => ({
      id: c.id,
      lokales_datum: c.localDate,
      zeitzone: c.timezone,
      utc_offset_minuten: c.utcOffsetMinutes,
      energie: measure(c.energy, "0–10"),
      stimmung: measure(c.mood, "1–5"),
      fatigue: measure(c.fatigue, "0–10"),
      notiz: checkInRows[i].note,
      skalenfassung: c.scaleVersion,
      quelle: "selbst erfasst",
      erfasst_am_utc: iso(c.createdAt),
      geaendert_am_utc: iso(c.updatedAt),
    })),
    tagebuch: health.entries.map((e, i) => ({
      id: e.id,
      art: e.kind === "fatigue" ? "fatigue" : "symptom",
      beobachtet_utc: iso(e.observedAt),
      lokales_datum: e.localDate,
      lokale_zeit: e.localTime,
      zeitzone: e.timezone,
      utc_offset_minuten: e.utcOffsetMinutes,
      fatigue: measure(e.fatigue, "0–10"),
      schlafbeobachtung: entryRows[i].sleepNote,
      notiz: entryRows[i].note,
      symptome: (obsByEntry.get(e.id) ?? []).map((o) => ({
        bezeichnung: o.label,
        katalogcode: o.own ? null : o.code,
        eigene_bezeichnung: Boolean(o.own),
        staerke: measure(o.intensity, "0–10"),
        dauer_minuten: { wert: o.durationMinutes, erfasst: o.durationMinutes !== null },
      })),
      skalenfassung: e.scaleVersion,
      quelle: "selbst erfasst",
      erfasst_am_utc: iso(e.createdAt),
      geaendert_am_utc: iso(e.updatedAt),
    })),
    eigene_symptombezeichnungen: health.ownDefs.map((d) => ({
      bezeichnung: d.label,
      aktiv: d.active,
      angelegt_am_utc: iso(d.createdAt),
    })),
  };

  return { section, csv: { checkIns: checkInRows, entries: entryRows } };
}
