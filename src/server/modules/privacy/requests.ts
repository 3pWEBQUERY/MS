import "server-only";
import { and, asc, desc, eq, inArray, lt, or, sql as dsql } from "drizzle-orm";
import { db } from "../../db";
import { erasureTasks, privacyRequests } from "../../db/schema";
import { taskLabel, taskOrder } from "./tasks";

/**
 * Datenschutzaufträge (PRI03–PRI06, PRD 11 «Rechteprozess»). Identität wird
 * verhältnismässig geprüft: bestehende Sitzung und bestätigte E-Mail, für sensible
 * Aufträge zusätzlich erneute Anmeldung. Keine Ausweiskopien.
 */
export const IDENTITY_METHODS = {
  session: "Bestehende Sitzung und bestätigte E-Mail",
  session_reauth: "Bestehende Sitzung, bestätigte E-Mail und erneute Anmeldung",
  automatic: "Automatisch nach Widerruf (Inhaberkonto)",
  inactivity: "Automatisch nach 24 Monaten Inaktivität und Vorwarnung an die bestätigte E-Mail-Adresse",
  mfa_pending: "Passwort-Anmeldung; Identitätsprüfung durch die Datenschutzstelle ausstehend",
} as const;

/** Arbeitsfrist der Datenschutzstelle; gesetzliche Fristen führt sie gesondert (PRD 11). */
export const REQUEST_DUE_DAYS = 30;
export const dueDate = (from = new Date()) => new Date(from.getTime() + REQUEST_DUE_DAYS * 24 * 60 * 60 * 1000);

export type RequestType = "access" | "export" | "erasure_health" | "erasure_account" | "rectification" | "mfa_recovery";
export type RequestStatus = "requested" | "deactivated" | "in_progress" | "verified" | "completed" | "failed" | "rejected";

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  access: "Auskunft",
  export: "Datenexport",
  erasure_health: "Gesundheitsdaten löschen",
  erasure_account: "Konto löschen",
  rectification: "Berichtigung",
  mfa_recovery: "Zweiten Faktor wiederherstellen",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  requested: "Angefordert",
  deactivated: "Deaktiviert",
  in_progress: "In Bearbeitung",
  verified: "Geprüft",
  completed: "Abgeschlossen",
  failed: "Fehler – wird geprüft",
  rejected: "Abgelehnt",
};

export const OPEN_STATUSES: RequestStatus[] = ["requested", "deactivated", "in_progress", "verified", "failed"];

/** Eigene Aufträge für S15 – ohne interne Notizen. */
export async function listOwnRequests(accountId: string) {
  return db
    .select({
      id: privacyRequests.id,
      receiptNumber: privacyRequests.receiptNumber,
      type: privacyRequests.type,
      status: privacyRequests.status,
      dueAt: privacyRequests.dueAt,
      createdAt: privacyRequests.createdAt,
      completedAt: privacyRequests.completedAt,
    })
    .from(privacyRequests)
    .where(eq(privacyRequests.accountId, accountId))
    .orderBy(desc(privacyRequests.createdAt))
    .limit(20);
}

export async function getOwnRequestByReceipt(accountId: string, receipt: string) {
  const [row] = await db
    .select({
      id: privacyRequests.id,
      receiptNumber: privacyRequests.receiptNumber,
      type: privacyRequests.type,
      status: privacyRequests.status,
      createdAt: privacyRequests.createdAt,
    })
    .from(privacyRequests)
    .where(and(eq(privacyRequests.accountId, accountId), eq(privacyRequests.receiptNumber, receipt)))
    .limit(1);
  return row ?? null;
}

/* ───────────────────────── S58 Verwaltung (nur erforderliche Daten, keine Inhalte) ───────────────────────── */

export type AdminFilter = "offen" | "faellig" | "fehler" | "alle";

