import "server-only";
import { and, desc, eq, gt, isNull, or, sql as dsql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { sha256 } from "../crypto";
import { db } from "../db";
import {
  accounts,
  communityProfiles,
  consentRecords,
  roleAssignments,
  sanctions,
  sessions,
  userPreferences,
} from "../db/schema";
import { SESSION_IDLE_MS, readSessionToken } from "./session";

export type StaffRole =
  | "moderator"
  | "moderation_lead"
  | "editor"
  | "medical_reviewer"
  | "admin"
  | "ops"
  | "privacy_officer";

export type Preferences = {
  simpleView: boolean;
  textScale: number;
  motion: "system" | "reduce" | "allow";
  theme: "system" | "light" | "dark";
  timezone: string;
};

/**
 * Data Access Layer (Next.js «Data Security» Guide, Q9): die einzige Stelle, an der
 * Sitzung und Kontostatus gelesen werden. Liefert nur explizit erlaubte Felder.
 */
export type Viewer = {
  accountId: string;
  sessionId: string;
  status: "unverified" | "active" | "restricted" | "suspended" | "deletion_pending" | "deleted";
  verified: boolean;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  pseudonym: string | null;
  onboarded: boolean;
  rulesAcceptedVersion: string | null;
  roles: StaffRole[];
  isStaff: boolean;
  /** Gesundheitsbereich aktiviert (letzte Entscheidung «granted») */
  healthActive: boolean;
  /** Gesundheitsbereich wurde einmal entschieden (S08 bereits gezeigt) */
  healthDecided: boolean;
  /** Community-Schreibsperre durch Moderation */
  writeSuspended: boolean;
  /** Kontosperre: nur Datenschutzrechte und Einspruch */
  accountSuspended: boolean;
  reauthAt: Date | null;
  prefs: Preferences;
};

const DEFAULT_PREFS: Preferences = {
  simpleView: false,
  textScale: 100,
  motion: "system",
  theme: "system",
  timezone: "Europe/Zurich",
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: sessions.id,
      lastUsedAt: sessions.lastUsedAt,
      mfaVerifiedAt: sessions.mfaVerifiedAt,
      reauthAt: sessions.reauthAt,
      accountId: accounts.id,
      status: accounts.status,
      emailVerifiedAt: accounts.emailVerifiedAt,
      mfaEnabled: accounts.mfaEnabled,
    })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .where(
      and(
        eq(sessions.tokenHash, sha256(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        gt(sessions.idleExpiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return null;
  // Gelöschte oder zur Löschung vorgemerkte Konten werden nie durch eine Sitzung reaktiviert (PRI05).
  if (row.status === "deleted" || row.status === "deletion_pending") return null;

  // Inaktivitätsfenster gleitend verlängern, höchstens einmal pro Minute schreiben.
  if (now.getTime() - row.lastUsedAt.getTime() > 60_000) {
    await db
      .update(sessions)
      .set({ lastUsedAt: now, idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_MS) })
      .where(eq(sessions.id, row.sessionId));
    await db.update(accounts).set({ lastActiveAt: now }).where(eq(accounts.id, row.accountId));
  }

  const [profile, prefs, roles, health, activeSanctions] = await Promise.all([
    db
      .select({
        pseudonym: communityProfiles.pseudonym,
        onboardingCompletedAt: communityProfiles.onboardingCompletedAt,
        rulesAcceptedVersion: communityProfiles.rulesAcceptedVersion,
      })
      .from(communityProfiles)
      .where(eq(communityProfiles.accountId, row.accountId))
      .then((r) => r[0]),
    db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.accountId, row.accountId))
      .then((r) => r[0]),
    db
      .select({ role: roleAssignments.role })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.accountId, row.accountId),
          isNull(roleAssignments.revokedAt),
          dsql`${roleAssignments.startsAt} <= now()`,
          or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, now)),
        ),
      ),
    db
      .select({ decision: consentRecords.decision })
      .from(consentRecords)
      .where(and(eq(consentRecords.accountId, row.accountId), eq(consentRecords.purpose, "health_area")))
      .orderBy(desc(consentRecords.decidedAt))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ kind: sanctions.kind })
      .from(sanctions)
      .where(
        and(
          eq(sanctions.accountId, row.accountId),
          isNull(sanctions.liftedAt),
          or(isNull(sanctions.endsAt), gt(sanctions.endsAt, now)),
        ),
      ),
  ]);

  const roleList = [...new Set(roles.map((r) => r.role))] as StaffRole[];

  return {
    accountId: row.accountId,
    sessionId: row.sessionId,
    status: row.status,
    verified: row.emailVerifiedAt !== null,
    mfaEnabled: row.mfaEnabled,
    mfaVerified: row.mfaVerifiedAt !== null,
    pseudonym: profile?.pseudonym ?? null,
    onboarded: Boolean(profile?.onboardingCompletedAt),
    rulesAcceptedVersion: profile?.rulesAcceptedVersion ?? null,
    roles: roleList,
    isStaff: roleList.length > 0,
    healthActive: health?.decision === "granted",
    healthDecided: Boolean(health),
    writeSuspended: row.status === "restricted" || activeSanctions.some((s) => s.kind === "write_suspend"),
    accountSuspended: row.status === "suspended" || activeSanctions.some((s) => s.kind === "account_suspend"),
    reauthAt: row.reauthAt,
    prefs: prefs
      ? {
          simpleView: prefs.simpleView,
          textScale: prefs.textScale,
          motion: prefs.motion as Preferences["motion"],
          theme: prefs.theme as Preferences["theme"],
          timezone: prefs.timezone,
        }
      : DEFAULT_PREFS,
  };
});

