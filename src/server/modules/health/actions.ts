"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, or, sql as dsql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/action-state";
import { FATIGUE_SCALE, INTENSITY_SCALE, ENERGY_SCALE, MOOD_SCALE, SCALE_VERSION } from "@/lib/catalog";
import { localDateString } from "@/lib/time";
import { cleanText, runAction, str, UserError } from "../../action";
import { recordDenied } from "../../audit";
import { actionViewer, type Viewer } from "../../auth/viewer";
import { encryptOptional } from "../../crypto";
import type { Tx } from "../../db";
import { withOwnerScope } from "../../db/scoped";
import { checkIns, diaryEntries, symptomDefinitions, symptomObservations } from "../../db/schema";
import { assertEnabled } from "../../flags";
import { consume } from "../../rate-limit";
import { recordHealthDecision } from "./consent";
import { readCheckIn, readDiaryEntry } from "./queries";
import {
  checkInDateProblem,
  customLabelProblem,
  HEALTH_LIMITS,
  isDateString,
  isUuid,
  normalizeLabel,
  offsetForLocalDate,
  parseDuration,
  parseScale,
  resolveObservedAt,
} from "./validation";

/**
 * Schreibende Aktionen der Gesundheitsdokumentation (DIA01–DIA05, S08).
 * – Schreiben nur mit aktiver Einwilligung und eingeschaltetem «health_write» (HOM08)
 * – Zugriff nur über withOwnerScope + account_id-Filter (PRD 14)
 * – Idempotenz über clientOpId, optimistische Versionierung bei Änderungen (DIA04)
 * – keine Werte in Logs, Audit oder URLs (ausser Datumsangaben)
 */

const HEALTH_WRITES_PER_HOUR = 120;

function opIdFrom(formData: FormData): string {
  const v = str(formData, "clientOpId");
  // Ohne JavaScript fehlt die Kennung – dann erzeugt der Server eine (ENGINEERING «Idempotenz»).
  return isUuid(v) ? v.toLowerCase() : randomUUID();
}

/** Gemeinsame Prüfung für neue Einträge und Änderungen. */
async function healthWriter(): Promise<Viewer> {
  const viewer = await actionViewer();
  if (!viewer.healthActive)
    throw new UserError(
      "Neue Einträge und Änderungen sind nur mit aktiviertem Gesundheitsbereich möglich. Du kannst ihn unter «Privatsphäre» aktivieren.",
      undefined,
      { inactive: true },
    );
  await assertEnabled("health_write");
  if (!(await consume(`health:${viewer.accountId}`, HEALTH_WRITES_PER_HOUR, 3600)))
    throw new UserError("Du hast in kurzer Zeit sehr viele Änderungen gespeichert. Bitte warte einen Moment und versuche es dann erneut.");
  return viewer;
}

function readNote(formData: FormData, key: string, max: number, label: string, errors: Record<string, string>): string | null {
  const raw = formData.get(key);
  const text = typeof raw === "string" ? cleanText(raw) : "";
  if (text.length > max) errors[key] = `${label} darf höchstens ${max.toLocaleString("de-CH")} Zeichen lang sein.`;
  return text.length > 0 ? text : null;
}

/* ───────────────────────── S08 Gesundheitsbereich aktivieren (PRI01, US10) ───────────────────────── */

export async function decideHealthAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const decision = str(formData, "decision");
    if (decision !== "granted" && decision !== "denied") return fail("Bitte wähle eine der beiden Möglichkeiten.");
    // Bereits aktiv: kein doppelter Nachweis. Ein Widerruf erfolgt über S12 «Privatsphäre».
    if (viewer.healthActive) redirect("/mein-ms");
    await recordHealthDecision(viewer.accountId, decision);
    redirect(decision === "granted" ? "/mein-ms?aktiviert=1" : "/mein-ms?entscheidung=abgelehnt");
  });
}

/* ───────────────────────── S20 Check-in (DIA01, DIA02) ───────────────────────── */

type CheckInValues = { energy: number | null; mood: number | null; fatigue: number | null; note: string | null };

