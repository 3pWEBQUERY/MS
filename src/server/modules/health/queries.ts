import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, or, sql as dsql } from "drizzle-orm";
import { addDays, localDateString, localTimeString, zonedToUtc } from "@/lib/time";
import { shortValue, durationText, type EntryKind } from "@/components/health/format";
import type { Viewer } from "../../auth/viewer";
import { decryptOptional } from "../../crypto";
import type { Tx } from "../../db";
import { withOwnerScope } from "../../db/scoped";
import { checkIns, diaryEntries, symptomDefinitions, symptomObservations } from "../../db/schema";
import { isEnabled } from "../../flags";
import { isDateString, isUuid } from "./validation";

/**
 * Lesende Zugriffe auf die private Gesundheitsdokumentation (DIA04, PRD 14):
 * jede Abfrage läuft in withOwnerScope (RLS-Kontext) UND filtert selbst nach account_id.
 * Explizite Feldauswahl; Freitexte werden nur in Detailansichten entschlüsselt.
 */

export async function healthWriteEnabled(): Promise<boolean> {
  return isEnabled("health_write");
}

const tzOf = (viewer: Viewer) => viewer.prefs.timezone;

/** UTC-Grenzen eines lokalen Datumsbereichs [from, to] (inklusive) */
function utcBounds(from: string, to: string, timeZone: string) {
  return { start: zonedToUtc(from, "00:00", timeZone), end: zonedToUtc(addDays(to, 1), "00:00", timeZone) };
}

/* ───────────────────────── Check-ins ───────────────────────── */

export type CheckInDetail = {
  id: string;
  localDate: string;
  timezone: string;
  utcOffsetMinutes: number;
  energy: number | null;
  mood: number | null;
  fatigue: number | null;
  note: string | null;
  scaleVersion: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export async function readCheckIn(tx: Tx, accountId: string, date: string): Promise<CheckInDetail | null> {
  const [row] = await tx
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
      version: checkIns.version,
    })
    .from(checkIns)
    .where(and(eq(checkIns.accountId, accountId), eq(checkIns.localDate, date)))
    .limit(1);
  if (!row) return null;
  const { noteEncrypted, ...rest } = row;
  return { ...rest, note: decryptOptional(noteEncrypted) };
}

/** Check-in eines lokalen Datums (S20 Bearbeitung). Ungültige Daten liefern null. */
export async function getCheckInByDate(viewer: Viewer, date: string): Promise<CheckInDetail | null> {
  if (!isDateString(date)) return null;
  return withOwnerScope(viewer.accountId, (tx) => readCheckIn(tx, viewer.accountId, date));
}

/**
 * Für «Heute» (S18): Datum des heutigen lokalen Tags und ob dafür bereits ein Check-in besteht.
 * Ohne Entscheidung zum Gesundheitsbereich wird nichts abgefragt.
 */
export async function getTodayCheckIn(viewer: Viewer): Promise<{ date: string; exists: boolean; href: string }> {
  const date = localDateString(new Date(), tzOf(viewer));
  if (!viewer.healthDecided) return { date, exists: false, href: "/mein-ms/check-in" };
  const exists = await withOwnerScope(viewer.accountId, async (tx) => {
    const [row] = await tx
      .select({ id: checkIns.id })
      .from(checkIns)
      .where(and(eq(checkIns.accountId, viewer.accountId), eq(checkIns.localDate, date)))
      .limit(1);
    return Boolean(row);
  });
  return { date, exists, href: exists ? `/mein-ms/check-in/${date}` : "/mein-ms/check-in" };
}

/* ───────────────────────── Tagebuch ───────────────────────── */

export type ObservationDetail = {
  id: string;
  definitionId: string | null;
  label: string;
  intensity: number;
  durationMinutes: number | null;
};

