import "server-only";
import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "./db";
import { featureFlags } from "./db/schema";

/** Einzeln abschaltbare Funktionsbereiche (HOM08). */
export const FLAGS = {
  community_write: "Community-Beiträge und Antworten schreiben",
  chat: "Kontaktanfragen und Einzelgespräche",
  health_write: "Neue Check-ins und Tagebucheinträge",
  registration: "Neue Registrierungen",
  registration_invite_only: "Registrierung nur mit Einladungscode (begrenzte Einladung, PRD 17)",
} as const;

export type FlagKey = keyof typeof FLAGS;

/**
 * Einschränkende Schalter: «eingeschaltet» bedeutet hier eine zusätzliche Bedingung, nicht einen
 * verfügbaren Bereich. Sie gelten ohne Eintrag als aus und zählen nicht als Teilbetrieb (HOM08).
 */
export const RESTRICTION_FLAGS: readonly FlagKey[] = ["registration_invite_only"];

/** Zustand ohne gespeicherten Eintrag: Funktionsbereiche aktiv, Einschränkungen aus. */
export function flagDefault(flag: FlagKey): boolean {
  return !RESTRICTION_FLAGS.includes(flag);
}

export class FeatureDisabledError extends Error {
  constructor(public flag: FlagKey) {
    super(`Funktion vorübergehend eingeschränkt: ${FLAGS[flag]}`);
  }
}

/** Serverseitig geprüft; fehlende Einträge gelten als Standard (siehe flagDefault). */
export async function isEnabled(flag: FlagKey): Promise<boolean> {
  await connection();
  const [row] = await db.select({ enabled: featureFlags.enabled }).from(featureFlags).where(eq(featureFlags.key, flag));
  return row?.enabled ?? flagDefault(flag);
}

export async function assertEnabled(flag: FlagKey): Promise<void> {
  if (!(await isEnabled(flag))) throw new FeatureDisabledError(flag);
}

export async function allFlags(): Promise<Record<FlagKey, boolean>> {
  await connection();
  const rows = await db.select().from(featureFlags);
  const out = Object.fromEntries((Object.keys(FLAGS) as FlagKey[]).map((k) => [k, flagDefault(k)])) as Record<FlagKey, boolean>;
  for (const r of rows) if (r.key in out) out[r.key as FlagKey] = r.enabled;
  return out;
}
