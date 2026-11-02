import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import * as s from "../../src/server/db/schema";
import { SCALE_VERSION, SYMPTOM_CATALOG, SYMPTOM_CATALOG_VERSION } from "../../src/lib/catalog";
import { addDays, localDateString, localTimeString, utcOffsetMinutes, zonedToUtc } from "../../src/lib/time";
import type { SeedContext } from "./types";

/**
 * Seed für «Mein MS» (CON08, PRD 06 «fiktive Datensätze»): Symptomkatalog idempotent und
 * ca. drei Wochen lückenhafte, frei erfundene Beispieldaten für das Demo-Mitglied «Bergsee».
 * Die Werte sind fiktiv und bewusst unregelmässig (nicht jeden Tag).
 */
const TZ = "Europe/Zurich";

function encrypt(plain: string): string {
  const raw = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "ZGV2LW9ubHktZGF0YS1rZXktbm90LWZvci1wcm9kISE=", "base64");
  const key = raw.length === 32 ? raw : createHash("sha256").update(raw).digest();
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

/** Tage zurück ab heute → Check-in (null = nicht erfasst). Fehlende Tage sind beabsichtigt. */
const CHECK_INS: { back: number; energy: number | null; mood: number | null; fatigue: number | null; note?: string }[] = [
  { back: 20, energy: 6, mood: 4, fatigue: 3 },
  { back: 19, energy: 5, mood: 3, fatigue: 4 },
  { back: 18, energy: 5, mood: null, fatigue: 5 },
  { back: 15, energy: 3, mood: 3, fatigue: 7, note: "Langer Arbeitstag, am Abend früh hingelegt." },
  { back: 14, energy: 4, mood: 3, fatigue: 6 },
  { back: 12, energy: 6, mood: 4, fatigue: null },
  { back: 11, energy: 7, mood: 4, fatigue: 3 },
  { back: 10, energy: 6, mood: 5, fatigue: 2, note: "Spaziergang am See." },
  { back: 7, energy: 0, mood: null, fatigue: null },
  { back: 6, energy: 2, mood: 2, fatigue: 8 },
  { back: 5, energy: 4, mood: 3, fatigue: 6 },
  { back: 3, energy: 5, mood: 4, fatigue: 5 },
  { back: 2, energy: null, mood: 4, fatigue: 4 },
  { back: 1, energy: 6, mood: 4, fatigue: 3 },
];

type SeedObs = { code?: string; custom?: string; intensity: number; duration?: number };
const DIARY: { back: number; time: string; kind: "symptom" | "fatigue"; fatigue?: number; sleep?: string; note?: string; obs?: SeedObs[] }[] = [
  { back: 19, time: "08:10", kind: "symptom", obs: [{ code: "kribbeln", intensity: 4, duration: 45 }] },
  { back: 15, time: "17:30", kind: "fatigue", fatigue: 7, sleep: "Zweimal aufgewacht." },
  { back: 14, time: "13:05", kind: "symptom", obs: [{ code: "konzentration", intensity: 5 }, { code: "waerme", intensity: 3, duration: 90 }], note: "Warmes Büro, Fenster geöffnet." },
  { back: 11, time: "21:15", kind: "symptom", obs: [{ custom: "Müde Augen am Bildschirm", intensity: 3, duration: 30 }] },
  { back: 7, time: "10:00", kind: "fatigue", fatigue: 8, note: "Vormittag ruhig verbracht." },
  { back: 6, time: "07:45", kind: "symptom", obs: [{ code: "schwaeche", intensity: 5, duration: 120 }, { code: "gleichgewicht", intensity: 2 }] },
  { back: 6, time: "19:20", kind: "symptom", obs: [{ code: "kribbeln", intensity: 3 }] },
  { back: 4, time: "15:40", kind: "fatigue", fatigue: 5, sleep: "Gut durchgeschlafen." },
  { back: 3, time: "11:30", kind: "symptom", obs: [{ custom: "Müde Augen am Bildschirm", intensity: 2 }] },
  { back: 1, time: "09:00", kind: "symptom", obs: [{ code: "muskelsteifheit", intensity: 3, duration: 20 }] },
];

