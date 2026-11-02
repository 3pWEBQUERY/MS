import { ENERGY_SCALE, FATIGUE_SCALE, INTENSITY_SCALE, MOOD_SCALE } from "@/lib/catalog";

/**
 * Neutrale Textdarstellung selbst dokumentierter Werte (DIA01, DIA07):
 * Wert mit Skala, leer = «nicht erfasst». Keine Bewertung, keine Einordnung.
 */
export const NOT_RECORDED = "nicht erfasst";

export type Measure = "energy" | "mood" | "fatigue" | "intensity";

const SCALES = {
  energy: { label: ENERGY_SCALE.label, max: ENERGY_SCALE.max },
  mood: { label: MOOD_SCALE.label, max: MOOD_SCALE.max },
  fatigue: { label: FATIGUE_SCALE.label, max: FATIGUE_SCALE.max },
  intensity: { label: INTENSITY_SCALE.label, max: INTENSITY_SCALE.max },
} as const;

export function measureLabel(m: Measure) {
  return SCALES[m].label;
}

/** «4 von 10», «3 von 5 · ausgeglichen» oder «nicht erfasst» */
export function valueText(m: Measure, value: number | null | undefined): string {
  if (value === null || value === undefined) return NOT_RECORDED;
  if (m === "mood") {
    const step = MOOD_SCALE.steps[value - MOOD_SCALE.min];
    const word = step?.split(" · ")[1];
    return `${value} von ${SCALES.mood.max}${word ? ` · ${word}` : ""}`;
  }
  return `${value} von ${SCALES[m].max}`;
}

/** Kurzform für Listen: «4/10» */
export function shortValue(m: Measure, value: number | null | undefined): string {
  if (value === null || value === undefined) return NOT_RECORDED;
  return `${value}/${SCALES[m].max}`;
}

export function durationText(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}

export const KIND_LABEL = {
  checkin: "Check-in",
  symptom: "Symptome",
  fatigue: "Fatigue-Eintrag",
} as const;

export type EntryKind = keyof typeof KIND_LABEL;