function parseCheckIn(formData: FormData): { values: CheckInValues; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const read = (key: "energy" | "mood" | "fatigue", min: number, max: number) => {
    const r = parseScale(formData.get(key), min, max);
    if (!r.ok) {
      errors[key] = r.error;
      return null;
    }
    return r.value;
  };
  const values = {
    energy: read("energy", ENERGY_SCALE.min, ENERGY_SCALE.max),
    mood: read("mood", MOOD_SCALE.min, MOOD_SCALE.max),
    fatigue: read("fatigue", FATIGUE_SCALE.min, FATIGUE_SCALE.max),
    note: readNote(formData, "note", HEALTH_LIMITS.checkInNote, "Die Notiz", errors),
  };
  return { values, errors };
}

function checkInFormValues(formData: FormData) {
  return {
    date: str(formData, "date"),
    energy: str(formData, "energy"),
    mood: str(formData, "mood"),
    fatigue: str(formData, "fatigue"),
    note: typeof formData.get("note") === "string" ? String(formData.get("note")) : "",
  };
}

const AT_LEAST_ONE =
  "Bitte wähle mindestens eine Angabe: Energie, Stimmung oder Fatigue. Wenn du heute nichts festhalten möchtest, kannst du den Check-in überspringen.";

export async function createCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const formVals = checkInFormValues(formData);
  return runAction(async () => {
    const viewer = await healthWriter();
    const tz = viewer.prefs.timezone;
    const today = localDateString(new Date(), tz);
    const { values, errors } = parseCheckIn(formData);
    const dateProblem = checkInDateProblem(formVals.date, today);
    if (dateProblem) errors.date = dateProblem;
    if (Object.keys(errors).length > 0)
      return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: errors, values: formVals });
    if (values.energy === null && values.mood === null && values.fatigue === null)
      return fail(AT_LEAST_ONE, { values: formVals });

    const clientOpId = opIdFrom(formData);
    const date = formVals.date;
    const result = await withOwnerScope(viewer.accountId, async (tx) => {
      // DIA02: genau ein Check-in pro lokalem Datum – Unique-Index (account, date) + onConflict.
      const inserted = await tx
        .insert(checkIns)
        .values({
          accountId: viewer.accountId,
          localDate: date,
          timezone: tz,
          utcOffsetMinutes: offsetForLocalDate(date, tz),
          energy: values.energy,
          mood: values.mood,
          fatigue: values.fatigue,
          noteEncrypted: encryptOptional(values.note),
          scaleVersion: SCALE_VERSION,
          clientOpId,
        })
        .onConflictDoNothing()
        .returning({ id: checkIns.id });
      if (inserted.length > 0) return "created" as const;
      // Wiederholung desselben Vorgangs (Netzabbruch): bestehendes Ergebnis gilt (AT02).
      const [sameOp] = await tx
        .select({ id: checkIns.id })
        .from(checkIns)
        .where(and(eq(checkIns.accountId, viewer.accountId), eq(checkIns.clientOpId, clientOpId)))
        .limit(1);
      return sameOp ? ("created" as const) : ("exists" as const);
    });
    if (result === "exists")
      return fail("Für diesen Tag hast du bereits einen Check-in festgehalten. Du kannst ihn ansehen und ändern.", {
        values: formVals,
        data: { existingDate: date },
      });
    redirect(date === today ? "/heute?gespeichert=checkin" : `/mein-ms/check-in/${date}?gespeichert=1`);
  }, formVals);
}