export type DiaryDetail = {
  id: string;
  kind: "symptom" | "fatigue";
  observedAt: Date;
  /** Ursprünglich gespeicherte lokale Angaben (Export, Zeitzonenhinweis) */
  storedLocalDate: string;
  storedLocalTime: string;
  timezone: string;
  utcOffsetMinutes: number;
  /** In der aktuell eingestellten Zeitzone */
  localDate: string;
  localTime: string;
  fatigue: number | null;
  sleepNote: string | null;
  note: string | null;
  observations: ObservationDetail[];
  scaleVersion: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export async function readDiaryEntry(tx: Tx, accountId: string, id: string, timeZone: string): Promise<DiaryDetail | null> {
  const [row] = await tx
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
      version: diaryEntries.version,
    })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.id, id), eq(diaryEntries.accountId, accountId)))
    .limit(1);
  if (!row) return null;
  const observations = await tx
    .select({
      id: symptomObservations.id,
      definitionId: symptomObservations.definitionId,
      label: symptomObservations.labelSnapshot,
      intensity: symptomObservations.intensity,
      durationMinutes: symptomObservations.durationMinutes,
    })
    .from(symptomObservations)
    .where(and(eq(symptomObservations.entryId, row.id), eq(symptomObservations.accountId, accountId)))
    .orderBy(asc(symptomObservations.createdAt), asc(symptomObservations.id));
  return {
    id: row.id,
    kind: row.kind,
    observedAt: row.observedAt,
    storedLocalDate: row.localDate,
    storedLocalTime: row.localTime,
    timezone: row.timezone,
    utcOffsetMinutes: row.utcOffsetMinutes,
    localDate: localDateString(row.observedAt, timeZone),
    localTime: localTimeString(row.observedAt, timeZone),
    fatigue: row.fatigue,
    sleepNote: decryptOptional(row.sleepNoteEncrypted),
    note: decryptOptional(row.noteEncrypted),
    observations,
    scaleVersion: row.scaleVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

/** S23: nur Inhaber. Unbekannte oder fremde IDs liefern null (Aufrufer: notFound + recordDenied). */
export async function getDiaryEntry(viewer: Viewer, id: string): Promise<DiaryDetail | null> {
  if (!isUuid(id)) return null;
  return withOwnerScope(viewer.accountId, (tx) => readDiaryEntry(tx, viewer.accountId, id, tzOf(viewer)));
}

/* ───────────────────────── Listen (S18, S21) ───────────────────────── */

export type EntrySummary = {
  key: string;
  kind: EntryKind;
  href: string;
  localDate: string;
  localTime: string | null;
  /** Kurze, neutrale Werte – keine Bewertung */
  values: string[];
  hasNote: boolean;
};

type CheckInListRow = {
  id: string;
  localDate: string;
  energy: number | null;
  mood: number | null;
  fatigue: number | null;
  hasNote: boolean;
};

type DiaryListRow = {
  id: string;
  kind: "symptom" | "fatigue";
  observedAt: Date;
  fatigue: number | null;
  hasNote: boolean;
};

const checkInListFields = {
  id: checkIns.id,
  localDate: checkIns.localDate,
  energy: checkIns.energy,
  mood: checkIns.mood,
  fatigue: checkIns.fatigue,
  hasNote: dsql<boolean>`${checkIns.noteEncrypted} is not null`,
};

const diaryListFields = {
  id: diaryEntries.id,
  kind: diaryEntries.kind,
  observedAt: diaryEntries.observedAt,
  fatigue: diaryEntries.fatigue,
  hasNote: dsql<boolean>`(${diaryEntries.noteEncrypted} is not null or ${diaryEntries.sleepNoteEncrypted} is not null)`,
};

async function observationsFor(tx: Tx, accountId: string, entryIds: string[]) {
  if (entryIds.length === 0) return new Map<string, ObservationDetail[]>();
  const rows = await tx
    .select({
      id: symptomObservations.id,
      entryId: symptomObservations.entryId,
      definitionId: symptomObservations.definitionId,
      label: symptomObservations.labelSnapshot,
      intensity: symptomObservations.intensity,
      durationMinutes: symptomObservations.durationMinutes,
    })
    .from(symptomObservations)
    .where(and(eq(symptomObservations.accountId, accountId), inArray(symptomObservations.entryId, entryIds)))
    .orderBy(asc(symptomObservations.createdAt), asc(symptomObservations.id));
  const map = new Map<string, ObservationDetail[]>();
  for (const { entryId, ...o } of rows) {
    const list = map.get(entryId) ?? [];
    list.push(o);
    map.set(entryId, list);
  }
  return map;
}

function summarize(
  cis: CheckInListRow[],
  diary: DiaryListRow[],
  obs: Map<string, ObservationDetail[]>,
  timeZone: string,
): EntrySummary[] {
  const items: (EntrySummary & { sort: string })[] = [];
  for (const c of cis) {
    const values: string[] = [];
    if (c.energy !== null) values.push(`Energie ${shortValue("energy", c.energy)}`);
    if (c.mood !== null) values.push(`Stimmung ${shortValue("mood", c.mood)}`);
    if (c.fatigue !== null) values.push(`Fatigue ${shortValue("fatigue", c.fatigue)}`);
    items.push({
      key: `c:${c.id}`,
      kind: "checkin",
      href: `/mein-ms/check-in/${c.localDate}`,
      localDate: c.localDate,
      localTime: null,
      values,
      hasNote: c.hasNote,
      // Check-ins stehen innerhalb eines Tages vor den Tagebucheinträgen (Tagesbezug)
      sort: `${c.localDate}T99:99`,
    });
  }
  for (const d of diary) {
    const localDate = localDateString(d.observedAt, timeZone);
    const localTime = localTimeString(d.observedAt, timeZone);
    const values: string[] = [];
    if (d.kind === "fatigue") values.push(`Fatigue ${shortValue("fatigue", d.fatigue)}`);
    for (const o of obs.get(d.id) ?? []) {
      const dur = durationText(o.durationMinutes);
      values.push(`${o.label} ${shortValue("intensity", o.intensity)}${dur ? `, ${dur}` : ""}`);
    }
    items.push({
      key: `d:${d.id}`,
      kind: d.kind,
      href: `/mein-ms/eintrag/${d.id}`,
      localDate,
      localTime,
      values,
      hasNote: d.hasNote,
      sort: `${localDate}T${localTime}`,
    });
  }
  items.sort((a, b) => (a.sort < b.sort ? 1 : a.sort > b.sort ? -1 : 0));
  return items.map((i) => ({
    key: i.key,
    kind: i.kind,
    href: i.href,
    localDate: i.localDate,
    localTime: i.localTime,
    values: i.values,
    hasNote: i.hasNote,
  }));
}

/** Letzte eigene Einträge (S18 HOM01, S21) – neueste zuerst. */
export async function listRecentEntries(viewer: Viewer, limit = 5): Promise<EntrySummary[]> {
  const tz = tzOf(viewer);
  return withOwnerScope(viewer.accountId, async (tx) => {
    const [cis, diary] = await Promise.all([
      tx
        .select(checkInListFields)
        .from(checkIns)
        .where(eq(checkIns.accountId, viewer.accountId))
        .orderBy(desc(checkIns.localDate))
        .limit(limit),
      tx
        .select(diaryListFields)
        .from(diaryEntries)
        .where(eq(diaryEntries.accountId, viewer.accountId))
        .orderBy(desc(diaryEntries.observedAt))
        .limit(limit),
    ]);
    const obs = await observationsFor(tx, viewer.accountId, diary.map((d) => d.id));
    return summarize(cis, diary, obs, tz).slice(0, limit);
  });
}

/** Einträge in einem lokalen Datumsbereich (S21 Umschalter 7/30 Tage). */
export async function listEntriesBetween(viewer: Viewer, from: string, to: string): Promise<EntrySummary[]> {
  const tz = tzOf(viewer);
  const { start, end } = utcBounds(from, to, tz);
  return withOwnerScope(viewer.accountId, async (tx) => {
    const cis = await tx
      .select(checkInListFields)
      .from(checkIns)
      .where(and(eq(checkIns.accountId, viewer.accountId), gte(checkIns.localDate, from), lte(checkIns.localDate, to)));
    const diary = await tx
      .select(diaryListFields)
      .from(diaryEntries)
      .where(
        and(eq(diaryEntries.accountId, viewer.accountId), gte(diaryEntries.observedAt, start), lt(diaryEntries.observedAt, end)),
      );
    const obs = await observationsFor(tx, viewer.accountId, diary.map((d) => d.id));
    return summarize(cis, diary, obs, tz);
  });
}

/** Gibt es überhaupt eigene Gesundheitsdaten? (Lesemodus nach Widerruf) */
export async function hasHealthData(viewer: Viewer): Promise<boolean> {
  return withOwnerScope(viewer.accountId, async (tx) => {
    const [c] = await tx.select({ id: checkIns.id }).from(checkIns).where(eq(checkIns.accountId, viewer.accountId)).limit(1);
    if (c) return true;
    const [d] = await tx
      .select({ id: diaryEntries.id })
      .from(diaryEntries)
      .where(eq(diaryEntries.accountId, viewer.accountId))
      .limit(1);
    return Boolean(d);
  });
}

/* ───────────────────────── Kalender (S21) ───────────────────────── */

export type CalendarDay = { checkIn: boolean; diary: number };

export async function getCalendarMonth(viewer: Viewer, month: string): Promise<Record<string, CalendarDay>> {
  const tz = tzOf(viewer);
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const { start, end } = utcBounds(from, to, tz);
  return withOwnerScope(viewer.accountId, async (tx) => {
    const [cis, diary] = await Promise.all([
      tx
        .select({ localDate: checkIns.localDate })
        .from(checkIns)
        .where(and(eq(checkIns.accountId, viewer.accountId), gte(checkIns.localDate, from), lte(checkIns.localDate, to))),
      tx
        .select({ observedAt: diaryEntries.observedAt })
        .from(diaryEntries)
        .where(
          and(eq(diaryEntries.accountId, viewer.accountId), gte(diaryEntries.observedAt, start), lt(diaryEntries.observedAt, end)),
        ),
    ]);
    const out: Record<string, CalendarDay> = {};
    for (const c of cis) out[c.localDate] = { checkIn: true, diary: out[c.localDate]?.diary ?? 0 };
    for (const d of diary) {
      const key = localDateString(d.observedAt, tz);
      out[key] = { checkIn: out[key]?.checkIn ?? false, diary: (out[key]?.diary ?? 0) + 1 };
    }
    return out;
  });
}

/* ───────────────────────── Verlauf (S25) ───────────────────────── */

export type HistoryData = {
  checkIns: { id: string; localDate: string; energy: number | null; mood: number | null; fatigue: number | null }[];
  diary: {
    id: string;
    kind: "symptom" | "fatigue";
    localDate: string;
    localTime: string;
    fatigue: number | null;
    observations: ObservationDetail[];
  }[];
};

/** Chronologische Einzelwerte ohne Glättung, Auffüllung oder Aggregation (DIA06, DIA07). */
export async function getHistory(viewer: Viewer, from: string, to: string): Promise<HistoryData> {
  const tz = tzOf(viewer);
  const { start, end } = utcBounds(from, to, tz);
  return withOwnerScope(viewer.accountId, async (tx) => {
    const cis = await tx
      .select({
        id: checkIns.id,
        localDate: checkIns.localDate,
        energy: checkIns.energy,
        mood: checkIns.mood,
        fatigue: checkIns.fatigue,
      })
      .from(checkIns)
      .where(and(eq(checkIns.accountId, viewer.accountId), gte(checkIns.localDate, from), lte(checkIns.localDate, to)))
      .orderBy(asc(checkIns.localDate));
    const diary = await tx
      .select({ id: diaryEntries.id, kind: diaryEntries.kind, observedAt: diaryEntries.observedAt, fatigue: diaryEntries.fatigue })
      .from(diaryEntries)
      .where(
        and(eq(diaryEntries.accountId, viewer.accountId), gte(diaryEntries.observedAt, start), lt(diaryEntries.observedAt, end)),
      )
      .orderBy(asc(diaryEntries.observedAt));
    const obs = await observationsFor(tx, viewer.accountId, diary.map((d) => d.id));
    return {
      checkIns: cis,
      diary: diary.map((d) => ({
        id: d.id,
        kind: d.kind,
        localDate: localDateString(d.observedAt, tz),
        localTime: localTimeString(d.observedAt, tz),
        fatigue: d.fatigue,
        observations: obs.get(d.id) ?? [],
      })),
    };
  });
}

/* ───────────────────────── Symptomkatalog (DIA03, DIA05) ───────────────────────── */

export type SymptomOption = { id: string; label: string };

/** Auswahlliste: aktiver gemeinsamer Katalog und eigene aktive Bezeichnungen. */
export async function listSymptomOptions(viewer: Viewer): Promise<{ catalog: SymptomOption[]; own: SymptomOption[] }> {
  return withOwnerScope(viewer.accountId, async (tx) => {
    const rows = await tx
      .select({ id: symptomDefinitions.id, label: symptomDefinitions.label, owner: symptomDefinitions.ownerAccountId })
      .from(symptomDefinitions)
      .where(
        and(
          eq(symptomDefinitions.active, true),
          or(isNull(symptomDefinitions.ownerAccountId), eq(symptomDefinitions.ownerAccountId, viewer.accountId)),
        ),
      )
      .orderBy(asc(symptomDefinitions.sort), asc(symptomDefinitions.label));
    return {
      catalog: rows.filter((r) => r.owner === null).map(({ id, label }) => ({ id, label })),
      own: rows.filter((r) => r.owner !== null).map(({ id, label }) => ({ id, label })),
    };
  });
}

/** Eigene Bezeichnungen mit Anzahl Verwendungen (Verwaltung, DIA05). */
export async function listOwnSymptoms(viewer: Viewer): Promise<{ id: string; label: string; uses: number }[]> {
  return withOwnerScope(viewer.accountId, async (tx) => {
    const defs = await tx
      .select({ id: symptomDefinitions.id, label: symptomDefinitions.label })
      .from(symptomDefinitions)
      .where(and(eq(symptomDefinitions.ownerAccountId, viewer.accountId), eq(symptomDefinitions.active, true)))
      .orderBy(asc(symptomDefinitions.label));
    if (defs.length === 0) return [];
    const counts = await tx
      .select({ definitionId: symptomObservations.definitionId, uses: dsql<number>`count(*)::int` })
      .from(symptomObservations)
      .where(
        and(
          eq(symptomObservations.accountId, viewer.accountId),
          inArray(
            symptomObservations.definitionId,
            defs.map((d) => d.id),
          ),
        ),
      )
      .groupBy(symptomObservations.definitionId);
    const byId = new Map(counts.map((c) => [c.definitionId, Number(c.uses)]));
    return defs.map((d) => ({ ...d, uses: byId.get(d.id) ?? 0 }));
  });
}
