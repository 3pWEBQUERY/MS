import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNull, lt, ne, or, sql as dsql } from "drizzle-orm";
import type { CaseStatus, Priority } from "@/components/admin/labels";
import { audit, recordDenied } from "../../audit";
import type { Viewer } from "../../auth/viewer";
import { decrypt, sha256 } from "../../crypto";
import { db } from "../../db";
import {
  accounts,
  appeals,
  comments,
  communityProfiles,
  evidenceItems,
  moderationActions,
  moderationCases,
  posts,
  reports,
  sanctions,
} from "../../db/schema";
import { actorRoleFor, isUuid, pseudonymsFor, staffWithRoles } from "../admin/common";
import { addOperatingTime, APPEAL_TARGET_OPERATING_MS, PRIORITY_OPERATING_MS, SECOND_APPROVAL_OPERATING_MS } from "./operating-hours";

/**
 * Fallbearbeitung für Mitarbeitende (SAF03, S52, S53, Kapitel 10).
 * Nur zugewiesene Moderation und Leitung erhalten Zugriff; jede Einsicht wird protokolliert.
 * Es gibt keine freie Chat-Navigation: sichtbar sind ausschliesslich gesicherte Belege.
 */

/* ───────────── Fristen und Prioritäten (Kapitel 10) ───────────── */

/** Reaktionsziele je Priorität in Betriebszeit (P0 30 min, P1 2 h, P2 1 Tag, P3 3 Tage) – gemeinsame Quelle mit reports.ts. */
export const PRIORITY_WINDOW_MS: Record<Priority, number> = PRIORITY_OPERATING_MS;

/** Frist ab Eingang, gezählt in Betriebszeit (Kapitel 10). */
export function computeDueAt(priority: Priority, from: Date = new Date()): Date {
  return addOperatingTime(from, PRIORITY_WINDOW_MS[priority]);
}

/** Schwere Massnahmen: zweite Prüfung binnen 24 Betriebsstunden (SAF04). */
export const SECOND_APPROVAL_WINDOW_MS = SECOND_APPROVAL_OPERATING_MS;
export const secondApprovalDueAt = (createdAt: Date) => addOperatingTime(createdAt, SECOND_APPROVAL_WINDOW_MS);
/** Einspruch: vorgeschlagenes Antwortziel 5 Betriebstage (SAF05). */
export const APPEAL_TARGET_MS = APPEAL_TARGET_OPERATING_MS;
export const appealAnswerBy = (createdAt: Date) => addOperatingTime(createdAt, APPEAL_TARGET_MS);
/** Einspruch bis 30 Tage nach dem Entscheid über die Oberfläche (SAF05). */
export const APPEAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** Fristgebundene Beweislöschung nach Abschluss (Kapitel 10 «Verhältnismässiger Ablauf»). */
export const EVIDENCE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

export const OPEN_STATUSES: CaseStatus[] = ["new", "triaged", "in_progress", "escalated"];
export const ACTIVE_STATUSES: CaseStatus[] = [...OPEN_STATUSES, "decided", "appeal"];

/* ───────────── Rechte ───────────── */

export const isLead = (viewer: Viewer) => viewer.roles.includes("moderation_lead");

/** SAF03: Leitung sieht alle Fälle, Moderation nur zugewiesene. */
export function canAccessCase(viewer: Viewer, c: { assigneeId: string | null }): boolean {
  if (isLead(viewer)) return true;
  return viewer.roles.includes("moderator") && c.assigneeId === viewer.accountId;
}

export const moderationRole = (viewer: Viewer) => actorRoleFor(viewer, ["moderation_lead", "moderator"]);

