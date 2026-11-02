import "server-only";
import { and, desc, eq, gt, inArray, isNull, or, sql as dsql } from "drizzle-orm";
import type { StaffRole } from "../../auth/viewer";
import { db } from "../../db";
import { accessReviews, accounts, communityProfiles, roleAssignments, specialAccessGrants } from "../../db/schema";
import { pseudonymsFor } from "./common";

/**
 * S59 Rollen, Rechteprüfung und Sonderzugriff (ACC05, PRI07, PRI08). Nur Metadaten.
 */

/** Sonderzugriff: Beantragung durch Betrieb/Administration/Datenschutz, Freigabe durch eine zweite Person. */
export const SPECIAL_ACCESS_REQUEST_ROLES: StaffRole[] = ["ops", "admin", "privacy_officer"];
export const SPECIAL_ACCESS_APPROVE_ROLES: StaffRole[] = ["admin", "privacy_officer"];
export const SPECIAL_ACCESS_MAX_MINUTES = 60;

export type StaffMember = {
  id: string;
  pseudonym: string;
  mfaEnabled: boolean;
  status: string;
  assignments: {
    id: string;
    role: StaffRole;
    startsAt: Date;
    endsAt: Date | null;
    grantedBy: string | null;
    createdAt: Date;
  }[];
};

/** Alle Konten mit aktuell gültigen oder künftig beginnenden Rollen. */
export async function listStaff(): Promise<StaffMember[]> {
  const now = new Date();
  const rows = await db
    .select({
      assignmentId: roleAssignments.id,
      role: roleAssignments.role,
      startsAt: roleAssignments.startsAt,
      endsAt: roleAssignments.endsAt,
      grantedBy: roleAssignments.grantedBy,
      createdAt: roleAssignments.createdAt,
      accountId: accounts.id,
      status: accounts.status,
      mfaEnabled: accounts.mfaEnabled,
      pseudonym: communityProfiles.pseudonym,
    })
    .from(roleAssignments)
    .innerJoin(accounts, eq(accounts.id, roleAssignments.accountId))
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, accounts.id))
    .where(and(isNull(roleAssignments.revokedAt), or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, now))))
    .orderBy(communityProfiles.pseudonym, roleAssignments.role);

  const granters = await pseudonymsFor(rows.map((r) => r.grantedBy));
  const byId = new Map<string, StaffMember>();
  for (const r of rows) {
    const m = byId.get(r.accountId) ?? {
      id: r.accountId,
      pseudonym: r.pseudonym ?? "Ohne Pseudonym",
      mfaEnabled: r.mfaEnabled,
      status: r.status,
      assignments: [],
    };
    m.assignments.push({
      id: r.assignmentId,
      role: r.role,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      grantedBy: r.grantedBy ? (granters.get(r.grantedBy) ?? "Mitarbeitende Person") : null,
      createdAt: r.createdAt,
    });
    byId.set(r.accountId, m);
  }
  return [...byId.values()];
}

export async function listAccessReviews(limit = 12) {
  const rows = await db
    .select({ id: accessReviews.id, reviewerId: accessReviews.reviewerId, period: accessReviews.period, note: accessReviews.note, createdAt: accessReviews.createdAt })
    .from(accessReviews)
    .orderBy(desc(accessReviews.createdAt))
    .limit(limit);
  const names = await pseudonymsFor(rows.map((r) => r.reviewerId));
  return rows.map((r) => ({ ...r, reviewer: r.reviewerId ? (names.get(r.reviewerId) ?? "Mitarbeitende Person") : null }));
}

/** Aktuelles Quartal, z. B. «2026-Q4» (PRI08: quartalsweise Rechteprüfung). */
export function currentQuarter(date = new Date()): string {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

export function recentQuarters(n = 4, date = new Date()): string[] {
  const out: string[] = [];
  let y = date.getUTCFullYear();
  let q = Math.floor(date.getUTCMonth() / 3) + 1;
  for (let i = 0; i < n; i++) {
    out.push(`${y}-Q${q}`);
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
  }
  return out;
}

export async function listSpecialAccess() {
  const now = new Date();
  const rows = await db
    .select({
      id: specialAccessGrants.id,
      requesterId: specialAccessGrants.requesterId,
      approverId: specialAccessGrants.approverId,
      ticket: specialAccessGrants.ticket,
      purpose: specialAccessGrants.purpose,
      scope: specialAccessGrants.scope,
      status: specialAccessGrants.status,
      approvedAt: specialAccessGrants.approvedAt,
      expiresAt: specialAccessGrants.expiresAt,
      createdAt: specialAccessGrants.createdAt,
    })
    .from(specialAccessGrants)
    .orderBy(desc(specialAccessGrants.createdAt))
    .limit(50);
  const names = await pseudonymsFor([...rows.map((r) => r.requesterId), ...rows.map((r) => r.approverId)]);
  return rows.map((r) => {
    // Ablauf gilt sofort, auch bevor die periodische Aufgabe den Status nachführt (≤ 60 Minuten).
    const status = r.status === "approved" && r.expiresAt && r.expiresAt <= now ? "expired" : r.status;
    return {
      ...r,
      status,
      requester: names.get(r.requesterId) ?? "Mitarbeitende Person",
      approver: r.approverId ? (names.get(r.approverId) ?? "Mitarbeitende Person") : null,
    };
  });
}

export async function countActiveSpecialAccess(): Promise<{ active: number; requested: number }> {
  const [r] = await db
    .select({
      active: dsql<number>`count(*) filter (where ${specialAccessGrants.status} = 'approved' and ${specialAccessGrants.expiresAt} > now())`,
      requested: dsql<number>`count(*) filter (where ${specialAccessGrants.status} = 'requested')`,
    })
    .from(specialAccessGrants)
    .where(inArray(specialAccessGrants.status, ["approved", "requested"]));
  return { active: Number(r?.active ?? 0), requested: Number(r?.requested ?? 0) };
}

/** Rolleninhaber ohne aktivierte MFA – Rollen sind bis zur Einrichtung nicht nutzbar (ACC05). */
export async function countStaffWithoutMfa(): Promise<number> {
  const [r] = await db
    .select({ c: dsql<number>`count(distinct ${accounts.id})` })
    .from(roleAssignments)
    .innerJoin(accounts, eq(accounts.id, roleAssignments.accountId))
    .where(and(isNull(roleAssignments.revokedAt), eq(accounts.mfaEnabled, false), or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, new Date()))));
  return Number(r?.c ?? 0);
}
