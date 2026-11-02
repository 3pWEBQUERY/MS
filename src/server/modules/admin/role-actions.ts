"use server";

import { and, eq, gt, isNull, ne, or, sql as dsql } from "drizzle-orm";
import { refresh } from "next/cache";
import { ROLE_KEYS, SPECIAL_ACCESS_SCOPES, type StaffRoleKey } from "@/components/admin/labels";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { zonedToUtc } from "@/lib/time";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db, type Executor } from "../../db";
import { accessReviews, accounts, roleAssignments, sessions, specialAccessGrants } from "../../db/schema";
import { activeRoleCondition, actorRoleFor, isUuid } from "./common";
import {
  recentQuarters,
  SPECIAL_ACCESS_APPROVE_ROLES,
  SPECIAL_ACCESS_MAX_MINUTES,
  SPECIAL_ACCESS_REQUEST_ROLES,
} from "./roles";

/**
 * Rollenverwaltung (ACC05, ACC08, PRI07, PRI08). Nur Administration; actionStaff garantiert
 * eine MFA-bestätigte Sitzung. Niemand vergibt oder entzieht sich selbst Rollen.
 * Rollen werden bei jeder Anfrage frisch gelesen (getViewer) – Änderungen wirken sofort.
 */

const TICKET_RE = /^[\p{L}\p{N}#\-_.:/]{3,40}$/u;

function readTicket(formData: FormData, required: boolean): { ticket: string | null; error?: string } {
  const t = str(formData, "ticket");
  if (!t) return required ? { ticket: null, error: "Bitte gib die Ticket-Referenz an." } : { ticket: null };
  if (!TICKET_RE.test(t)) return { ticket: null, error: "Ticket-Referenz: 3–40 Zeichen, ohne Leerzeichen (z. B. OPS-1234)." };
  return { ticket: t };
}

/** Schützt davor, dass die letzte aktive Administrationsrolle entfällt. */
async function assertOtherAdminRemains(tx: Executor, leavingAccountId: string) {
  const [r] = await tx
    .select({ c: dsql<number>`count(distinct ${roleAssignments.accountId})` })
    .from(roleAssignments)
    .innerJoin(accounts, eq(accounts.id, roleAssignments.accountId))
    .where(
      and(
        eq(roleAssignments.role, "admin"),
        activeRoleCondition(),
        ne(roleAssignments.accountId, leavingAccountId),
        eq(accounts.status, "active"),
        eq(accounts.mfaEnabled, true),
      ),
    );
  if (Number(r?.c ?? 0) < 1)
    throw new UserError("Es muss mindestens eine weitere aktive Person mit Administrationsrolle und MFA bestehen bleiben.");
}

export async function grantRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { accountId: str(formData, "accountId"), role: str(formData, "role"), endsAt: str(formData, "endsAt"), ticket: str(formData, "ticket") };
  return runAction(async () => {
    const viewer = await actionStaff(["admin"]);
    const fe: Record<string, string> = {};
    const accountId = values.accountId.toLowerCase();
    if (!isUuid(accountId)) fe.accountId = "Bitte gib die vollständige Konto-ID an.";
    const role = values.role as StaffRoleKey;
    if (!ROLE_KEYS.includes(role)) fe.role = "Bitte wähle eine Rolle.";
    const { ticket, error } = readTicket(formData, true);
    if (error) fe.ticket = error;
    let endsAt: Date | null = null;
    if (values.endsAt) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.endsAt)) fe.endsAt = "Bitte gib ein gültiges Datum an.";
      else {
        endsAt = zonedToUtc(values.endsAt, "23:59");
        const max = Date.now() + 2 * 365 * 24 * 60 * 60 * 1000;
        if (endsAt.getTime() <= Date.now()) fe.endsAt = "Das Enddatum muss in der Zukunft liegen.";
        else if (endsAt.getTime() > max) fe.endsAt = "Befristungen sind höchstens zwei Jahre möglich.";
      }
    }
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });
    if (accountId === viewer.accountId) return fail("Niemand kann sich selbst Rollen vergeben.", { values });

    const [acc] = await db
      .select({ id: accounts.id, status: accounts.status, mfaEnabled: accounts.mfaEnabled })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!acc || acc.status !== "active")
      return fail("Für diese Konto-ID ist keine Rollenvergabe möglich. Das Konto muss aktiv und bestätigt sein.", { values });

    const existing = await db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.accountId, accountId),
          eq(roleAssignments.role, role),
          isNull(roleAssignments.revokedAt),
          or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, new Date())),
        ),
      )
      .limit(1);
    if (existing.length) return fail("Diese Rolle ist bereits vergeben. Entziehe sie zuerst, um die Befristung zu ändern.", { values });

    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(roleAssignments)
        .values({ accountId, role, endsAt, grantedBy: viewer.accountId })
        .returning({ id: roleAssignments.id });
      await audit(
        { actorId: viewer.accountId, actorRole: "admin", action: `role.granted.${role}`, objectType: "role_assignment", objectId: row.id, ticket },
        tx,
      );
    });
    refresh();
    return ok(
      acc.mfaEnabled
        ? "Rolle vergeben und protokolliert. Sie gilt ab der nächsten Anfrage der Person."
        : "Rolle vergeben und protokolliert. Sie wird erst nutzbar, wenn die Person MFA eingerichtet und bestätigt hat.",
    );
  }, values);
}