/** Personen, die an Massnahmen oder Entscheid beteiligt waren – dürfen keinen Einspruch prüfen (SAF05). */
export async function caseDeciders(caseId: string): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ actorId: moderationActions.actorId })
    .from(moderationActions)
    .where(and(eq(moderationActions.caseId, caseId), ne(moderationActions.kind, "note")));
  const set = new Set(rows.map((r) => r.actorId).filter((v): v is string => Boolean(v)));
  const [c] = await db
    .select({ assigneeId: moderationCases.assigneeId })
    .from(moderationCases)
    .where(eq(moderationCases.id, caseId));
  if (c?.assigneeId) set.add(c.assigneeId);
  return set;
}

/* ───────────── Übersicht (S52) ───────────── */

export type CaseScope = "mine" | "all" | "unassigned" | "escalated" | "approvals";

export type CaseListRow = {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  priority: Priority;
  dueAt: Date;
  createdAt: Date;
  targetType: string;
  assigneeId: string | null;
  assignee: string | null;
  reportCount: number;
  reasons: string[];
  pendingApprovals: number;
};

export async function listCases(
  viewer: Viewer,
  opts: { scope: CaseScope; status?: CaseStatus | "open" | "any"; priority?: Priority; cursor?: string | null },
): Promise<{ rows: CaseListRow[]; nextCursor: string | null; scope: CaseScope }> {
  const lead = isLead(viewer);
  // Moderation ohne Leitungsrolle sieht ausschliesslich eigene Fälle (SAF03).
  const scope: CaseScope = lead ? opts.scope : "mine";
  const conds = [];
  if (scope === "mine") conds.push(eq(moderationCases.assigneeId, viewer.accountId));
  if (scope === "unassigned") conds.push(isNull(moderationCases.assigneeId));
  if (scope === "escalated") conds.push(eq(moderationCases.status, "escalated"));
  if (scope === "approvals")
    conds.push(
      dsql`exists (select 1 from moderation.actions a where a.case_id = "cases"."id" and a.requires_second_approval = 1 and a.approved_at is null)`,
    );
  const status = opts.status ?? "open";
  if (status === "open") conds.push(inArray(moderationCases.status, OPEN_STATUSES));
  else if (status !== "any") conds.push(eq(moderationCases.status, status));
  if (opts.priority) conds.push(eq(moderationCases.priority, opts.priority));

  if (opts.cursor) {
    const [ts, id] = opts.cursor.split("_");
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime()) && isUuid(id))
      conds.push(or(gt(moderationCases.dueAt, d), and(eq(moderationCases.dueAt, d), gt(moderationCases.id, id))));
  }

  const rows = await db
    .select({
      id: moderationCases.id,
      caseNumber: moderationCases.caseNumber,
      status: moderationCases.status,
      priority: moderationCases.priority,
      dueAt: moderationCases.dueAt,
      createdAt: moderationCases.createdAt,
      targetType: moderationCases.targetType,
      assigneeId: moderationCases.assigneeId,
      reportCount: dsql<number>`(select count(*)::int from moderation.reports r where r.case_id = "cases"."id")`,
      reasons: dsql<string[]>`coalesce((select array_agg(distinct r.reason::text) from moderation.reports r where r.case_id = "cases"."id"), '{}')`,
      pendingApprovals: dsql<number>`(select count(*)::int from moderation.actions a where a.case_id = "cases"."id" and a.requires_second_approval = 1 and a.approved_at is null)`,
    })
    .from(moderationCases)
    .where(and(...conds))
    .orderBy(asc(moderationCases.dueAt), asc(moderationCases.id))
    .limit(21);

  const page = rows.slice(0, 20);
  const names = await pseudonymsFor(page.map((r) => r.assigneeId));
  const last = page[page.length - 1];
  return {
    scope,
    rows: page.map((r) => ({
      ...r,
      reportCount: Number(r.reportCount),
      pendingApprovals: Number(r.pendingApprovals),
      assignee: r.assigneeId ? (names.get(r.assigneeId) ?? "Mitarbeitende Person") : null,
    })),
    nextCursor: rows.length > 20 && last ? `${last.dueAt.toISOString()}_${last.id}` : null,
  };
}

