/**
 * Datenbankzugriff der Ende-zu-Ende-Tests (nur Testdatenbank «ms_e2e», NFR18). Legt fiktive
 * Konten an, liest Bestätigungslinks aus der Outbox und schaltet Feature-Schalter.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";

export const E2E_DB_URL = process.env.E2E_DATABASE_URL ?? "postgres://postgres@localhost:5432/ms_e2e";
export const E2E_DATA_KEY = process.env.E2E_DATA_ENCRYPTION_KEY ?? "ZGV2LW9ubHktZGF0YS1rZXktbm90LWZvci1wcm9kISE=";
export const PASSWORD = "e2e-ruhiger-test-2026-passwort";
/** Passwort der Demo-Konten aus dem Seed (scripts/seed/core.ts) – nur lokale/CI-Testdaten. */
export const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "ruhiger-moment-2026-demo";
export const TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

export const sql = postgres(E2E_DB_URL, { max: 3, onnotice: () => {} });

const key = () => {
  const raw = Buffer.from(E2E_DATA_KEY, "base64");
  return raw.length === 32 ? raw : createHash("sha256").update(raw).digest();
};

/** Gleiches Format wie src/server/crypto.ts (v1.<iv>.<tag>.<ct>). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [, iv, tag, ct] = payload.split(".");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv!, "base64url"));
  d.setAuthTag(Buffer.from(tag!, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct!, "base64url")), d.final()]).toString("utf8");
}

/** TOTP (RFC 6238) für das Demo-Geheimnis der Mitarbeitenden. */
export function totp(secret = TOTP_SECRET, offsetSteps = 0): string {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of secret) {
    value = (value << 5) | A.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const mac = createHmac("sha1", Buffer.from(out)).update(buf).digest();
  const o = mac[mac.length - 1]! & 15;
  return String((mac.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

let passwordHash: Promise<string> | null = null;
const hashed = () => (passwordHash ??= hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 }));

export type Member = { id: string; email: string; pseudonym: string };
type StaffRole = "moderator" | "moderation_lead" | "editor" | "medical_reviewer" | "admin" | "ops" | "privacy_officer";

/** Fiktives, verifiziertes Mitglied mit abgeschlossenem Einstieg (eindeutig pro Testlauf). */
export async function createMember(opts: { health?: boolean; roles?: StaffRole[]; analytics?: boolean } = {}): Promise<Member> {
  const tag = randomUUID().replace(/-/g, "").slice(0, 10);
  const email = `e2e.${tag}@example.test`;
  const pseudonym = `Wiese${tag.slice(0, 6)}`;
  const [{ id }] = await sql<{ id: string }[]>`
    insert into identity.accounts (email, password_hash, status, email_verified_at, audience_confirmed_at, terms_version, mfa_enabled)
    values (${email}, ${await hashed()}, 'active', now(), now(), 'bedingungen-2026-11-v1', ${Boolean(opts.roles?.length)})
    returning id`;
  await sql`insert into identity.user_preferences (account_id) values (${id})`;
  await sql`insert into identity.consent_records (account_id, purpose, text_version, decision) values
    (${id}, 'terms', 'bedingungen-2026-11-v1', 'granted'), (${id}, 'privacy_notice', 'datenschutz-2026-11-v1', 'granted')`;
  if (opts.health)
    await sql`insert into identity.consent_records (account_id, purpose, text_version, decision) values (${id}, 'health_area', 'gesundheit-2026-11-v1', 'granted')`;
  await sql`insert into identity.community_profiles (account_id, pseudonym, pseudonym_normalized, onboarding_completed_at, rules_accepted_version, rules_accepted_at)
    values (${id}, ${pseudonym}, ${pseudonym.toLowerCase()}, now(), 'regeln-2026-11-v1', now())`;
  for (const role of opts.roles ?? []) await sql`insert into identity.role_assignments (account_id, role) values (${id}, ${role})`;
  if (opts.roles?.length)
    await sql`insert into identity.mfa_factors (account_id, secret_encrypted, confirmed_at) values (${id}, ${encrypt(TOTP_SECRET)}, now())`;
  return { id, email, pseudonym };
}

/** Link einer Konto-E-Mail aus der Outbox (Payload verschlüsselt, wie der Worker ihn liest). */
export async function verificationLink(email: string, type = "email.verification"): Promise<string> {
  const rows = await sql<{ payload: { link: string; to: string } }[]>`
    select payload from ops.outbox_events where type = ${type} order by created_at desc limit 50`;
  for (const r of rows) if (decrypt(r.payload.to) === email) return decrypt(r.payload.link);
  throw new Error(`Kein Link vom Typ ${type} in der Outbox gefunden`);
}

export async function setFlag(key: string, enabled: boolean) {
  await sql`update ops.feature_flags set enabled = ${enabled}, reason = ${enabled ? null : "E2E-Test Teilbetrieb"} where key = ${key}`;
}

export async function createClosedGroup(memberIds: string[], opts: { discoverable?: boolean } = {}) {
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  const [topic] = await sql<{ id: string }[]>`select id from community.topics order by sort limit 1`;
  const [g] = await sql<{ id: string }[]>`
    insert into community.groups (slug, title, description, topic_id, type, discoverable, rules, rules_version)
    values (${slug}, ${`Geschlossene Testgruppe ${slug}`}, 'Nur für Mitglieder.', ${topic!.id}, 'closed', ${opts.discoverable ?? false}, 'Freundlich bleiben.', 'g1')
    returning id`;
  for (const m of memberIds)
    await sql`insert into community.group_memberships (group_id, account_id, status, rules_version_accepted) values (${g!.id}, ${m}, 'active', 'g1')`;
  return { id: g!.id, slug };
}
