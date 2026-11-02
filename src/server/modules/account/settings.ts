import "server-only";
import { and, count, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import type { Viewer } from "../../auth/viewer";
import { db } from "../../db";
import { accounts, mfaFactors, recoveryCodes, sessions } from "../../db/schema";

export type SessionItem = {
  id: string;
  deviceType: string;
  browser: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  current: boolean;
};

/** S11 Sitzungen (ACC07): nur eigene, gültige Sitzungen mit Gerätetyp und letzter Nutzung. */
export async function listOwnSessions(viewer: Viewer): Promise<SessionItem[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: sessions.id,
      deviceType: sessions.deviceType,
      browser: sessions.browser,
      createdAt: sessions.createdAt,
      lastUsedAt: sessions.lastUsedAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.accountId, viewer.accountId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        gt(sessions.idleExpiresAt, now),
      ),
    )
    .orderBy(desc(sessions.lastUsedAt))
    .limit(50);
  return rows
    .map((r) => ({ ...r, current: r.id === viewer.sessionId }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}

/** Eigene Kontodaten für S11 – nur für den Inhaber, nie in Community-Abfragen. */
export async function getOwnAccount(viewer: Viewer) {
  const [row] = await db
    .select({ email: accounts.email, createdAt: accounts.createdAt, status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, viewer.accountId))
    .limit(1);
  return row ?? null;
}

/** Zustand des zweiten Faktors (ACC05) ohne Geheimnisse. */
export async function getMfaState(viewer: Viewer) {
  const [pending] = await db
    .select({ id: mfaFactors.id, secretEncrypted: mfaFactors.secretEncrypted, createdAt: mfaFactors.createdAt })
    .from(mfaFactors)
    .where(and(eq(mfaFactors.accountId, viewer.accountId), isNull(mfaFactors.confirmedAt)))
    .orderBy(desc(mfaFactors.createdAt))
    .limit(1);
  const [confirmed] = await db
    .select({ confirmedAt: mfaFactors.confirmedAt })
    .from(mfaFactors)
    .where(and(eq(mfaFactors.accountId, viewer.accountId), isNotNull(mfaFactors.confirmedAt)))
    .orderBy(desc(mfaFactors.confirmedAt))
    .limit(1);
  const [codes] = await db
    .select({ c: count() })
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.accountId, viewer.accountId), isNull(recoveryCodes.usedAt)));
  return {
    enabled: viewer.mfaEnabled,
    confirmedAt: confirmed?.confirmedAt ?? null,
    pending: pending ?? null,
    unusedRecoveryCodes: Number(codes?.c ?? 0),
  };
}
