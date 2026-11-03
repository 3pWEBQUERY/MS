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
} as const;

export type FlagKey = keyof typeof FLAGS;

export class FeatureDisabledError extends Error {
  constructor(public flag: FlagKey) {
    super(`Funktion vorübergehend eingeschränkt: ${FLAGS[flag]}`);
  }
}

/** Serverseitig geprüft; fehlende Einträge gelten als aktiv. */
export async function isEnabled(flag: FlagKey): Promise<boolean> {
  await connection();
  const [row] = await db.select({ enabled: featureFlags.enabled }).from(featureFlags).where(eq(featureFlags.key, flag));
  return row?.enabled ?? true;
}

export async function assertEnabled(flag: FlagKey): Promise<void> {
  if (!(await isEnabled(flag))) throw new FeatureDisabledError(flag);
}

export async function allFlags(): Promise<Record<FlagKey, boolean>> {
  await connection();
  const rows = await db.select().from(featureFlags);
  const out = Object.fromEntries(Object.keys(FLAGS).map((k) => [k, true])) as Record<FlagKey, boolean>;
  for (const r of rows) if (r.key in out) out[r.key as FlagKey] = r.enabled;
  return out;
}
