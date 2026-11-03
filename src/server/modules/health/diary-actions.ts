"use server";

import { and, eq, sql as dsql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/action-state";
import { FATIGUE_SCALE, SCALE_VERSION } from "@/lib/catalog";
import { runAction, str } from "../../action";
import { recordDenied } from "../../audit";
import { actionViewer } from "../../auth/viewer";
import { encryptOptional } from "../../crypto";
import type { Tx } from "../../db";
import { withOwnerScope } from "../../db/scoped";
import { diaryEntries, symptomObservations } from "../../db/schema";
import { diaryFormValues, observationValues, parseSymptomRows, resolveDefinitions, type SymptomInput } from "./diary-input";
import { readDiaryEntry, type DiaryDetail } from "./queries";
import { HEALTH_LIMITS, isUuid, parseScale, resolveObservedAt, type ObservedAt } from "./validation";
import { CONFLICT_MESSAGE, healthWriter, opIdFrom, readNote } from "./write-guard";

/**
 * S22 / S24 / S23 / S26 Tagebuch (DIA03–DIA05, US05–US07, AT03):
 * mehrere Einträge pro Tag, Zeitpunkt + mindestens ein Symptom mit Stärke oder ein Fatigue-Wert,
 * Grenzen serverseitig geprüft, keine automatische Klassifikation. Zugriff nur über
 * withOwnerScope + account_id; fremde oder unbekannte IDs liefern keinen Inhalt.
 */

async function entryIdForOp(tx: Tx, accountId: string, clientOpId: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: diaryEntries.id })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.accountId, accountId), eq(diaryEntries.clientOpId, clientOpId)))
    .limit(1);
  return row?.id ?? null;
}

const INVALID = "Bitte prüfe die markierten Angaben.";

export async function createSymptomEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const formVals = diaryFormValues(formData);
  return runAction(async () => {
    const viewer = await healthWriter();
    const tz = viewer.prefs.timezone;
    const errors: Record<string, string> = {};
    const when = resolveObservedAt(str(formData, "date"), str(formData, "time"), tz);
    if (!when.ok) Object.assign(errors, when.fieldErrors);
    const rows = parseSymptomRows(formData, errors);
    const note = readNote(formData, "note", HEALTH_LIMITS.diaryNote, "Die Notiz", errors);
    if (Object.keys(errors).length > 0 || !when.ok) return fail(errors.symptoms ?? INVALID, { fieldErrors: errors, values: formVals });

    const clientOpId = opIdFrom(formData);
    const result = await withOwnerScope(viewer.accountId, async (tx) => {
      // Wiederholung desselben Vorgangs (Netzabbruch): der erste Datensatz gilt (AT02, HOM07).
      const sameOp = await entryIdForOp(tx, viewer.accountId, clientOpId);
      if (sameOp) return { ok: true as const, id: sameOp };
      const defs = await resolveDefinitions(tx, viewer.accountId, rows, new Map());
      if (!defs.ok) return { ok: false as const, errors: defs.errors };
      const [entry] = await tx
        .insert(diaryEntries)
        .values({
          accountId: viewer.accountId,
          kind: "symptom",
          observedAt: when.value.observedAt,
          localDate: when.value.localDate,
          localTime: when.value.localTime,
          timezone: tz,
          utcOffsetMinutes: when.value.utcOffsetMinutes,
          noteEncrypted: encryptOptional(note),
          scaleVersion: SCALE_VERSION,
          clientOpId,
        })
        .onConflictDoNothing()
        .returning({ id: diaryEntries.id });
      // Gleichzeitige Wiederholung: der parallel angelegte Datensatz gilt.
      if (!entry) return { ok: true as const, id: (await entryIdForOp(tx, viewer.accountId, clientOpId))! };
      await tx.insert(symptomObservations).values(observationValues(entry.id, viewer.accountId, defs.resolved));
      return { ok: true as const, id: entry.id };
    });
    if (!result.ok) return fail(INVALID, { fieldErrors: result.errors, values: formVals });
    redirect(`/mein-ms/eintrag/${result.id}?gespeichert=neu`);
  }, formVals);
}

