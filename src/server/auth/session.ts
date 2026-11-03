import "server-only";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { randomToken, sha256 } from "../crypto";
import { db } from "../db";
import { sessions } from "../db/schema";
import { clearDisplayCookie } from "./display-cookie";
import { env } from "../env";

/** Mitgliedersitzungen enden spätestens nach 12 h, nach 60 min Inaktivität (ACC03). */
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 60 * 60 * 1000;
export const COOKIE_NAME = env.isProd ? "__Host-ms_session" : "ms_session";

function describeDevice(ua: string): { deviceType: string; browser: string } {
  const deviceType = /iPad|Tablet/i.test(ua)
    ? "Tablet"
    : /Mobile|iPhone|Android/i.test(ua)
      ? "Smartphone"
      : "Computer";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return { deviceType, browser };
}

export async function createSession(accountId: string, opts: { mfaVerified?: boolean } = {}) {
  const token = randomToken(32);
  const now = Date.now();
  const ua = (await headers()).get("user-agent") ?? "";
  const { deviceType, browser } = describeDevice(ua);
  const expiresAt = new Date(now + SESSION_ABSOLUTE_MS);
  const [row] = await db
    .insert(sessions)
    .values({
      accountId,
      tokenHash: sha256(token),
      deviceType,
      browser,
      expiresAt,
      idleExpiresAt: new Date(now + SESSION_IDLE_MS),
      mfaVerifiedAt: opts.mfaVerified ? new Date(now) : null,
      reauthAt: new Date(now),
    })
    .returning({ id: sessions.id });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return row.id;
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE_NAME);
}

/** Widerruft die aktuelle Sitzung serverseitig (ACC03). */
export async function destroyCurrentSession() {
  const token = await readSessionToken();
  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, sha256(token)), isNull(sessions.revokedAt)));
  }
  await clearSessionCookie();
  // HOM06: Darstellungs-Cookie des Kontos ebenfalls entfernen (geteilte Geräte).
  await clearDisplayCookie();
}

export async function revokeAllSessions(accountId: string, exceptSessionId?: string) {
  const rows = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.accountId, accountId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined,
      ),
    )
    .returning({ id: sessions.id });
  return rows.length;
}
