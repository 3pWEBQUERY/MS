import "server-only";
import { and, desc, eq, inArray, isNotNull, sql as dsql } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { UserError } from "@/server/action";
import { encrypt } from "@/server/crypto";
import { db } from "@/server/db";
import { appeals, moderationActions, moderationCases, reports } from "@/server/db/schema";
import type { ReportReason, ReportTargetType } from "./reports";

/**
 * S43 Meine Meldungen und Einspruch (SAF05, US18, US20) – Mitgliederseite.
 * Zeigt nie die Identität anderer Personen (weder Meldende noch Betroffene).
 */

export const APPEAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const APPEAL_MAX = 2000;

/** Neutraler Bearbeitungsstand für Meldende (ohne Details zur Gegenseite). */
export type MemberReportStatus = "received" | "in_review" | "completed";

export const REPORT_STATUS_LABELS: Record<MemberReportStatus, string> = {
  received: "Eingegangen",
  in_review: "In Bearbeitung",
  completed: "Abgeschlossen",
};

function memberStatus(caseStatus: string | null): MemberReportStatus {
  if (!caseStatus || caseStatus === "new") return "received";
  if (caseStatus === "triaged" || caseStatus === "in_progress" || caseStatus === "escalated") return "in_review";
  return "completed";
}

export type MyReport = {
  receiptNumber: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  createdAt: Date;
  status: MemberReportStatus;
};

export async function listMyReports(viewer: Viewer): Promise<MyReport[]> {
  const rows = await db
    .select({
      receiptNumber: reports.receiptNumber,
      targetType: reports.targetType,
      reason: reports.reason,
      createdAt: reports.createdAt,
      caseStatus: moderationCases.status,
    })
    .from(reports)
    .leftJoin(moderationCases, eq(moderationCases.id, reports.caseId))
    .where(eq(reports.reporterId, viewer.accountId))
    .orderBy(desc(reports.createdAt))
    .limit(100);
  return rows.map((r) => ({
    receiptNumber: r.receiptNumber,
    targetType: r.targetType as ReportTargetType,
    reason: r.reason as ReportReason,
    createdAt: r.createdAt,
    status: memberStatus(r.caseStatus),
  }));
}

/** Massnahmen, über die Betroffene informiert werden (keine internen Notizen, SAF05). */
const INFORMING_ACTIONS = ["warn", "hide_content", "request_edit", "write_suspend", "account_suspend", "restore"] as const;

export const ACTION_LABELS: Record<string, string> = {
  warn: "Hinweis zu den Regeln",
  hide_content: "Inhalt ausgeblendet",
  request_edit: "Überarbeitung angefordert",
  write_suspend: "Zeitweise Schreibsperre",
  account_suspend: "Kontosperre",
  restore: "Inhalt wiederhergestellt",
};

export const APPEAL_STATUS_LABELS: Record<string, string> = {
  open: "Eingegangen",
  in_review: "In Prüfung",
  upheld: "Entscheidung bestätigt",
  overturned: "Entscheidung aufgehoben",
};

export type DecisionAboutMe = {
  caseId: string;
  caseNumber: string;
  targetType: ReportTargetType;
  decidedAt: Date | null;
  decisionSummary: string | null;
  ruleRef: string | null;
  actions: { kind: string; label: string; publicReason: string | null; ruleRef: string | null; durationHours: number | null }[];
  appeal: { status: string; label: string; createdAt: Date; decisionNote: string | null } | null;
  canAppeal: boolean;
  appealDeadline: Date | null;
};