export async function createFatigueEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const formVals = diaryFormValues(formData);
  return runAction(async () => {
    const viewer = await healthWriter();
    const tz = viewer.prefs.timezone;
    const errors: Record<string, string> = {};
    const when = resolveObservedAt(str(formData, "date"), str(formData, "time"), tz);
    if (!when.ok) Object.assign(errors, when.fieldErrors);
    const fatigue = parseScale(formData.get("fatigue"), FATIGUE_SCALE.min, FATIGUE_SCALE.max);
    if (!fatigue.ok) errors.fatigue = fatigue.error;
    else if (fatigue.value === null) errors.fatigue = "Bitte wähle einen Fatigue-Wert von 0 bis 10.";
    const sleepNote = readNote(formData, "sleepNote", HEALTH_LIMITS.sleepNote, "Die Schlafbeobachtung", errors);
    const note = readNote(formData, "note", HEALTH_LIMITS.diaryNote, "Die Notiz", errors);
    if (Object.keys(errors).length > 0 || !when.ok || !fatigue.ok || fatigue.value === null)
      return fail(INVALID, { fieldErrors: errors, values: formVals });

    const clientOpId = opIdFrom(formData);
    const id = await withOwnerScope(viewer.accountId, async (tx) => {
      const [entry] = await tx
        .insert(diaryEntries)
        .values({
          accountId: viewer.accountId,
          kind: "fatigue",
          observedAt: when.value.observedAt,
          localDate: when.value.localDate,
          localTime: when.value.localTime,
          timezone: tz,
          utcOffsetMinutes: when.value.utcOffsetMinutes,
          fatigue: fatigue.value,
          sleepNoteEncrypted: encryptOptional(sleepNote),
          noteEncrypted: encryptOptional(note),
          scaleVersion: SCALE_VERSION,
          clientOpId,
        })
        .onConflictDoNothing()
        .returning({ id: diaryEntries.id });
      return entry ? entry.id : (await entryIdForOp(tx, viewer.accountId, clientOpId))!;
    });
    redirect(`/mein-ms/eintrag/${id}?gespeichert=neu`);
  }, formVals);
}

/**
 * Zeitpunkt beim Ändern: Bleiben Datum und Uhrzeit (in der aktuellen Zeitzone) unverändert, gelten
 * die ursprünglich gespeicherten Angaben weiter – Zeitzone, Offset und lokale Zeit bleiben für den
 * Export erhalten, und ältere Einträge (über 365 Tage) bleiben korrigierbar (PRD 09 «Zeitlogik»).
 */
function observedAtForUpdate(
  existing: DiaryDetail,
  date: string,
  time: string,
  timeZone: string,
): { ok: true; value: ObservedAt & { timezone: string } } | { ok: false; fieldErrors: Record<string, string> } {
  if (date === existing.localDate && time === existing.localTime)
    return {
      ok: true,
      value: {
        observedAt: existing.observedAt,
        localDate: existing.storedLocalDate,
        localTime: existing.storedLocalTime,
        utcOffsetMinutes: existing.utcOffsetMinutes,
        timezone: existing.timezone,
      },
    };
  const when = resolveObservedAt(date, time, timeZone);
  return when.ok ? { ok: true, value: { ...when.value, timezone: timeZone } } : when;
}

