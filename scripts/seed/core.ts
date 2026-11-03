import { hash } from "@node-rs/argon2";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import * as s from "../../src/server/db/schema";
import { HEALTH_CONSENT_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "../../src/lib/catalog";
import type { SeedContext, SeedDb } from "./types";

/**
 * Fiktive Demo-Konten für Test- und Pilotumgebungen (PRD 16: «fiktive Konten»).
 * Nie mit produktiven Personendaten verwenden.
 */
const PASSWORD = process.env.SEED_PASSWORD ?? "ruhiger-moment-2026-demo";
/** Feste TOTP-Geheimnisse für Demo-Mitarbeitende (nur Testumgebungen!) */
export const DEMO_TOTP_SECRET = process.env.SEED_TOTP_SECRET ?? "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

function encrypt(plain: string): string {
  const raw = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "ZGV2LW9ubHktZGF0YS1rZXktbm90LWZvci1wcm9kISE=", "base64");
  const key = raw.length === 32 ? raw : createHash("sha256").update(raw).digest();
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

async function upsertAccount(
  db: SeedDb,
  input: { email: string; pseudonym: string; roles?: (typeof s.staffRole.enumValues)[number][]; health?: boolean; interests?: string[]; canton?: string | null },
  passwordHash: string,
): Promise<string> {
  const [existing] = await db.select({ id: s.accounts.id }).from(s.accounts).where(sql`lower(${s.accounts.email}) = ${input.email}`);
  let id = existing?.id;
  const now = new Date();
  if (!id) {
    const [row] = await db
      .insert(s.accounts)
      .values({
        email: input.email,
        passwordHash,
        status: "active",
        emailVerifiedAt: now,
        audienceConfirmedAt: now,
        termsVersion: TERMS_VERSION,
        mfaEnabled: Boolean(input.roles?.length),
      })
      .returning({ id: s.accounts.id });
    id = row.id;
    await db.insert(s.userPreferences).values({ accountId: id });
    await db.insert(s.consentRecords).values([
      { accountId: id, purpose: "terms", textVersion: TERMS_VERSION, decision: "granted" },
      { accountId: id, purpose: "privacy_notice", textVersion: PRIVACY_VERSION, decision: "granted" },
      ...(input.health ? [{ accountId: id, purpose: "health_area" as const, textVersion: HEALTH_CONSENT_VERSION, decision: "granted" as const }] : []),
    ]);
    await db.insert(s.communityProfiles).values({
      accountId: id,
      pseudonym: input.pseudonym,
      pseudonymNormalized: input.pseudonym.toLowerCase(),
      interests: input.interests ?? [],
      canton: input.canton ?? null,
      onboardingCompletedAt: now,
      rulesAcceptedVersion: "regeln-2026-11-v1",
      rulesAcceptedAt: now,
    });
    for (const role of input.roles ?? []) {
      await db.insert(s.roleAssignments).values({ accountId: id, role });
    }
    if (input.roles?.length) {
      await db.insert(s.mfaFactors).values({ accountId: id, secretEncrypted: encrypt(DEMO_TOTP_SECRET), confirmedAt: now });
    }
  } else if (input.email.endsWith(DEMO_DOMAIN)) {
    await resetDemoCredentials(db, id, input.email, Boolean(input.roles?.length), passwordHash);
  }
  return id;
}

const DEMO_DOMAIN = "@demo.ms-plattform.ch";

/**
 * Bestehende Demo-Konten bei jedem Seed auf die aktuellen Zugangsdaten setzen: Passwort aus
 * SEED_PASSWORD, für Mitarbeitende genau ein bestätigter TOTP-Faktor aus SEED_TOTP_SECRET,
 * Fehlversuchszähler geleert. Sonst behalten Konten aus einem früheren Seed (z. B. vor dem Setzen
 * der Variablen) alte Werte und die Anmeldung scheitert am zweiten Faktor.
 * Betrifft ausschliesslich fiktive Konten der Demo-Domain; gelöschte Konten bleiben gelöscht.
 */
async function resetDemoCredentials(db: SeedDb, id: string, email: string, staff: boolean, passwordHash: string) {
  const changed = await db
    .update(s.accounts)
    .set({ passwordHash, ...(staff ? { mfaEnabled: true } : {}) })
    .where(sql`${s.accounts.id} = ${id} and ${s.accounts.status} <> 'deleted'`)
    .returning({ id: s.accounts.id });
  if (changed.length === 0) return;
  if (staff) {
    await db.delete(s.mfaFactors).where(eq(s.mfaFactors.accountId, id));
    await db.insert(s.mfaFactors).values({ accountId: id, secretEncrypted: encrypt(DEMO_TOTP_SECRET), confirmedAt: new Date() });
  }
  const emailKey = createHash("sha256").update(email.toLowerCase()).digest("hex");
  await db.execute(sql`delete from ops.rate_limit_counters where key in (${`login-fail:${emailKey}`}, ${`mfa-fail:${id}`})`);
}

export async function seedCore(db: SeedDb): Promise<SeedContext> {
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 });

  const staff = {
    admin: await upsertAccount(db, { email: "admin@demo.ms-plattform.ch", pseudonym: "Team Administration", roles: ["admin", "ops"] }, passwordHash),
    editor: await upsertAccount(db, { email: "redaktion@demo.ms-plattform.ch", pseudonym: "Team Redaktion", roles: ["editor"] }, passwordHash),
    reviewer: await upsertAccount(db, { email: "pruefung@demo.ms-plattform.ch", pseudonym: "Team Medizinische Prüfung", roles: ["medical_reviewer"] }, passwordHash),
    moderator: await upsertAccount(db, { email: "moderation@demo.ms-plattform.ch", pseudonym: "Team Moderation", roles: ["moderator"] }, passwordHash),
    lead: await upsertAccount(db, { email: "leitung@demo.ms-plattform.ch", pseudonym: "Team Moderationsleitung", roles: ["moderation_lead", "moderator"] }, passwordHash),
    privacy: await upsertAccount(db, { email: "datenschutz@demo.ms-plattform.ch", pseudonym: "Team Datenschutz", roles: ["privacy_officer"] }, passwordHash),
    // ACC05/PRI08: Vieraugenprinzip bei der MFA-Wiederherstellung von Mitarbeitendenkonten braucht
    // eine zweite, fiktive Person der Datenschutzstelle, damit der Ablauf demonstrierbar ist.
    privacy2: await upsertAccount(
      db,
      { email: "datenschutz.vertretung@demo.ms-plattform.ch", pseudonym: "Team Datenschutz Vertretung", roles: ["privacy_officer"] },
      passwordHash,
    ),
    ops: await upsertAccount(db, { email: "betrieb@demo.ms-plattform.ch", pseudonym: "Team Betrieb", roles: ["ops"] }, passwordHash),
  };

  const members = [];
  for (const m of [
    { email: "mitglied.a@demo.ms-plattform.ch", pseudonym: "Bergsee", health: true, interests: ["alltag", "natur"], canton: "BE" },
    { email: "mitglied.b@demo.ms-plattform.ch", pseudonym: "Lindenblatt", health: false, interests: ["beruf", "familie"], canton: null },
    { email: "mitglied.c@demo.ms-plattform.ch", pseudonym: "Abendrot", health: true, interests: ["kreativ", "lesen"], canton: "ZH" },
  ]) {
    members.push({ id: await upsertAccount(db, m, passwordHash), pseudonym: m.pseudonym });
  }

  for (const [key, description] of Object.entries({
    community_write: "Community-Beiträge und Antworten schreiben",
    chat: "Kontaktanfragen und Einzelgespräche",
    health_write: "Neue Check-ins und Tagebucheinträge",
    registration: "Neue Registrierungen",
  })) {
    await db.insert(s.featureFlags).values({ key, description, enabled: true }).onConflictDoNothing();
  }

  // Sicherstellen, dass Demo-Konten aktiv sind (z. B. nach manuellen Tests)
  for (const id of [...Object.values(staff), ...members.map((m) => m.id)]) {
    await db.update(s.accounts).set({ status: "active" }).where(eq(s.accounts.id, id));
  }

  return { db, staff, members };
}

export { PASSWORD as DEMO_PASSWORD };