/** Anzahlen für S52 und die Verwaltungsübersicht – keine Inhalte. */
export async function caseCounts(viewer: Viewer) {
  const lead = isLead(viewer);
  const now = new Date();
  const scopeCond = lead ? undefined : eq(moderationCases.assigneeId, viewer.accountId);
  const byPriority = await db
    .select({
      priority: moderationCases.priority,
      total: count(),
      // Fristverletzung nur, solange das Reaktionsziel offen ist (P0–P2: noch im Eingang, P3: nicht entschieden).
      overdue: dsql<number>`count(*) filter (where ${moderationCases.dueAt} < ${now.toISOString()}::timestamptz and (${moderationCases.priority} = 'P3' or ${moderationCases.status} = 'new'))`,
    })
    .from(moderationCases)
    .where(and(inArray(moderationCases.status, OPEN_STATUSES), scopeCond))
    .groupBy(moderationCases.priority);

  const [escalated] = await db
    .select({ c: count() })
    .from(moderationCases)
    .where(and(eq(moderationCases.status, "escalated"), scopeCond));
  const [unassigned] = await db
    .select({ c: count() })
    .from(moderationCases)
    .where(and(inArray(moderationCases.status, OPEN_STATUSES), isNull(moderationCases.assigneeId)));
  // Fristen in Betriebszeit lassen sich nicht in SQL ausdrücken – die offenen Vorgänge sind wenige.
  const approvalRows = await db
    .select({ createdAt: moderationActions.createdAt })
    .from(moderationActions)
    .where(and(eq(moderationActions.requiresSecondApproval, 1), isNull(moderationActions.approvedAt)))
    .limit(1000);
  const appealScope = lead ? undefined : eq(appeals.assignedReviewerId, viewer.accountId);
  const appealRows = await db
    .select({ createdAt: appeals.createdAt })
    .from(appeals)
    .where(and(inArray(appeals.status, ["open", "in_review"]), appealScope))
    .limit(1000);
  const approvals = {
    c: approvalRows.length,
    overdue: approvalRows.filter((a) => secondApprovalDueAt(a.createdAt) < now).length,
  };
  const openAppeals = {
    c: appealRows.length,
    overdue: appealRows.filter((a) => appealAnswerBy(a.createdAt) < now).length,
  };

  const prio = Object.fromEntries((["P0", "P1", "P2", "P3"] as Priority[]).map((p) => [p, { total: 0, overdue: 0 }])) as Record<
    Priority,
    { total: number; overdue: number }
  >;
  for (const r of byPriority) prio[r.priority] = { total: Number(r.total), overdue: Number(r.overdue) };
  return {
    lead,
    byPriority: prio,
    open: Object.values(prio).reduce((a, b) => a + b.total, 0),
    overdue: Object.values(prio).reduce((a, b) => a + b.overdue, 0),
    escalated: Number(escalated?.c ?? 0),
    unassigned: lead ? Number(unassigned?.c ?? 0) : 0,
    approvalsPending: lead ? Number(approvals?.c ?? 0) : 0,
    approvalsOverdue: lead ? Number(approvals?.overdue ?? 0) : 0,
    appealsOpen: Number(openAppeals?.c ?? 0),
    appealsOverdue: Number(openAppeals?.overdue ?? 0),
  };
}

/** Offene P0-Fälle (Leitung: alle, Moderation: zugewiesene) – für die Markierung in der Navigation (K01). */
export async function openP0Count(viewer: Viewer): Promise<number> {
  const [r] = await db
    .select({ c: count() })
    .from(moderationCases)
    .where(
      and(
        eq(moderationCases.priority, "P0"),
        inArray(moderationCases.status, OPEN_STATUSES),
        isLead(viewer) ? undefined : eq(moderationCases.assigneeId, viewer.accountId),
      ),
    );
  return Number(r?.c ?? 0);
}