export async function updateCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const formVals = checkInFormValues(formData);
  return runAction(async () => {
    const viewer = await healthWriter();
    const date = formVals.date;
    const readVersion = Number(str(formData, "version"));
    if (!isDateString(date) || !Number.isInteger(readVersion)) return fail("Dieser Check-in ist nicht verfügbar.");
    const { values, errors } = parseCheckIn(formData);
    if (Object.keys(errors).length > 0)
      return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: errors, values: formVals });
    if (values.energy === null && values.mood === null && values.fatigue === null)
      return fail(
        "Ein Check-in braucht mindestens eine Angabe. Wenn du ihn nicht mehr brauchst, kannst du ihn löschen.",
        { values: formVals },
      );

    const result = await withOwnerScope(viewer.accountId, async (tx) => {
      // DIA04: nur mit gelesener Version; 0 Zeilen → Konflikt, die neuere Fassung bleibt erhalten.
      const updated = await tx
        .update(checkIns)
        .set({
          energy: values.energy,
          mood: values.mood,
          fatigue: values.fatigue,
          noteEncrypted: encryptOptional(values.note),
          version: dsql`${checkIns.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(checkIns.accountId, viewer.accountId), eq(checkIns.localDate, date), eq(checkIns.version, readVersion)),
        )
        .returning({ id: checkIns.id });
      if (updated.length > 0) return { status: "ok" as const };
      const current = await readCheckIn(tx, viewer.accountId, date);
      return current ? { status: "conflict" as const, current } : { status: "missing" as const };
    });
    if (result.status === "missing") return fail("Dieser Check-in existiert nicht mehr. Möglicherweise wurde er auf einem anderen Gerät gelöscht.");
    if (result.status === "conflict") {
      const c = result.current;
      return fail(
        "Dieser Check-in wurde inzwischen an anderer Stelle geändert. Die neuere Fassung siehst du unten. Deine Eingaben sind noch da – speichere erneut, wenn du sie übernehmen möchtest.",
        {
          values: formVals,
          data: {
            conflict: true,
            current: { version: c.version, energy: c.energy, mood: c.mood, fatigue: c.fatigue, note: c.note, updatedAt: c.updatedAt.toISOString() },
          },
        },
      );
    }
    redirect(`/mein-ms/check-in/${date}?gespeichert=1`);
  }, formVals);
}

/** S26 analog für Check-ins (DIA05): sofort entfernt, kein Papierkorb. */
export async function deleteCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const date = str(formData, "date");
    if (!isDateString(date)) return fail("Dieser Check-in ist nicht verfügbar.");
    await withOwnerScope(viewer.accountId, (tx) =>
      tx.delete(checkIns).where(and(eq(checkIns.accountId, viewer.accountId), eq(checkIns.localDate, date))),
    );
    redirect("/mein-ms?geloescht=checkin");
  });
}

/* ───────────────────────── S22 / S24 Tagebuch (DIA03) ───────────────────────── */

type SymptomInput = { key: string; definitionId: string | null; customLabel: string | null; intensity: number; duration: number | null };

/** Symptomzeilen lesen: Felder s_<key>_def, s_<key>_custom, s_<key>_intensity, s_<key>_duration */
function parseSymptomRows(formData: FormData, errors: Record<string, string>): SymptomInput[] {
  const keys = formData
    .getAll("row")
    .filter((k): k is string => typeof k === "string" && /^[a-z0-9]{1,12}$/.test(k))
    .slice(0, HEALTH_LIMITS.symptomsPerEntry);
  const rows: SymptomInput[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const def = str(formData, `s_${key}_def`);
    let definitionId: string | null = null;
    let customLabel: string | null = null;
    if (def === "custom") {
      const label = normalizeLabel(str(formData, `s_${key}_custom`));
      const problem = customLabelProblem(label);
      if (problem) errors[`s_${key}_custom`] = problem;
      customLabel = label;
    } else if (def.startsWith("def:") && isUuid(def.slice(4))) {
      definitionId = def.slice(4).toLowerCase();
    } else {
      errors[`s_${key}_def`] = "Bitte wähle ein Symptom aus der Liste oder gib eine eigene Bezeichnung ein.";
    }
    const ident = definitionId ?? (customLabel ? `custom:${customLabel.toLowerCase()}` : null);
    if (ident && seen.has(ident)) errors[`s_${key}_def`] = "Dieses Symptom ist in diesem Eintrag bereits ausgewählt.";
    if (ident) seen.add(ident);
    const intensity = parseScale(formData.get(`s_${key}_intensity`), INTENSITY_SCALE.min, INTENSITY_SCALE.max);
    if (!intensity.ok) errors[`s_${key}_intensity`] = intensity.error;
    else if (intensity.value === null) errors[`s_${key}_intensity`] = "Bitte wähle eine Stärke von 0 bis 10.";
    const duration = parseDuration(formData.get(`s_${key}_duration`));
    if (!duration.ok) errors[`s_${key}_duration`] = duration.error;
    rows.push({
      key,
      definitionId,
      customLabel,
      intensity: intensity.ok && intensity.value !== null ? intensity.value : 0,
      duration: duration.ok ? duration.value : null,
    });
  }
  if (rows.length === 0) errors.symptoms = "Bitte wähle mindestens ein Symptom mit Stärke.";
  return rows;
}

function diaryFormValues(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION") || k === "clientOpId") continue;
    if (k === "row") out.row = [...((out.row as string[]) ?? []), v];
    else out[k] = v;
  }
  return out;
}

/**
 * Definitionen auflösen: Katalog (aktiv) oder eigene. Eigene Bezeichnungen werden als private
 * SymptomDefinition gespeichert bzw. wiederverwendet. Liefert die Bezeichnung zum Erfassungszeitpunkt.
 */
async function resolveDefinitions(
  tx: Tx,
  accountId: string,
  rows: SymptomInput[],
  keepLabels: Map<string, string>,
): Promise<{ ok: true; resolved: { definitionId: string; label: string; intensity: number; duration: number | null }[] } | { ok: false; errors: Record<string, string> }> {
  const ids = rows.flatMap((r) => (r.definitionId ? [r.definitionId] : []));
  const found = ids.length
    ? await tx
        .select({ id: symptomDefinitions.id, label: symptomDefinitions.label, active: symptomDefinitions.active, owner: symptomDefinitions.ownerAccountId })
        .from(symptomDefinitions)
        .where(
          and(
            inArray(symptomDefinitions.id, ids),
            or(isNull(symptomDefinitions.ownerAccountId), eq(symptomDefinitions.ownerAccountId, accountId)),
          ),
        )
    : [];
  const byId = new Map(found.map((f) => [f.id, f]));
  const errors: Record<string, string> = {};
  for (const r of rows) {
    if (!r.definitionId) continue;
    const def = byId.get(r.definitionId);
    // Entfernte Bezeichnungen bleiben nur in Einträgen gültig, die sie bereits verwenden (DIA05).
    if (!def || (!def.active && !keepLabels.has(r.definitionId)))
      errors[`s_${r.key}_def`] = "Diese Auswahl ist nicht mehr verfügbar. Bitte wähle ein anderes Symptom.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const resolved: { definitionId: string; label: string; intensity: number; duration: number | null }[] = [];
  for (const r of rows) {
    if (r.definitionId) {
      const def = byId.get(r.definitionId)!;
      resolved.push({ definitionId: def.id, label: keepLabels.get(def.id) ?? def.label, intensity: r.intensity, duration: r.duration });
      continue;
    }
    const label = r.customLabel!;
    const [existing] = await tx
      .select({ id: symptomDefinitions.id, active: symptomDefinitions.active, label: symptomDefinitions.label })
      .from(symptomDefinitions)
      .where(and(eq(symptomDefinitions.ownerAccountId, accountId), dsql`lower(${symptomDefinitions.label}) = ${label.toLowerCase()}`))
      .limit(1);
    let id = existing?.id;
    if (existing && !existing.active) {
      // Erneut eingegebene, früher entfernte Bezeichnung wird wieder in die Auswahl aufgenommen.
      await tx
        .update(symptomDefinitions)
        .set({ active: true })
        .where(and(eq(symptomDefinitions.id, existing.id), eq(symptomDefinitions.ownerAccountId, accountId)));
    }
    if (!id) {
      const [created] = await tx
        .insert(symptomDefinitions)
        .values({ label, ownerAccountId: accountId, code: null, catalogVersion: null, active: true, sort: 1000 })
        .returning({ id: symptomDefinitions.id });
      id = created.id;
    }
    resolved.push({ definitionId: id, label: existing?.label ?? label, intensity: r.intensity, duration: r.duration });
  }
  return { ok: true, resolved };
}

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
    if (Object.keys(errors).length > 0 || !when.ok)
      return fail(errors.symptoms ?? "Bitte prüfe die markierten Angaben.", { fieldErrors: errors, values: formVals });

    const clientOpId = opIdFrom(formData);
    const result = await withOwnerScope(viewer.accountId, async (tx) => {
      const [sameOp] = await tx
        .select({ id: diaryEntries.id })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.accountId, viewer.accountId), eq(diaryEntries.clientOpId, clientOpId)))
        .limit(1);
      if (sameOp) return { ok: true as const, id: sameOp.id };
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
      if (!entry) {
        // Gleichzeitige Wiederholung desselben Vorgangs: der erste Datensatz gilt.
        const [again] = await tx
          .select({ id: diaryEntries.id })
          .from(diaryEntries)
          .where(and(eq(diaryEntries.accountId, viewer.accountId), eq(diaryEntries.clientOpId, clientOpId)))
          .limit(1);
        return { ok: true as const, id: again.id };
      }
      await tx.insert(symptomObservations).values(
        defs.resolved.map((d) => ({
          entryId: entry.id,
          accountId: viewer.accountId,
          definitionId: d.definitionId,
          labelSnapshot: d.label,
          intensity: d.intensity,
          durationMinutes: d.duration,
        })),
      );
      return { ok: true as const, id: entry.id };
    });
    if (!result.ok) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: result.errors, values: formVals });
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
      return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: errors, values: formVals });

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
      if (entry) return entry.id;
      const [again] = await tx
        .select({ id: diaryEntries.id })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.accountId, viewer.accountId), eq(diaryEntries.clientOpId, clientOpId)))
        .limit(1);
      return again.id;
    });
    redirect(`/mein-ms/eintrag/${id}?gespeichert=neu`);
  }, formVals);
}

/* ───────────────────────── S23 Ändern (DIA04) ───────────────────────── */

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
      const when = resolveObservedAt(str(formData, "date"), str(formData, "time"), tz);
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
          timezone: tz,
          utcOffsetMinutes: when.value.utcOffsetMinutes,
          fatigue: existing.kind === "fatigue" ? fatigue : null,
          sleepNoteEncrypted: existing.kind === "fatigue" ? encryptOptional(sleepNote) : null,
          noteEncrypted: encryptOptional(note),
          version: dsql`${diaryEntries.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(diaryEntries.id, id), eq(diaryEntries.accountId, viewer.accountId), eq(diaryEntries.version, readVersion)),
        )
        .returning({ id: diaryEntries.id });
      if (updated.length === 0) return { status: "conflict" as const, current: existing };

      if (defs?.ok) {
        // Korrektur des bestehenden Eintrags, keine neue Verlaufsmessung (DIA04).
        await tx
          .delete(symptomObservations)
          .where(and(eq(symptomObservations.entryId, id), eq(symptomObservations.accountId, viewer.accountId)));
        await tx.insert(symptomObservations).values(
          defs.resolved.map((d) => ({
            entryId: id,
            accountId: viewer.accountId,
            definitionId: d.definitionId,
            labelSnapshot: d.label,
            intensity: d.intensity,
            durationMinutes: d.duration,
          })),
        );
      }
      return { status: "ok" as const };
    });

    if (result.status === "missing") {
      await recordDenied("health_foreign_access", viewer.accountId, "diary_entry");
      return fail("Dieser Eintrag ist nicht verfügbar. Möglicherweise wurde er gelöscht.");
    }
    if (result.status === "invalid")
      return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: result.errors, values: formVals });
    if (result.status === "conflict") {
      const c = result.current;
      return fail(
        "Dieser Eintrag wurde inzwischen an anderer Stelle geändert. Die neuere Fassung siehst du unten. Deine Eingaben sind noch da – speichere erneut, wenn du sie übernehmen möchtest.",
        {
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
        },
      );
    }
    redirect(`/mein-ms/eintrag/${id}?gespeichert=1`);
  }, formVals);
}

/* ───────────────────────── S26 Löschen (DIA05) ───────────────────────── */

export async function deleteDiaryEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    // Löschen bleibt auch nach Widerruf möglich (Datenhoheit, PRD 05 «Besondere Formularzustände»).
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

/* ───────────────────────── Eigene Symptombezeichnungen (DIA05) ───────────────────────── */

export async function removeOwnSymptomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const id = str(formData, "id");
    const changed = isUuid(id)
      ? await withOwnerScope(viewer.accountId, (tx) =>
          // Nur aus der Auswahl entfernen: frühere Einträge behalten ihre Bezeichnung (labelSnapshot).
          tx
            .update(symptomDefinitions)
            .set({ active: false })
            .where(and(eq(symptomDefinitions.id, id), eq(symptomDefinitions.ownerAccountId, viewer.accountId)))
            .returning({ id: symptomDefinitions.id }),
        )
      : [];
    if (changed.length === 0) return fail("Diese Bezeichnung ist nicht verfügbar.");
    redirect("/mein-ms/symptome?entfernt=1");
  });
}