/** Entscheidungen, die mich betreffen (decided/appeal/closed mit informierender Massnahme). */
export async function listDecisionsAboutMe(viewer: Viewer): Promise<DecisionAboutMe[]> {
  const me = viewer.accountId;
  const cases = await db
    .select({
      id: moderationCases.id,
      caseNumber: moderationCases.caseNumber,
      status: moderationCases.status,
      targetType: moderationCases.targetType,
      decidedAt: moderationCases.decidedAt,
      decisionSummary: moderationCases.decisionSummary,
      ruleRef: moderationCases.ruleRef,
    })
    .from(moderationCases)
    .where(
      and(
        eq(moderationCases.subjectAccountId, me),
        inArray(moderationCases.status, ["decided", "appeal", "closed"]),
        isNotNull(moderationCases.decidedAt),
      ),
    )
    .orderBy(desc(moderationCases.decidedAt))
    .limit(50);
  if (cases.length === 0) return [];
  const ids = cases.map((c) => c.id);

  const [acts, apps] = await Promise.all([
    db
      .select({
        caseId: moderationActions.caseId,
        kind: moderationActions.kind,
        publicReason: moderationActions.publicReason,
        ruleRef: moderationActions.ruleRef,
        durationHours: moderationActions.durationHours,
        createdAt: moderationActions.createdAt,
      })
      .from(moderationActions)
      .where(and(inArray(moderationActions.caseId, ids), inArray(moderationActions.kind, [...INFORMING_ACTIONS])))
      .orderBy(moderationActions.createdAt),
    db
      .select({
        caseId: appeals.caseId,
        status: appeals.status,
        createdAt: appeals.createdAt,
        decisionNote: appeals.decisionNote,
      })
      .from(appeals)
      .where(and(inArray(appeals.caseId, ids), eq(appeals.appellantId, me)))
      .orderBy(desc(appeals.createdAt)),
  ]);

  const now = Date.now();
  return cases
    .map((c) => {
      const actions = acts
        .filter((a) => a.caseId === c.id)
        .map((a) => ({
          kind: a.kind,
          label: ACTION_LABELS[a.kind] ?? "Massnahme",
          publicReason: a.publicReason,
          ruleRef: a.ruleRef,
          durationHours: a.durationHours,
        }));
      const appeal = apps.find((a) => a.caseId === c.id) ?? null;
      const deadline = c.decidedAt ? new Date(c.decidedAt.getTime() + APPEAL_WINDOW_MS) : null;
      return {
        caseId: c.id,
        caseNumber: c.caseNumber,
        targetType: c.targetType as ReportTargetType,
        decidedAt: c.decidedAt,
        decisionSummary: c.decisionSummary,
        ruleRef: c.ruleRef,
        actions,
        appeal: appeal
          ? {
              status: appeal.status,
              label: APPEAL_STATUS_LABELS[appeal.status] ?? "Eingegangen",
              createdAt: appeal.createdAt,
              // Ergebnis-Begründung nur nach Abschluss der Prüfung.
              decisionNote: appeal.status === "upheld" || appeal.status === "overturned" ? appeal.decisionNote : null,
            }
          : null,
        canAppeal: !appeal && c.status !== "appeal" && deadline !== null && deadline.getTime() > now,
        appealDeadline: deadline,
      };
    })
    .filter((d) => d.actions.length > 0);
}

/** Einzelner Fall für das Einspruchsformular (nur eigene Betroffenheit). */
export async function getAppealableCase(viewer: Viewer, caseId: string) {
  const list = await listDecisionsAboutMe(viewer);
  return list.find((d) => d.caseId === caseId) ?? null;
}

/**
 * Einspruch einreichen (SAF05, US20): auch bei Kontosperre möglich. Die Zuweisung an eine
 * andere prüfende Person erfolgt in der Verwaltung (assignedReviewerId bleibt leer).
 */
export async function submitAppeal(viewer: Viewer, caseId: string, reason: string): Promise<{ caseNumber: string }> {
  if (reason.length < 10)
    throw new UserError("Bitte beschreibe kurz, warum die Entscheidung überprüft werden soll.", {
      reason: "Mindestens 10 Zeichen.",
    });
  if (reason.length > APPEAL_MAX) throw new UserError("Die Begründung ist zu lang.", { reason: "Höchstens 2 000 Zeichen." });

  return db.transaction(async (tx) => {
    const [c] = await tx
      .select({
        id: moderationCases.id,
        caseNumber: moderationCases.caseNumber,
        status: moderationCases.status,
        decidedAt: moderationCases.decidedAt,
      })
      .from(moderationCases)
      .where(and(eq(moderationCases.id, caseId), eq(moderationCases.subjectAccountId, viewer.accountId)))
      .for("update");
    if (!c || !c.decidedAt || (c.status !== "decided" && c.status !== "closed"))
      throw new UserError("Für diesen Fall ist kein Einspruch möglich.");
    if (Date.now() - c.decidedAt.getTime() > APPEAL_WINDOW_MS)
      throw new UserError(
        "Die Einspruchsfrist von 30 Tagen ist abgelaufen. Spätere Anliegen kannst du über das Kontaktformular einreichen.",
      );
    const [existing] = await tx
      .select({ id: appeals.id })
      .from(appeals)
      .where(and(eq(appeals.caseId, c.id), eq(appeals.appellantId, viewer.accountId)))
      .limit(1);
    if (existing) throw new UserError("Du hast zu diesem Fall bereits Einspruch erhoben.");

    await tx.insert(appeals).values({ caseId: c.id, appellantId: viewer.accountId, reasonEncrypted: encrypt(reason) });
    await tx
      .update(moderationCases)
      .set({ status: "appeal", version: dsql`${moderationCases.version} + 1` })
      .where(eq(moderationCases.id, c.id));
    return { caseNumber: c.caseNumber };
  });
}