/**
 * Moderationsqualität (PRD 15): Anteil der Fälle der letzten 30 Tage, deren Reaktionsziel
 * (Kapitel 10, in Betriebszeit) eingehalten wurde – P0–P2 gemessen an der ersten Bearbeitung
 * (Triage, Statuswechsel oder Massnahme laut Audit), P3 am Entscheid. Gezählt werden Fälle mit
 * Reaktion oder abgelaufener Frist. Dazu Einspruchskorrekturen. Keine Personen- oder Gesundheitsprofile.
 */
export async function moderationQuality(): Promise<{ measured: number; inTarget: number; appealsDecided: number; overturned: number }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db.execute<{ measured: number; in_target: number }>(dsql`
    select count(*)::int as measured,
           count(*) filter (where r.reacted_at is not null and r.reacted_at <= c.due_at)::int as in_target
    from moderation.cases c
    left join lateral (
      select case when c.priority = 'P3' then c.decided_at else (
        select min(e.occurred_at) from ops.audit_events e
        where e.object_type = 'moderation_case' and e.object_id = c.id::text
          and (e.action = 'case.triaged' or e.action like 'case.status.%'
               or (e.action like 'case.action.%' and e.action <> 'case.action.note'))
      ) end as reacted_at
    ) r on true
    where c.created_at > ${since.toISOString()}::timestamptz and (r.reacted_at is not null or c.due_at < now())
  `);
  const [a] = await db
    .select({
      decided: count(),
      overturned: dsql<number>`count(*) filter (where ${appeals.status} = 'overturned')`,
    })
    .from(appeals)
    .where(gt(appeals.decidedAt, since));
  return {
    measured: Number(rows[0]?.measured ?? 0),
    inTarget: Number(rows[0]?.in_target ?? 0),
    appealsDecided: Number(a?.decided ?? 0),
    overturned: Number(a?.overturned ?? 0),
  };
}

/* ───────────── Fall (S53) ───────────── */

export type CaseDetail = NonNullable<Awaited<ReturnType<typeof getCaseForStaff>>>;

/**
 * Lädt einen Fall für zugewiesene Moderation oder Leitung. Fremde oder unbekannte IDs → null
 * (neutrale 404). Jede Einsicht wird im Audit festgehalten (SAF03, AT07).
 */