export async function listRequestsForOfficer(filter: AdminFilter, limit = 100) {
  const now = new Date();
  const where =
    filter === "offen"
      ? inArray(privacyRequests.status, OPEN_STATUSES)
      : filter === "faellig"
        ? and(inArray(privacyRequests.status, OPEN_STATUSES), lt(privacyRequests.dueAt, new Date(now.getTime() + 7 * 864e5)))
        : filter === "fehler"
          ? or(
              eq(privacyRequests.status, "failed"),
              dsql`exists (select 1 from privacy.erasure_tasks t where t.request_id = ${privacyRequests.id} and t.status in ('failed','escalated'))`,
            )
          : undefined;
  return db
    .select({
      id: privacyRequests.id,
      receiptNumber: privacyRequests.receiptNumber,
      type: privacyRequests.type,
      status: privacyRequests.status,
      identityMethod: privacyRequests.identityMethod,
      dueAt: privacyRequests.dueAt,
      createdAt: privacyRequests.createdAt,
      completedAt: privacyRequests.completedAt,
      exceptionUntil: privacyRequests.exceptionUntil,
      // In Select-Feldern rendert Drizzle Spalten unqualifiziert – daher explizit qualifiziert
      openTasks: dsql<number>`(select count(*)::int from privacy.erasure_tasks t where t.request_id = "privacy"."requests"."id" and t.status <> 'done')`,
      problemTasks: dsql<number>`(select count(*)::int from privacy.erasure_tasks t where t.request_id = "privacy"."requests"."id" and t.status in ('failed','escalated'))`,
    })
    .from(privacyRequests)
    .where(where)
    .orderBy(asc(privacyRequests.dueAt))
    .limit(limit)
    .then((rows) => rows.map((r) => ({ ...r, ...deadlineFlags(r, now) })));
}

const CLOSED: RequestStatus[] = ["completed", "rejected"];

/** Fristen und Prüftermine (PRI06): überfällig, Ausnahme zur erneuten Prüfung fällig. */
function deadlineFlags(r: { status: RequestStatus; dueAt: Date; exceptionUntil: Date | null }, now: Date) {
  return {
    overdue: !CLOSED.includes(r.status) && r.dueAt.getTime() < now.getTime(),
    exceptionDue: Boolean(r.exceptionUntil && r.exceptionUntil.getTime() < now.getTime()),
  };
}

export async function getRequestForOfficer(id: string) {
  const [req] = await db
    .select({
      id: privacyRequests.id,
      accountId: privacyRequests.accountId,
      receiptNumber: privacyRequests.receiptNumber,
      type: privacyRequests.type,
      status: privacyRequests.status,
      identityMethod: privacyRequests.identityMethod,
      dueAt: privacyRequests.dueAt,
      exceptionNote: privacyRequests.exceptionNote,
      exceptionUntil: privacyRequests.exceptionUntil,
      handledBy: privacyRequests.handledBy,
      createdAt: privacyRequests.createdAt,
      updatedAt: privacyRequests.updatedAt,
      completedAt: privacyRequests.completedAt,
    })
    .from(privacyRequests)
    .where(eq(privacyRequests.id, id))
    .limit(1);
  if (!req) return null;
  const tasks = await db
    .select({
      id: erasureTasks.id,
      system: erasureTasks.system,
      objectClass: erasureTasks.objectClass,
      status: erasureTasks.status,
      attempts: erasureTasks.attempts,
      receipt: erasureTasks.receipt,
      updatedAt: erasureTasks.updatedAt,
    })
    .from(erasureTasks)
    .where(eq(erasureTasks.requestId, id))
    .orderBy(asc(erasureTasks.createdAt), asc(erasureTasks.system));
  const now = new Date();
  const open = tasks.filter((t) => t.status !== "done").length;
  const sorted = tasks
    .map((t) => ({ ...t, label: taskLabel(req.type, t) }))
    .sort((a, b) => taskOrder(req.type, a) - taskOrder(req.type, b));
  return {
    ...req,
    tasks: sorted,
    ...deadlineFlags(req, now),
    // Seit über einer Stunde unverändert mit offenen Teilschritten: darf erneut angestossen werden
    stale: open > 0 && !CLOSED.includes(req.status) && req.updatedAt.getTime() < now.getTime() - 60 * 60 * 1000,
  };
}
