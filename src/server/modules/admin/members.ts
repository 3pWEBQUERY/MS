import "server-only";
import { and, desc, eq, ilike, ne } from "drizzle-orm";
import { audit } from "../../audit";
import type { Viewer } from "../../auth/viewer";
import { db } from "../../db";
import { accounts, appeals, communityProfiles, moderationCases, roleAssignments, sanctions } from "../../db/schema";
import { limitHitsFor } from "../community/limit-hits";
import { activeRoleCondition, actorRoleFor, isUuid, maskEmail } from "./common";

/**
 * S54 Mitgliederverwaltung (ACC08, SAF04). Begrenzte Suche nur nach Pseudonym oder exakter
 * Konto-ID, höchstens 20 Treffer. Kein Zugriff auf Tagebuch, Nachrichten oder Gesundheitsdaten –
 * auch nicht für Administration (AT03, PRI07). E-Mail nur maskiert und nur für Administration.
 */

export const MEMBER_ROLES = ["moderation_lead", "admin"] as const;

export async function searchMembers(viewer: Viewer, rawQuery: string) {
  const q = rawQuery.trim();
  if (q.length < 2) return { rows: [], tooShort: q.length > 0 };

  // Suchbegriff wird nicht protokolliert (könnte Personenbezug enthalten), nur die Tatsache der Suche.
  await audit({
    actorId: viewer.accountId,
    actorRole: actorRoleFor(viewer, ["admin", "moderation_lead"]),
    action: "member.searched",
    objectType: "account",
  });

  const escaped = q.toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`);
  const where = isUuid(q)
    ? eq(accounts.id, q.toLowerCase())
    : ilike(communityProfiles.pseudonymNormalized, `%${escaped}%`);

  const rows = await db
    .select({
      id: accounts.id,
      pseudonym: communityProfiles.pseudonym,
      status: accounts.status,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .innerJoin(communityProfiles, eq(communityProfiles.accountId, accounts.id))
    .where(and(where, ne(accounts.status, "deleted")))
    .orderBy(communityProfiles.pseudonym)
    .limit(20);
  return { rows, tooShort: false };
}

export async function getMemberForStaff(viewer: Viewer, accountId: string) {
  if (!isUuid(accountId)) return null;
  const isAdmin = viewer.roles.includes("admin");
  const [acc] = await db
    .select({
      id: accounts.id,
      email: accounts.email,
      status: accounts.status,
      mfaEnabled: accounts.mfaEnabled,
      createdAt: accounts.createdAt,
      deletionScheduledAt: accounts.deletionScheduledAt,
      version: accounts.version,
      pseudonym: communityProfiles.pseudonym,
    })
    .from(accounts)
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, accounts.id))
    .where(eq(accounts.id, accountId));
  if (!acc || acc.status === "deleted") return null;

  await audit({
    actorId: viewer.accountId,
    actorRole: actorRoleFor(viewer, ["admin", "moderation_lead"]),
    action: "member.viewed",
    objectType: "account",
    objectId: acc.id,
  });

  const [sanctionRows, caseRows, appealRows, roleRows, limitHits] = await Promise.all([
    db
      .select({
        id: sanctions.id,
        kind: sanctions.kind,
        startsAt: sanctions.startsAt,
        endsAt: sanctions.endsAt,
        liftedAt: sanctions.liftedAt,
        caseId: sanctions.caseId,
        caseNumber: moderationCases.caseNumber,
      })
      .from(sanctions)
      .leftJoin(moderationCases, eq(moderationCases.id, sanctions.caseId))
      .where(eq(sanctions.accountId, acc.id))
      .orderBy(desc(sanctions.startsAt))
      .limit(50),
    db
      .select({
        id: moderationCases.id,
        caseNumber: moderationCases.caseNumber,
        status: moderationCases.status,
        priority: moderationCases.priority,
        createdAt: moderationCases.createdAt,
        decidedAt: moderationCases.decidedAt,
      })
      .from(moderationCases)
      .where(eq(moderationCases.subjectAccountId, acc.id))
      .orderBy(desc(moderationCases.createdAt))
      .limit(50),
    db
      .select({
        id: appeals.id,
        status: appeals.status,
        createdAt: appeals.createdAt,
        caseId: appeals.caseId,
        caseNumber: moderationCases.caseNumber,
      })
      .from(appeals)
      .innerJoin(moderationCases, eq(moderationCases.id, appeals.caseId))
      .where(eq(appeals.appellantId, acc.id))
      .orderBy(desc(appeals.createdAt))
      .limit(50),
    db
      .select({ role: roleAssignments.role })
      .from(roleAssignments)
      .where(and(eq(roleAssignments.accountId, acc.id), activeRoleCondition())),
    // SAF08: ausgelöste Limits (nur Art, Anzahl, Zeitpunkt) – falsche Treffer sind überprüfbar.
    limitHitsFor(acc.id),
  ]);

  const now = new Date();
  return {
    id: acc.id,
    pseudonym: acc.pseudonym ?? "Ohne Pseudonym",
    status: acc.status,
    version: acc.version,
    mfaEnabled: acc.mfaEnabled,
    createdAt: acc.createdAt,
    deletionScheduledAt: acc.deletionScheduledAt,
    maskedEmail: isAdmin ? maskEmail(acc.email) : null,
    roles: [...new Set(roleRows.map((r) => r.role))],
    sanctions: sanctionRows.map((s) => ({
      ...s,
      active: !s.liftedAt && s.startsAt <= now && (!s.endsAt || s.endsAt > now),
    })),
    cases: caseRows,
    appeals: appealRows,
    limitHits,
    viewerIsAdmin: isAdmin,
    isSelf: acc.id === viewer.accountId,
  };
}