export async function getCaseForStaff(viewer: Viewer, caseId: string, route?: string) {
  if (!isUuid(caseId)) return null;
  const [c] = await db
    .select({
      id: moderationCases.id,
      caseNumber: moderationCases.caseNumber,
      status: moderationCases.status,
      priority: moderationCases.priority,
      assigneeId: moderationCases.assigneeId,
      dueAt: moderationCases.dueAt,
      targetType: moderationCases.targetType,
      targetId: moderationCases.targetId,
      subjectAccountId: moderationCases.subjectAccountId,
      decisionSummary: moderationCases.decisionSummary,
      ruleRef: moderationCases.ruleRef,
      decidedAt: moderationCases.decidedAt,
      closedAt: moderationCases.closedAt,
      evidencePurgeAfter: moderationCases.evidencePurgeAfter,
      createdAt: moderationCases.createdAt,
      updatedAt: moderationCases.updatedAt,
      version: moderationCases.version,
    })
    .from(moderationCases)
    .where(eq(moderationCases.id, caseId));

  if (!c) return null;
  // Lesezugriff zusätzlich für die zugewiesene Einspruchsprüfung (SAF05), ohne Bearbeitungsrechte.
  let appealReviewer = false;
  if (!canAccessCase(viewer, c)) {
    const rev = viewer.roles.some((r) => r === "moderator" || r === "moderation_lead")
      ? await db
          .select({ id: appeals.id })
          .from(appeals)
          .where(and(eq(appeals.caseId, c.id), eq(appeals.assignedReviewerId, viewer.accountId), eq(appeals.status, "in_review")))
          .limit(1)
      : [];
    if (rev.length === 0) {
      await recordDenied("case_access", viewer.accountId, "moderation_case", route);
      return null;
    }
    appealReviewer = true;
  }

  await audit({
    actorId: viewer.accountId,
    actorRole: moderationRole(viewer),
    action: "case.viewed",
    objectType: "moderation_case",
    objectId: c.id,
  });

  // Meldungen: Anzahl, Gründe, Zeitpunkt, Angaben – NIE die Identität der Meldenden (SAF05, US18).
  const reportRows = await db
    .select({ id: reports.id, reason: reports.reason, createdAt: reports.createdAt, details: reports.detailsEncrypted })
    .from(reports)
    .where(eq(reports.caseId, c.id))
    .orderBy(asc(reports.createdAt));

  const evidence = await db
    .select({
      id: evidenceItems.id,
      sourceType: evidenceItems.sourceType,
      authorLabel: evidenceItems.authorLabel,
      snapshot: evidenceItems.snapshotEncrypted,
      contentHash: evidenceItems.contentHash,
      sourceCreatedAt: evidenceItems.sourceCreatedAt,
      capturedAt: evidenceItems.capturedAt,
    })
    .from(evidenceItems)
    .where(eq(evidenceItems.caseId, c.id))
    .orderBy(asc(evidenceItems.sourceCreatedAt), asc(evidenceItems.capturedAt));

  const actionRows = await db
    .select({
      id: moderationActions.id,
      kind: moderationActions.kind,
      actorId: moderationActions.actorId,
      ruleRef: moderationActions.ruleRef,
      publicReason: moderationActions.publicReason,
      internalNote: moderationActions.internalNote,
      durationHours: moderationActions.durationHours,
      requiresSecondApproval: moderationActions.requiresSecondApproval,
      approvedBy: moderationActions.approvedBy,
      approvedAt: moderationActions.approvedAt,
      createdAt: moderationActions.createdAt,
    })
    .from(moderationActions)
    .where(eq(moderationActions.caseId, c.id))
    .orderBy(desc(moderationActions.createdAt));

  const appealRows = await db
    .select({
      id: appeals.id,
      status: appeals.status,
      assignedReviewerId: appeals.assignedReviewerId,
      createdAt: appeals.createdAt,
      decidedAt: appeals.decidedAt,
    })
    .from(appeals)
    .where(eq(appeals.caseId, c.id))
    .orderBy(desc(appeals.createdAt));

  // Betroffenes Konto: nur Pseudonym, Kontostatus und aktive Sanktionen.
  let subject: {
    id: string;
    pseudonym: string;
    status: string;
    activeSanctions: { id: string; kind: string; endsAt: Date | null }[];
    priorCases: number;
  } | null = null;
  if (c.subjectAccountId) {
    const [acc] = await db
      .select({ id: accounts.id, status: accounts.status, pseudonym: communityProfiles.pseudonym })
      .from(accounts)
      .leftJoin(communityProfiles, eq(communityProfiles.accountId, accounts.id))
      .where(eq(accounts.id, c.subjectAccountId));
    if (acc) {
      const now = new Date();
      const active = await db
        .select({ id: sanctions.id, kind: sanctions.kind, endsAt: sanctions.endsAt })
        .from(sanctions)
        .where(
          and(eq(sanctions.accountId, acc.id), isNull(sanctions.liftedAt), or(isNull(sanctions.endsAt), gt(sanctions.endsAt, now))),
        );
      const [prior] = await db
        .select({ c: count() })
        .from(moderationCases)
        .where(and(eq(moderationCases.subjectAccountId, acc.id), ne(moderationCases.id, c.id)));
      subject = {
        id: acc.id,
        pseudonym: acc.pseudonym ?? "Ohne Pseudonym",
        status: acc.status,
        activeSanctions: active,
        priorCases: Number(prior?.c ?? 0),
      };
    }
  }

  // Aktueller Inhaltsstatus (nur Status, kein Text – der Text steht ausschliesslich in den Belegen).
  let contentStatus: string | null = null;
  if (c.targetType === "post") {
    const [p] = await db.select({ status: posts.status }).from(posts).where(eq(posts.id, c.targetId));
    contentStatus = p?.status ?? "missing";
  } else if (c.targetType === "comment") {
    const [p] = await db.select({ status: comments.status }).from(comments).where(eq(comments.id, c.targetId));
    contentStatus = p?.status ?? "missing";
  }

  const names = await pseudonymsFor([
    c.assigneeId,
    ...actionRows.map((a) => a.actorId),
    ...actionRows.map((a) => a.approvedBy),
    ...appealRows.map((a) => a.assignedReviewerId),
  ]);
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? "Mitarbeitende Person") : null);

  const reasonCounts = new Map<string, number>();
  for (const r of reportRows) reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);

  const assignable = isLead(viewer) ? await staffWithRoles(["moderator", "moderation_lead"]) : [];

  return {
    ...c,
    assignee: nameOf(c.assigneeId),
    reports: reportRows.map((r, i) => ({
      label: `Meldung ${i + 1}`,
      reason: r.reason,
      createdAt: r.createdAt,
      details: safeDecrypt(r.details),
    })),
    reasonCounts: [...reasonCounts.entries()].map(([reason, n]) => ({ reason, count: n })),
    evidence: evidence.map((e) => {
      const text = safeDecrypt(e.snapshot);
      return {
        id: e.id,
        sourceType: e.sourceType,
        authorLabel: e.authorLabel,
        text,
        contentHash: e.contentHash,
        hashVerified: text !== null && (sha256(text) === e.contentHash || sha256(e.snapshot) === e.contentHash),
        sourceCreatedAt: e.sourceCreatedAt,
        capturedAt: e.capturedAt,
      };
    }),
    actions: actionRows.map((a) => ({
      ...a,
      actor: nameOf(a.actorId),
      approver: nameOf(a.approvedBy),
      ownAction: a.actorId === viewer.accountId,
    })),
    appeals: appealRows.map((a) => ({ ...a, reviewer: nameOf(a.assignedReviewerId) })),
    subject,
    contentStatus,
    assignable,
    viewerIsLead: isLead(viewer),
    viewerIsAssignee: c.assigneeId === viewer.accountId,
    viewerIsAppealReviewer: appealReviewer,
  };
}