export async function seedHealth(ctx: SeedContext): Promise<void> {
  const { db } = ctx;

  // Gemeinsamer Katalog ohne Personenbezug (SymptomDefinition, owner null) – idempotent über code.
  for (const [i, [code, label]] of SYMPTOM_CATALOG.entries()) {
    await db
      .insert(s.symptomDefinitions)
      .values({ code, label, ownerAccountId: null, catalogVersion: SYMPTOM_CATALOG_VERSION, active: true, sort: (i + 1) * 10 })
      .onConflictDoUpdate({
        target: s.symptomDefinitions.code,
        set: { label, catalogVersion: SYMPTOM_CATALOG_VERSION, active: true, sort: (i + 1) * 10 },
      });
  }

  const member = ctx.members[0];
  if (!member) return;
  const accountId = member.id;

  // Beispieldaten nur einmal anlegen (idempotent).
  const [existing] = await db.select({ id: s.checkIns.id }).from(s.checkIns).where(eq(s.checkIns.accountId, accountId)).limit(1);
  if (existing) return;

  const today = localDateString(new Date(), TZ);

  for (const c of CHECK_INS) {
    const date = addDays(today, -c.back);
    await db
      .insert(s.checkIns)
      .values({
        accountId,
        localDate: date,
        timezone: TZ,
        utcOffsetMinutes: utcOffsetMinutes(zonedToUtc(date, "12:00", TZ), TZ),
        energy: c.energy,
        mood: c.mood,
        fatigue: c.fatigue,
        noteEncrypted: c.note ? encrypt(c.note) : null,
        scaleVersion: SCALE_VERSION,
        clientOpId: randomUUID(),
      })
      .onConflictDoNothing();
  }

  const catalog = await db
    .select({ id: s.symptomDefinitions.id, code: s.symptomDefinitions.code, label: s.symptomDefinitions.label })
    .from(s.symptomDefinitions)
    .where(isNull(s.symptomDefinitions.ownerAccountId));
  const byCode = new Map(catalog.map((c) => [c.code, c]));
  const customIds = new Map<string, string>();
  const customId = async (label: string) => {
    const known = customIds.get(label);
    if (known) return known;
    const [found] = await db
      .select({ id: s.symptomDefinitions.id })
      .from(s.symptomDefinitions)
      .where(and(eq(s.symptomDefinitions.ownerAccountId, accountId), sql`lower(${s.symptomDefinitions.label}) = ${label.toLowerCase()}`))
      .limit(1);
    const id =
      found?.id ??
      (
        await db
          .insert(s.symptomDefinitions)
          .values({ label, ownerAccountId: accountId, active: true, sort: 1000 })
          .returning({ id: s.symptomDefinitions.id })
      )[0].id;
    customIds.set(label, id);
    return id;
  };

  for (const d of DIARY) {
    const date = addDays(today, -d.back);
    const observedAt = zonedToUtc(date, d.time, TZ);
    const [entry] = await db
      .insert(s.diaryEntries)
      .values({
        accountId,
        kind: d.kind,
        observedAt,
        localDate: localDateString(observedAt, TZ),
        localTime: localTimeString(observedAt, TZ),
        timezone: TZ,
        utcOffsetMinutes: utcOffsetMinutes(observedAt, TZ),
        fatigue: d.kind === "fatigue" ? (d.fatigue ?? null) : null,
        sleepNoteEncrypted: d.sleep ? encrypt(d.sleep) : null,
        noteEncrypted: d.note ? encrypt(d.note) : null,
        scaleVersion: SCALE_VERSION,
        clientOpId: randomUUID(),
      })
      .returning({ id: s.diaryEntries.id });
    for (const o of d.obs ?? []) {
      const def = o.code ? byCode.get(o.code) : null;
      const definitionId = def ? def.id : await customId(o.custom!);
      await db.insert(s.symptomObservations).values({
        entryId: entry.id,
        accountId,
        definitionId,
        labelSnapshot: def ? def.label : o.custom!,
        intensity: o.intensity,
        durationMinutes: o.duration ?? null,
      });
    }
  }
}
