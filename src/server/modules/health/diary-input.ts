import "server-only";
import { and, eq, inArray, isNull, or, sql as dsql } from "drizzle-orm";
import { INTENSITY_SCALE } from "@/lib/catalog";
import { str } from "../../action";
import type { Tx } from "../../db";
import { symptomDefinitions } from "../../db/schema";
import { customLabelProblem, HEALTH_LIMITS, isUuid, normalizeLabel, parseDuration, parseScale } from "./validation";

/**
 * Eingaben eines Tagebucheintrags lesen und Symptomdefinitionen auflösen (DIA03, DIA05).
 * Wird von diary-actions.ts verwendet; enthält keine Server Actions.
 */

export type SymptomInput = { key: string; definitionId: string | null; customLabel: string | null; intensity: number; duration: number | null };

export type ResolvedSymptom = { definitionId: string; label: string; intensity: number; duration: number | null };

/** Symptomzeilen lesen: Felder s_<key>_def, s_<key>_custom, s_<key>_intensity, s_<key>_duration */
export function parseSymptomRows(formData: FormData, errors: Record<string, string>): SymptomInput[] {
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

/** Eingaben für die Rückgabe bei Fehlern (HOM07) – ohne interne Felder. */
export function diaryFormValues(formData: FormData): Record<string, string | string[]> {
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
 * `keepLabels`: Definitionen, die der bearbeitete Eintrag bereits verwendet (bleiben gültig, DIA05).
 */
export async function resolveDefinitions(
  tx: Tx,
  accountId: string,
  rows: SymptomInput[],
  keepLabels: Map<string, string>,
): Promise<{ ok: true; resolved: ResolvedSymptom[] } | { ok: false; errors: Record<string, string> }> {
  const ids = rows.flatMap((r) => (r.definitionId ? [r.definitionId] : []));
  const found = ids.length
    ? await tx
        .select({ id: symptomDefinitions.id, label: symptomDefinitions.label, active: symptomDefinitions.active })
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

  const resolved: ResolvedSymptom[] = [];
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

/** Zeilen für symptom_observations (labelSnapshot bleibt historisch verständlich, DIA05). */
export function observationValues(entryId: string, accountId: string, resolved: ResolvedSymptom[]) {
  return resolved.map((d) => ({
    entryId,
    accountId,
    definitionId: d.definitionId,
    labelSnapshot: d.label,
    intensity: d.intensity,
    durationMinutes: d.duration,
  }));
}