/** Aktueller Pfad (vom Proxy gesetzt), für die Rückkehr nach dem Login (ACC03, HOM03). */
export async function currentPath(): Promise<string> {
  const h = await headers();
  const p = h.get("x-ms-path") ?? "/heute";
  return p.startsWith("/") && !p.startsWith("//") ? p : "/heute";
}

function loginUrl(next: string) {
  return `/anmelden?next=${encodeURIComponent(next)}`;
}

/** Nur interne, relative Ziele zulassen (kein offener Redirect). */
export function safeNext(next: string | null | undefined, fallback = "/heute"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/anmelden") || next.startsWith("/api/")) return fallback;
  return next;
}

type RequireOptions = {
  /** Auch ohne bestätigte E-Mail erlaubt */
  allowUnverified?: boolean;
  /** Auch ohne abgeschlossenes Onboarding (Pseudonym) erlaubt */
  allowNoProfile?: boolean;
  /** Auch bei Kontosperre erlaubt (Datenschutzrechte, Einspruch – ACC08) */
  allowSuspended?: boolean;
};

/** Für Server Components: leitet bei fehlender Berechtigung um. */
export async function requireViewer(opts: RequireOptions = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(loginUrl(await currentPath()));
  if (viewer.mfaEnabled && !viewer.mfaVerified)
    redirect(`/anmelden/mfa?next=${encodeURIComponent(await currentPath())}`);
  if (!viewer.verified && !opts.allowUnverified) redirect("/email-bestaetigen?status=ausstehend");
  if (!viewer.onboarded && !opts.allowNoProfile && viewer.verified) redirect("/willkommen");
  if (viewer.accountSuspended && !opts.allowSuspended) redirect("/konto/gesperrt");
  return viewer;
}

/** Für Server Actions: wirft statt umzuleiten, damit die Aktion eine Meldung liefern kann. */
export class AuthError extends Error {
  constructor(public reason: "unauthenticated" | "unverified" | "forbidden" | "suspended" | "reauth") {
    super(
      {
        unauthenticated: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
        unverified: "Bitte bestätige zuerst deine E-Mail-Adresse.",
        forbidden: "Diese Aktion ist nicht möglich.",
        suspended: "Dein Konto ist eingeschränkt. Datenschutzrechte und Einspruch bleiben verfügbar.",
        reauth: "Bitte bestätige diese Aktion mit deinem Passwort.",
      }[reason],
    );
  }
}

export async function actionViewer(opts: RequireOptions & { requireWrite?: boolean } = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthError("unauthenticated");
  if (viewer.mfaEnabled && !viewer.mfaVerified) throw new AuthError("unauthenticated");
  if (!viewer.verified && !opts.allowUnverified) throw new AuthError("unverified");
  if (viewer.accountSuspended && !opts.allowSuspended) throw new AuthError("suspended");
  if (opts.requireWrite && viewer.writeSuspended) throw new AuthError("suspended");
  return viewer;
}

/** Verwaltungsbereich: Rolle + bestätigte MFA in dieser Sitzung (ACC05, S52–S60). */
export async function requireStaff(allowed: StaffRole[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(loginUrl(await currentPath()));
  if (!viewer.roles.some((r) => allowed.includes(r))) notFound();
  if (!viewer.mfaEnabled) redirect("/konto/sicherheit?mfa=pflicht");
  if (!viewer.mfaVerified) redirect(`/anmelden/mfa?next=${encodeURIComponent(await currentPath())}`);
  return viewer;
}

export async function actionStaff(allowed: StaffRole[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthError("unauthenticated");
  if (!viewer.roles.some((r) => allowed.includes(r)) || !viewer.mfaVerified) throw new AuthError("forbidden");
  return viewer;
}

export const hasRole = (viewer: Viewer | null, ...roles: StaffRole[]) =>
  Boolean(viewer && viewer.roles.some((r) => roles.includes(r)));

/** Erneute Authentifizierung innerhalb der letzten 10 Minuten (ACC07, PRI03–PRI05). */
export const REAUTH_WINDOW_MS = 10 * 60 * 1000;
export function hasRecentAuth(viewer: Viewer): boolean {
  return Boolean(viewer.reauthAt && Date.now() - viewer.reauthAt.getTime() < REAUTH_WINDOW_MS);
}

export async function requireRecentAuth(viewer: Viewer, next?: string) {
  if (!hasRecentAuth(viewer)) redirect(`/konto/bestaetigen?next=${encodeURIComponent(next ?? (await currentPath()))}`);
}
