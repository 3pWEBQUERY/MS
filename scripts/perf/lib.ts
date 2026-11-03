/**
 * Gemeinsame Bausteine der Leistungsmessungen (PRD 13 «Messprofil», NFR03–NFR05) ohne
 * Zusatzpakete: Testkonten und Sitzungen direkt in der Testdatenbank, Server Actions per fetch,
 * Perzentile. Nur gegen Test- oder Lastumgebungen mit fiktiven Konten verwenden (NFR18).
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createMember, sql, type Member } from "../../e2e/support/db";

export { sql };
export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3200").replace(/\/$/, "");
/** Produktions-Cookie (Next.js im Produktionsmodus, siehe src/server/auth/session.ts). */
const COOKIE = process.env.SESSION_COOKIE ?? "__Host-ms_session";

export type Session = Member & { cookie: string };

/** Konto + gültige Sitzung (ohne Login-Formular, damit Argon2 die Messung nicht verfälscht). */
export async function memberWithSession(opts: { health?: boolean } = {}): Promise<Session> {
  const m = await createMember(opts);
  const token = randomBytes(32).toString("base64url");
  await sql`insert into identity.sessions (account_id, token_hash, device_type, expires_at, idle_expires_at, reauth_at)
    values (${m.id}, ${createHash("sha256").update(token).digest("hex")}, 'Lasttest', now() + interval '12 hours', now() + interval '12 hours', now())`;
  return { ...m, cookie: `${COOKIE}=${token}` };
}

/** Aktiver Kontakt mit Gespräch zwischen zwei Konten (wie nach Anfrage und Annahme). */
export async function connect(a: Member, b: Member): Promise<string> {
  const [low, high] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  const [rel] = await sql<{ id: string }[]>`
    insert into messaging.contact_relationships (account_low, account_high, initiator_id, status, low_consent_at, high_consent_at, requested_at)
    values (${low}, ${high}, ${a.id}, 'active', now(), now(), now()) returning id`;
  const [conv] = await sql<{ id: string }[]>`insert into messaging.conversations (relationship_id) values (${rel!.id}) returning id`;
  return conv!.id;
}

let manifest: Record<string, { exportedName?: string }> | null = null;
/** Action-ID aus dem Produktions-Build (.next/server/server-reference-manifest.json). */
export function actionId(name: string): string {
  manifest ??= JSON.parse(readFileSync(join(__dirname, "../../.next/server/server-reference-manifest.json"), "utf8")).node;
  const hit = Object.entries(manifest!).find(([, v]) => v.exportedName === name);
  if (!hit) throw new Error(`Server Action ${name} nicht im Build gefunden`);
  return hit[0];
}

/** Server Action mit einfachen Argumenten aufrufen (wie der Browser: Next-Action-Header, gleiche Origin). */
export async function callAction(session: Session, path: string, name: string, args: unknown[]): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "text/x-component",
      "Content-Type": "text/plain;charset=UTF-8",
      "Next-Action": actionId(name),
      Origin: BASE_URL,
      Cookie: session.cookie,
    },
    body: JSON.stringify(args),
  });
}

/** Server Action mit FormData (Formulare mit useActionState: Argumente [vorheriger Zustand, FormData]). */
export async function callFormAction(session: Session, path: string, name: string, fields: Record<string, string>): Promise<Response> {
  const fd = new FormData();
  // Reihenfolge wie im Browser: Felder zuerst, Wurzel «0» zuletzt (der Server liest den Strom fortlaufend)
  for (const [k, v] of Object.entries(fields)) fd.set(`_1_${k}`, v);
  fd.set("0", JSON.stringify([{ status: "idle" }, "$K1"]));
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Accept: "text/x-component", "Next-Action": actionId(name), Origin: BASE_URL, Cookie: session.cookie },
    body: fd,
    redirect: "manual",
  });
}

export const opId = () => randomUUID();

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((x, y) => x - y);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx]!;
}

export const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