export async function revokeRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff(["admin"]);
    const assignmentId = str(formData, "assignmentId");
    if (!isUuid(assignmentId)) return fail("Diese Rollenzuweisung ist nicht verfügbar.");
    const { ticket, error } = readTicket(formData, false);
    if (error) return fail(error, { fieldErrors: { ticket: error } });
    const [ra] = await db
      .select({ id: roleAssignments.id, accountId: roleAssignments.accountId, role: roleAssignments.role, revokedAt: roleAssignments.revokedAt })
      .from(roleAssignments)
      .where(eq(roleAssignments.id, assignmentId));
    if (!ra || ra.revokedAt) return fail("Diese Rollenzuweisung ist nicht mehr aktiv.");
    if (ra.accountId === viewer.accountId) return fail("Eigene Rollen kann nur eine andere Person mit Administrationsrolle entziehen.");

    await db.transaction(async (tx) => {
      if (ra.role === "admin") await assertOtherAdminRemains(tx, ra.accountId);
      await tx
        .update(roleAssignments)
        .set({ revokedAt: new Date(), revokedBy: viewer.accountId })
        .where(and(eq(roleAssignments.id, ra.id), isNull(roleAssignments.revokedAt)));
      await audit(
        { actorId: viewer.accountId, actorRole: "admin", action: `role.revoked.${ra.role}`, objectType: "role_assignment", objectId: ra.id, ticket },
        tx,
      );
    });
    refresh();
    return ok("Rolle entzogen. Die Änderung gilt ab der nächsten Anfrage der Person.");
  });
}

/** Mitarbeitendenaustritt (PRI08): alle Rollen entziehen und alle Sitzungen sofort widerrufen. */
export async function offboardStaffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { ticket: str(formData, "ticket") };
  return runAction(async () => {
    const viewer = await actionStaff(["admin"]);
    const accountId = str(formData, "accountId");
    if (!isUuid(accountId)) return fail("Dieses Konto ist nicht verfügbar.");
    const fe: Record<string, string> = {};
    const { ticket, error } = readTicket(formData, true);
    if (error) fe.ticket = error;
    if (formData.get("confirm") !== "yes") fe.confirm = "Bitte bestätige den Entzug aller Rollen.";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });
    if (accountId === viewer.accountId) return fail("Den eigenen Austritt muss eine andere Person mit Administrationsrolle durchführen.", { values });

    const now = new Date();
    const count = await db.transaction(async (tx) => {
      const active = await tx
        .select({ id: roleAssignments.id, role: roleAssignments.role })
        .from(roleAssignments)
        .where(and(eq(roleAssignments.accountId, accountId), isNull(roleAssignments.revokedAt)));
      if (active.some((a) => a.role === "admin")) await assertOtherAdminRemains(tx, accountId);
      await tx
        .update(roleAssignments)
        .set({ revokedAt: now, revokedBy: viewer.accountId })
        .where(and(eq(roleAssignments.accountId, accountId), isNull(roleAssignments.revokedAt)));
      await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)));
      await audit(
        { actorId: viewer.accountId, actorRole: "admin", action: "staff.offboarded", objectType: "account", objectId: accountId, ticket },
        tx,
      );
      return active.length;
    });
    refresh();
    return ok(`${count === 1 ? "Eine Rolle" : `${count} Rollen`} entzogen und alle Sitzungen widerrufen.`);
  }, values);
}

/** Quartalsweise Rechteprüfung dokumentieren (PRI08). */
export async function recordAccessReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { period: str(formData, "period"), note: str(formData, "note") };
  return runAction(async () => {
    const viewer = await actionStaff(["admin"]);
    const fe: Record<string, string> = {};
    if (!recentQuarters(4).includes(values.period)) fe.period = "Bitte wähle das geprüfte Quartal.";
    const note = cleanText(values.note);
    if (note.length > 1000) fe.note = "Höchstens 1000 Zeichen.";
    if (formData.get("confirm") !== "yes") fe.confirm = "Bitte bestätige, dass alle Rollen geprüft wurden.";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(accessReviews)
        .values({ reviewerId: viewer.accountId, period: values.period, note: note || null })
        .returning({ id: accessReviews.id });
      await audit(
        { actorId: viewer.accountId, actorRole: "admin", action: "access_review.recorded", objectType: "access_review", objectId: row.id, ticket: values.period },
        tx,
      );
    });
    refresh();
    return ok(`Rechteprüfung ${values.period} dokumentiert.`);
  }, values);
}

/* ───────────── Sonderzugriff (PRD 03, PRI07) ───────────── */

const SCOPES = new Set(SPECIAL_ACCESS_SCOPES.map((s) => s.value));
const DURATIONS = [15, 30, 60];