export async function updateDiaryEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const formVals = diaryFormValues(formData);
  return runAction(async () => {
    const viewer = await healthWriter();
    const tz = viewer.prefs.timezone;
    const id = str(formData, "id");
    const readVersion = Number(str(formData, "version"));
    if (!isUuid(id) || !Number.isInteger(readVersion)) {
      await recordDenied("health_foreign_access", viewer.accountId, "diary_entry");
      return fail("Dieser Eintrag ist nicht verfügbar.");
    }

    const result = await withOwnerScope(viewer.accountId, async (tx) => {
      const existing = await readDiaryEntry(tx, viewer.accountId, id, tz);
      if (!existing) return { status: "missing" as const };

      const errors: Record<string, string> = {};
      const when = observedAtForUpdate(existing, str(formData, "date"), str(formData, "time"), tz);
      if (!when.ok) Object.assign(errors, when.fieldErrors);
      const note = readNote(formData, "note", HEALTH_LIMITS.diaryNote, "Die Notiz", errors);
      let fatigue: number | null = null;
      let sleepNote: string | null = null;
      let rows: SymptomInput[] = [];
      if (existing.kind === "fatigue") {
        const f = parseScale(formData.get("fatigue"), FATIGUE_SCALE.min, FATIGUE_SCALE.max);
        if (!f.ok) errors.fatigue = f.error;
        else if (f.value === null) errors.fatigue = "Bitte wähle einen Fatigue-Wert von 0 bis 10.";
        else fatigue = f.value;
        sleepNote = readNote(formData, "sleepNote", HEALTH_LIMITS.sleepNote, "Die Schlafbeobachtung", errors);
      } else {
        rows = parseSymptomRows(formData, errors);
      }
      if (Object.keys(errors).length > 0 || !when.ok) return { status: "invalid" as const, errors };

      // Historische Bezeichnungen bleiben erhalten (labelSnapshot, DIA05).
      const keepLabels = new Map<string, string>();
      for (const o of existing.observations) if (o.definitionId) keepLabels.set(o.definitionId, o.label);
      const defs = existing.kind === "symptom" ? await resolveDefinitions(tx, viewer.accountId, rows, keepLabels) : null;
      if (defs && !defs.ok) return { status: "invalid" as const, errors: defs.errors };

      const updated = await tx
        .update(diaryEntries)
        .set({
          observedAt: when.value.observedAt,
          localDate: when.value.localDate,
          localTime: when.value.localTime,
          timezone: when.value.timezone,
          utcOffsetMinutes: when.value.utcOffsetMinutes,
          fatigue: existing.kind === "fatigue" ? fatigue : null,
          sleepNoteEncrypted: existing.kind === "fatigue" ? encryptOptional(sleepNote) : null,
          noteEncrypted: encryptOptional(note),
          version: dsql`${diaryEntries.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(diaryEntries.id, id), eq(diaryEntries.accountId, viewer.accountId), eq(diaryEntries.version, readVersion)))
        .returning({ id: diaryEntries.id });
      if (updated.length === 0) return { status: "conflict" as const, current: existing };

      if (defs?.ok) {
        // Korrektur des bestehenden Eintrags, keine neue Verlaufsmessung (DIA04).
        await tx
          .delete(symptomObservations)
          .where(and(eq(symptomObservations.entryId, id), eq(symptomObservations.accountId, viewer.accountId)));
        await tx.insert(symptomObservations).values(observationValues(id, viewer.accountId, defs.resolved));
      }
      return { status: "ok" as const };
    });

    if (result.status === "missing") {
      await recordDenied("health_foreign_access", viewer.accountId, "diary_entry");
      return fail("Dieser Eintrag ist nicht verfügbar. Möglicherweise wurde er gelöscht.");
    }
    if (result.status === "invalid") return fail(INVALID, { fieldErrors: result.errors, values: formVals });
    if (result.status === "conflict") {
      const c = result.current;
      return fail(`Dieser Eintrag ${CONFLICT_MESSAGE}`, {
        values: formVals,
        data: {
          conflict: true,
          current: {
            version: c.version,
            localDate: c.localDate,
            localTime: c.localTime,
            fatigue: c.fatigue,
            sleepNote: c.sleepNote,
            note: c.note,
            observations: c.observations.map((o) => ({ label: o.label, intensity: o.intensity, durationMinutes: o.durationMinutes })),
            updatedAt: c.updatedAt.toISOString(),
          },
        },
      });
    }
    redirect(`/mein-ms/eintrag/${id}?gespeichert=1`);
  }, formVals);
}

/** S26 Löschen (DIA05): sofort entfernt, kein Papierkorb. Auch nach Widerruf und im Teilbetrieb möglich. */
export async function deleteDiaryEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const id = str(formData, "id");
    const deleted = isUuid(id)
      ? await withOwnerScope(viewer.accountId, (tx) =>
          tx
            .delete(diaryEntries)
            .where(and(eq(diaryEntries.id, id), eq(diaryEntries.accountId, viewer.accountId)))
            .returning({ id: diaryEntries.id }),
        )
      : [];
    if (deleted.length === 0) {
      await recordDenied("health_foreign_access", viewer.accountId, "diary_entry");
      return fail("Dieser Eintrag ist nicht verfügbar. Möglicherweise wurde er bereits gelöscht.");
    }
    redirect("/mein-ms?geloescht=eintrag");
  });
}
