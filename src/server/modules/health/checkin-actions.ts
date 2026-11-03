"use server";

import { and, eq, sql as dsql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/action-state";
import { ENERGY_SCALE, FATIGUE_SCALE, MOOD_SCALE, SCALE_VERSION } from "@/lib/catalog";
import { localDateString } from "@/lib/time";
import { runAction, str } from "../../action";
import { actionViewer } from "../../auth/viewer";
import { encryptOptional } from "../../crypto";
import { withOwnerScope } from "../../db/scoped";
import { checkIns } from "../../db/schema";
import { trackLater } from "../analytics/track";
import { readCheckIn } from "./queries";
import { checkInDateProblem, HEALTH_LIMITS, isDateString, offsetForLocalDate, parseScale } from "./validation";
import { CONFLICT_MESSAGE, healthWriter, opIdFrom, readNote } from "./write-guard";

/**
 * S20 Tages-Check-in (DIA01, DIA02, US03, US04, AT02):
 * – mindestens eine bewusst gewählte Angabe, 0 ist ein Wert, leer = «nicht erfasst»
 * – genau ein Check-in pro lokalem Datum (Unique-Index), zweite Neuanlage bietet Bearbeitung an
 * – Wiederholung mit derselben Vorgangskennung liefert das bestehende Ergebnis (kein Duplikat)
 * – Änderungen nur mit gelesener Version (DIA04)
 * – keine Werte in Logs, Audit oder URLs (ausser Datumsangaben)
 */

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
      if (inserted.length > 0) return { status: "created" as const, date };
      // Wiederholung desselben Vorgangs (Netzabbruch): bestehendes Ergebnis gilt (AT02).
      const [sameOp] = await tx
        .select({ localDate: checkIns.localDate })
        .from(checkIns)
        .where(and(eq(checkIns.accountId, viewer.accountId), eq(checkIns.clientOpId, clientOpId)))
        .limit(1);
      return sameOp ? { status: "created" as const, date: sameOp.localDate } : { status: "exists" as const, date };
    });
    if (result.status === "exists")
      return fail("Für diesen Tag hast du bereits einen Check-in festgehalten. Du kannst ihn ansehen und ändern.", {
        values: formVals,
        data: { existingDate: date },
      });
    // PRD 15: «Eigener Eintrag gespeichert» – ohne Werte, Datum oder Eintrags-ID, nur mit Einwilligung
    trackLater(viewer.accountId, { name: "useful_action_completed", params: { action: "entry_saved", success: true } });
    redirect(result.date === today ? "/heute?gespeichert=checkin" : `/mein-ms/check-in/${result.date}?gespeichert=1`);
  }, formVals, { flow: "F02" });
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
      return fail("Ein Check-in braucht mindestens eine Angabe. Wenn du ihn nicht mehr brauchst, kannst du ihn löschen.", {
        values: formVals,
      });

    const result = await withOwnerScope(viewer.accountId, async (tx) => {
      // DIA04: nur mit gelesener Version; 0 Zeilen → Konflikt, die neuere Fassung bleibt erhalten.
      // Datum, Zeitzone und Offset bleiben unverändert (DIA02: keine Verschiebung bei Zeitzonenwechsel).
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
        .where(and(eq(checkIns.accountId, viewer.accountId), eq(checkIns.localDate, date), eq(checkIns.version, readVersion)))
        .returning({ id: checkIns.id });
      if (updated.length > 0) return { status: "ok" as const };
      const current = await readCheckIn(tx, viewer.accountId, date);
      return current ? { status: "conflict" as const, current } : { status: "missing" as const };
    });
    if (result.status === "missing")
      return fail("Dieser Check-in existiert nicht mehr. Möglicherweise wurde er auf einem anderen Gerät gelöscht.");
    if (result.status === "conflict") {
      const c = result.current;
      return fail(`Dieser Check-in ${CONFLICT_MESSAGE}`, {
        values: formVals,
        data: {
          conflict: true,
          current: { version: c.version, energy: c.energy, mood: c.mood, fatigue: c.fatigue, note: c.note, updatedAt: c.updatedAt.toISOString() },
        },
      });
    }
    redirect(`/mein-ms/check-in/${date}?gespeichert=1`);
  }, formVals);
}

/** S26 analog für Check-ins (DIA05): sofort entfernt, kein Papierkorb. Auch nach Widerruf möglich. */
export async function deleteCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const date = str(formData, "date");
    const deleted = isDateString(date)
      ? await withOwnerScope(viewer.accountId, (tx) =>
          tx
            .delete(checkIns)
            .where(and(eq(checkIns.accountId, viewer.accountId), eq(checkIns.localDate, date)))
            .returning({ id: checkIns.id }),
        )
      : [];
    // Kein Erfolg ohne tatsächliche Löschung (HOM07); das Datum ist an das eigene Konto gebunden.
    if (deleted.length === 0) return fail("Dieser Check-in ist nicht verfügbar. Möglicherweise wurde er bereits gelöscht.");
    redirect("/mein-ms?geloescht=checkin");
  });
}