export async function requestSpecialAccessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { ticket: str(formData, "ticket"), purpose: str(formData, "purpose"), scope: str(formData, "scope"), object: str(formData, "object") };
  return runAction(async () => {
    const viewer = await actionStaff(SPECIAL_ACCESS_REQUEST_ROLES);
    const fe: Record<string, string> = {};
    const { ticket, error } = readTicket(formData, true);
    if (error) fe.ticket = error;
    const purpose = cleanText(values.purpose);
    if (purpose.length < 10) fe.purpose = "Bitte beschreibe den Zweck (mindestens 10 Zeichen).";
    if (purpose.length > 500) fe.purpose = "Höchstens 500 Zeichen.";
    if (!SCOPES.has(values.scope)) fe.scope = "Bitte wähle den Umfang.";
    const object = values.object.replace(/[^\p{L}\p{N}\-_.:/]/gu, "").slice(0, 80);
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });

    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(specialAccessGrants)
        .values({
          requesterId: viewer.accountId,
          ticket: ticket!,
          purpose,
          scope: object ? `${values.scope} · ${object}` : values.scope,
        })
        .returning({ id: specialAccessGrants.id });
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: actorRoleFor(viewer, SPECIAL_ACCESS_REQUEST_ROLES),
          action: "special_access.requested",
          objectType: "special_access",
          objectId: row.id,
          ticket,
        },
        tx,
      );
    });
    refresh();
    return ok("Sonderzugriff beantragt. Eine zweite Person muss ihn freigeben.");
  }, values);
}

async function loadGrant(id: string) {
  if (!isUuid(id)) return null;
  const [g] = await db
    .select({
      id: specialAccessGrants.id,
      requesterId: specialAccessGrants.requesterId,
      approverId: specialAccessGrants.approverId,
      status: specialAccessGrants.status,
      ticket: specialAccessGrants.ticket,
      expiresAt: specialAccessGrants.expiresAt,
    })
    .from(specialAccessGrants)
    .where(eq(specialAccessGrants.id, id));
  return g ?? null;
}

export async function reviewSpecialAccessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff(SPECIAL_ACCESS_APPROVE_ROLES);
    const g = await loadGrant(str(formData, "grantId"));
    if (!g || g.status !== "requested") return fail("Dieser Antrag ist nicht mehr offen.");
    if (g.requesterId === viewer.accountId) return fail("Die Freigabe muss durch eine zweite Person erfolgen.");
    const decision = str(formData, "decision");
    const minutes = Number(str(formData, "minutes"));
    if (decision !== "approve" && decision !== "reject") return fail("Bitte wähle Freigeben oder Ablehnen.");
    if (decision === "approve" && (!DURATIONS.includes(minutes) || minutes > SPECIAL_ACCESS_MAX_MINUTES))
      return fail("Bitte wähle eine Dauer von höchstens 60 Minuten.", { fieldErrors: { minutes: "Bitte wähle eine Dauer." } });

    const now = new Date();
    const approve = decision === "approve";
    await db.transaction(async (tx) => {
      const rows = await tx
        .update(specialAccessGrants)
        .set(
          approve
            ? { status: "approved", approverId: viewer.accountId, approvedAt: now, expiresAt: new Date(now.getTime() + minutes * 60_000) }
            : { status: "rejected", approverId: viewer.accountId },
        )
        .where(and(eq(specialAccessGrants.id, g.id), eq(specialAccessGrants.status, "requested")))
        .returning({ id: specialAccessGrants.id });
      if (rows.length === 0) throw new UserError("Dieser Antrag wurde bereits bearbeitet.");
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: actorRoleFor(viewer, SPECIAL_ACCESS_APPROVE_ROLES),
          action: approve ? "special_access.approved" : "special_access.rejected",
          objectType: "special_access",
          objectId: g.id,
          ticket: g.ticket,
        },
        tx,
      );
    });
    refresh();
    return ok(approve ? `Sonderzugriff für ${minutes} Minuten freigegeben. Er läuft danach automatisch ab.` : "Antrag abgelehnt.");
  });
}

export async function revokeSpecialAccessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff(SPECIAL_ACCESS_REQUEST_ROLES);
    const g = await loadGrant(str(formData, "grantId"));
    if (!g || (g.status !== "approved" && g.status !== "requested")) return fail("Dieser Sonderzugriff ist nicht mehr aktiv.");
    const allowed = g.requesterId === viewer.accountId || g.approverId === viewer.accountId || viewer.roles.includes("admin");
    if (!allowed) return fail("Diesen Sonderzugriff können nur beteiligte Personen oder die Administration widerrufen.");
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(specialAccessGrants)
        .set({ status: "revoked", expiresAt: now })
        .where(and(eq(specialAccessGrants.id, g.id), or(eq(specialAccessGrants.status, "approved"), eq(specialAccessGrants.status, "requested"))));
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: actorRoleFor(viewer, SPECIAL_ACCESS_REQUEST_ROLES),
          action: "special_access.revoked",
          objectType: "special_access",
          objectId: g.id,
          ticket: g.ticket,
        },
        tx,
      );
    });
    refresh();
    return ok("Sonderzugriff widerrufen.");
  });
}