function safeDecrypt(v: string | null): string | null {
  if (!v) return null;
  try {
    return decrypt(v);
  } catch {
    return null;
  }
}

/** Offene zweite Freigaben (für Leitung, S52). */
export async function pendingApprovals(viewer: Viewer) {
  if (!isLead(viewer)) return [];
  const rows = await db
    .select({
      actionId: moderationActions.id,
      kind: moderationActions.kind,
      actorId: moderationActions.actorId,
      createdAt: moderationActions.createdAt,
      caseId: moderationCases.id,
      caseNumber: moderationCases.caseNumber,
      priority: moderationCases.priority,
    })
    .from(moderationActions)
    .innerJoin(moderationCases, eq(moderationCases.id, moderationActions.caseId))
    .where(and(eq(moderationActions.requiresSecondApproval, 1), isNull(moderationActions.approvedAt)))
    .orderBy(asc(moderationActions.createdAt))
    .limit(50);
  const names = await pseudonymsFor(rows.map((r) => r.actorId));
  return rows.map((r) => ({ ...r, actor: r.actorId ? (names.get(r.actorId) ?? "Mitarbeitende Person") : null }));
}

/** Für die periodische Aufgabe und Statistik: offene Fälle mit überschrittener Frist. */
export async function overdueOpenCaseIds(limit = 200): Promise<string[]> {
  const rows = await db
    .select({ id: moderationCases.id })
    .from(moderationCases)
    .where(and(inArray(moderationCases.status, OPEN_STATUSES), lt(moderationCases.dueAt, new Date())))
    .limit(limit);
  return rows.map((r) => r.id);
}
