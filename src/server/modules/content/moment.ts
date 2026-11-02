import "server-only";
import { desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { DEFAULT_MOMENT_CONFIG, type MomentConfig } from "@/lib/moment";
import { db } from "../../db";
import { momentRules } from "../../db/schema";

/**
 * Mein Moment (HOM02): versionierte redaktionelle Regelkonfiguration. Genau eine Version ist
 * aktiv; je Absicht höchstens drei Ziele, nur interne Pfade. Ohne gültige aktive Version gilt
 * DEFAULT_MOMENT_CONFIG.
 */
export const MOMENT_ICONS = ["notebook", "battery", "activity", "users", "chat", "book", "lifebuoy", "search", "message"] as const;

/** Nur interne, relative Pfade – kein offener Redirect, keine externen Ziele. */
export function isInternalPath(href: string): boolean {
  return /^\/(?!\/|\\)[A-Za-z0-9\-._~/?=&%]*$/.test(href) && !href.startsWith("/api/") && href.length <= 200;
}

const target = z.object({
  label: z.string().trim().min(1, "Bitte gib eine Bezeichnung ein.").max(60, "Höchstens 60 Zeichen."),
  description: z.string().trim().min(1, "Bitte gib eine kurze Beschreibung ein.").max(120, "Höchstens 120 Zeichen."),
  href: z.string().trim().refine(isInternalPath, "Nur interne Pfade wie «/wissen» sind erlaubt."),
  requires: z.literal("health").optional(),
  icon: z.enum(MOMENT_ICONS),
});

export const momentConfigSchema = z.object({
  record: z.array(target).max(3, "Höchstens drei Ziele je Absicht."),
  connect: z.array(target).max(3, "Höchstens drei Ziele je Absicht."),
  learn: z.array(target).max(3, "Höchstens drei Ziele je Absicht."),
});

export function parseMomentConfig(value: unknown): MomentConfig | null {
  const parsed = momentConfigSchema.safeParse(value);
  return parsed.success ? (parsed.data as MomentConfig) : null;
}

/** Aktive Konfiguration für «Heute» (S19). Nicht personenbezogen, daher gecacht. */
export async function getActiveMomentConfig(): Promise<MomentConfig> {
  "use cache";
  cacheTag("moment");
  try {
    const [row] = await db
      .select({ config: momentRules.config })
      .from(momentRules)
      .where(eq(momentRules.active, true))
      .orderBy(desc(momentRules.publishedAt))
      .limit(1);
    const config = row ? parseMomentConfig(row.config) : null;
    if (config) cacheLife("hours");
    else cacheLife("minutes");
    return config ?? DEFAULT_MOMENT_CONFIG;
  } catch {
    cacheLife("minutes");
    return DEFAULT_MOMENT_CONFIG;
  }
}
