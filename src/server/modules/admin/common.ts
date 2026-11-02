import "server-only";
import { and, eq, gt, inArray, isNull, or, sql as dsql } from "drizzle-orm";
import type { StaffRole, Viewer } from "../../auth/viewer";
import { db, type Executor } from "../../db";
import { accounts, communityProfiles, roleAssignments } from "../../db/schema";

/** Gemeinsame Hilfen der Verwaltung. Keine Inhalte, nur Metadaten (PRD 03, PRI07). */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string | null | undefined): v is string => Boolean(v && UUID_RE.test(v));

/** Rolle, unter der eine Person im Audit handelt – die erste passende aus der Liste. */
export function actorRoleFor(viewer: Viewer, preferred: StaffRole[]): string {
  return preferred.find((r) => viewer.roles.includes(r)) ?? viewer.roles[0] ?? "member";
}

/** «a•••@b•••.ch» – nur für Administration, nie in Community-Daten (ACC08, PRD 03). */
export function maskEmail(email: string): string {
  const [local, domain = ""] = email.split("@");
  const parts = domain.split(".");
  const tld = parts.length > 1 ? parts.pop() : "";
  const host = parts.join(".");
  const m = (s: string) => (s.length > 0 ? `${s[0]}•••` : "•••");
  return `${m(local)}@${m(host)}${tld ? `.${tld}` : ""}`;
}

/** Pseudonyme für eine Menge von Konto-IDs (für Akteur- und Zuweisungsanzeigen). */
export async function pseudonymsFor(ids: (string | null | undefined)[], executor: Executor = db): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (unique.length === 0) return new Map();
  const rows = await executor
    .select({ id: communityProfiles.accountId, pseudonym: communityProfiles.pseudonym })
    .from(communityProfiles)
    .where(inArray(communityProfiles.accountId, unique));
  return new Map(rows.map((r) => [r.id, r.pseudonym]));
}

/** Aktive Rollenzuweisungen jetzt (wie in getViewer). */
export function activeRoleCondition(now = new Date()) {
  return and(
    isNull(roleAssignments.revokedAt),
    dsql`${roleAssignments.startsAt} <= now()`,
    or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, now)),
  );
}

/** Mitarbeitende mit einer der Rollen (aktiv, Konto aktiv). */
export async function staffWithRoles(
  roles: StaffRole[],
  executor: Executor = db,
): Promise<{ id: string; pseudonym: string; roles: StaffRole[]; mfaEnabled: boolean }[]> {
  const rows = await executor
    .select({
      id: accounts.id,
      pseudonym: communityProfiles.pseudonym,
      role: roleAssignments.role,
      mfaEnabled: accounts.mfaEnabled,
    })
    .from(roleAssignments)
    .innerJoin(accounts, eq(accounts.id, roleAssignments.accountId))
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, accounts.id))
    .where(and(activeRoleCondition(), inArray(roleAssignments.role, roles), eq(accounts.status, "active")));
  const byId = new Map<string, { id: string; pseudonym: string; roles: StaffRole[]; mfaEnabled: boolean }>();
  for (const r of rows) {
    const e = byId.get(r.id) ?? { id: r.id, pseudonym: r.pseudonym ?? "Ohne Pseudonym", roles: [], mfaEnabled: r.mfaEnabled };
    if (!e.roles.includes(r.role)) e.roles.push(r.role);
    byId.set(r.id, e);
  }
  return [...byId.values()].sort((a, b) => a.pseudonym.localeCompare(b.pseudonym, "de-CH"));
}

export async function hasActiveRole(accountId: string, roles: StaffRole[], executor: Executor = db): Promise<boolean> {
  const rows = await executor
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .innerJoin(accounts, eq(accounts.id, roleAssignments.accountId))
    .where(
      and(
        eq(roleAssignments.accountId, accountId),
        activeRoleCondition(),
        inArray(roleAssignments.role, roles),
        eq(accounts.status, "active"),
        eq(accounts.mfaEnabled, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
