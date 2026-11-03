/**
 * Testdaten für DB-Integrationstests (PRD 16: «fiktive Konten mit aktiven, gesperrten, blockierten,
 * ausgetretenen und gelöschten Zuständen»). Jedes Konto ist eindeutig, Tests teilen keine Daten.
 * Sitzungen entstehen über den echten Data Access Layer (`createSession` → `getViewer`), damit
 * Kontostatus, Rollen, MFA und Sperren genau wie in der Anwendung ausgewertet werden.
 */
import { randomUUID } from "node:crypto";
import { sql as dsql } from "drizzle-orm";
import { COMMUNITY_RULES_VERSION, HEALTH_CONSENT_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/catalog";
import { createSession } from "@/server/auth/session";
import { getViewer, type StaffRole, type Viewer } from "@/server/auth/viewer";
import { db, sql } from "@/server/db";
import {
  accounts,
  communityProfiles,
  consentRecords,
  groupMemberships,
  groups,
  mfaFactors,
  posts,
  roleAssignments,
  topics,
  userPreferences,
} from "@/server/db/schema";

export type TestAccount = { id: string; email: string; pseudonym: string };

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}${randomUUID().slice(0, 4)}`;

export async function createMember(
  opts: { health?: boolean; roles?: StaffRole[]; emailSocial?: boolean; pseudonym?: string } = {},
): Promise<TestAccount> {
  const tag = unique();
  const email = `test.${tag}@example.test`;
  const pseudonym = opts.pseudonym ?? `Test${tag}`;
  const now = new Date();
  const [acc] = await db
    .insert(accounts)
    .values({
      email,
      passwordHash: "argon2-nicht-verwendet",
      status: "active",
      emailVerifiedAt: now,
      audienceConfirmedAt: now,
      termsVersion: TERMS_VERSION,
      mfaEnabled: Boolean(opts.roles?.length),
    })
    .returning({ id: accounts.id });
  const id = acc!.id;
  await db.insert(userPreferences).values({ accountId: id, emailSocial: opts.emailSocial ?? false, quietStart: "00:00", quietEnd: "00:00" });
  await db.insert(consentRecords).values([
    { accountId: id, purpose: "terms", textVersion: TERMS_VERSION, decision: "granted" },
    { accountId: id, purpose: "privacy_notice", textVersion: PRIVACY_VERSION, decision: "granted" },
    ...(opts.health ? [{ accountId: id, purpose: "health_area" as const, textVersion: HEALTH_CONSENT_VERSION, decision: "granted" as const }] : []),
  ]);
  await db.insert(communityProfiles).values({
    accountId: id,
    pseudonym,
    pseudonymNormalized: pseudonym.toLowerCase(),
    onboardingCompletedAt: now,
    rulesAcceptedVersion: COMMUNITY_RULES_VERSION,
    rulesAcceptedAt: now,
  });
  for (const role of opts.roles ?? []) await db.insert(roleAssignments).values({ accountId: id, role });
  if (opts.roles?.length) await db.insert(mfaFactors).values({ accountId: id, secretEncrypted: "nicht-verwendet", confirmedAt: now });
  return { id, email, pseudonym };
}

/** Meldet ein Konto über den echten Sitzungsweg an und liefert den Viewer des DAL. */
export async function signIn(accountId: string, opts: { mfa?: boolean } = {}): Promise<Viewer> {
  await createSession(accountId, { mfaVerified: opts.mfa ?? true });
  const viewer = await getViewer();
  if (!viewer) throw new Error("Anmeldung im Test fehlgeschlagen");
  return viewer;
}

let topicId: string | null = null;
export async function testTopic(): Promise<string> {
  if (topicId) return topicId;
  const slug = `test-${unique()}`;
  const [row] = await db.insert(topics).values({ slug, name: "Testthema" }).returning({ id: topics.id });
  topicId = row!.id;
  return topicId;
}

export async function createGroup(opts: { type: "open" | "closed"; discoverable?: boolean; members?: string[] }) {
  const slug = `gruppe-${unique()}`.toLowerCase();
  const [g] = await db
    .insert(groups)
    .values({
      slug,
      title: `Gruppe ${slug}`,
      description: "Testgruppe",
      topicId: await testTopic(),
      type: opts.type,
      discoverable: opts.discoverable ?? true,
      rules: "Freundlich bleiben.",
      rulesVersion: "g1",
    })
    .returning({ id: groups.id });
  for (const m of opts.members ?? [])
    await db.insert(groupMemberships).values({ groupId: g!.id, accountId: m, status: "active", rulesVersionAccepted: "g1" });
  return { id: g!.id, slug };
}

export async function createPost(authorId: string, opts: { groupId?: string | null; title?: string; body: string }) {
  const [p] = await db
    .insert(posts)
    .values({ authorId, topicId: await testTopic(), groupId: opts.groupId ?? null, title: opts.title ?? null, body: opts.body })
    .returning({ id: posts.id });
  return p!.id;
}

/** FormData aus einem Objekt (Server Actions werden wie aus dem Formular aufgerufen). */
export function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

/** Ziel eines `redirect()` aus einer Server Action (NEXT_REDIRECT-Digest), sonst Fehler. */
export async function redirectTarget(run: Promise<unknown>): Promise<string> {
  try {
    const result = await run;
    throw new Error(`Keine Umleitung, Ergebnis: ${JSON.stringify(result)}`);
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return digest.split(";")[2]!;
    throw err;
  }
}

/** Zeilen einer rohen Abfrage (Eigentümerrolle). */
export async function rows<T = Record<string, unknown>>(query: ReturnType<typeof dsql>): Promise<T[]> {
  return (await db.execute(query)) as unknown as T[];
}

/** Fehlertext der Datenbank (Meldung + Constraint), auch wenn drizzle den Fehler umhüllt. */
export async function pgError(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (err) {
    const e = err as { message?: string; constraint_name?: string; cause?: { message?: string; constraint_name?: string } };
    const src = e.cause ?? e;
    return `${src.message ?? ""} ${src.constraint_name ?? ""}`.trim();
  }
  throw new Error("Datenbankfehler erwartet, Anweisung war erfolgreich");
}

export { db, sql };
