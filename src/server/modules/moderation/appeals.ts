import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { audit, recordDenied } from "../../audit";
import type { Viewer } from "../../auth/viewer";
import { decrypt } from "../../crypto";
import { db } from "../../db";
import { appeals, moderationActions, moderationCases } from "../../db/schema";
import { isUuid, pseudonymsFor, staffWithRoles } from "../admin/common";
import { appealAnswerBy, caseDeciders, isLead, moderationRole } from "./cases";

/**
 * Einsprüche – Mitarbeitendenseite (SAF05, US20, AT07). Die Prüfung erfolgt durch eine andere
 * zuständige Person als die entscheidende. Melderidentität wird nie angezeigt.
 */

export type AppealScope = "mine" | "open" | "all";

export async function listAppeals(viewer: Viewer, scope: AppealScope) {
  const lead = isLead(viewer);
  const effective: AppealScope = lead ? scope : "mine";
  const conds = [];
  if (effective === "mine") conds.push(eq(appeals.assignedReviewerId, viewer.accountId));
  if (effective !== "all") conds.push(inArray(appeals.status, ["open", "in_review"]));
  const rows = await db
    .select({
      id: appeals.id,
      status: appeals.status,
      createdAt: appeals.createdAt,
      decidedAt: appeals.decidedAt,
      assignedReviewerId: appeals.assignedReviewerId,
      caseId: moderationCases.id,
      caseNumber: moderationCases.caseNumber,
      priority: moderationCases.priority,
    })
    .from(appeals)
    .innerJoin(moderationCases, eq(moderationCases.id, appeals.caseId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(appeals.createdAt))
    .limit(100);
  const names = await pseudonymsFor(rows.map((r) => r.assignedReviewerId));
  return {
    scope: effective,
    lead,
    rows: rows.map((r) => ({
      ...r,
      reviewer: r.assignedReviewerId ? (names.get(r.assignedReviewerId) ?? "Mitarbeitende Person") : null,
      answerBy: appealAnswerBy(r.createdAt),
    })),
  };
}

/** Lädt einen Einspruch für Leitung oder die zugewiesene prüfende Person; sonst null (neutrale 404). */
export async function getAppealForStaff(viewer: Viewer, appealId: string, route?: string) {
  if (!isUuid(appealId)) return null;
  const [a] = await db
    .select({
      id: appeals.id,
      caseId: appeals.caseId,
      appellantId: appeals.appellantId,
      reasonEncrypted: appeals.reasonEncrypted,
      assignedReviewerId: appeals.assignedReviewerId,
      status: appeals.status,
      decisionNote: appeals.decisionNote,
      decidedAt: appeals.decidedAt,
      createdAt: appeals.createdAt,
    })
    .from(appeals)
    .where(eq(appeals.id, appealId));
  if (!a) return null;
  const lead = isLead(viewer);
  const assigned = a.assignedReviewerId === viewer.accountId;
  if (!lead && !assigned) {
    await recordDenied("appeal_access", viewer.accountId, "appeal", route);
    return null;
  }

  await audit({
    actorId: viewer.accountId,
    actorRole: moderationRole(viewer),
    action: "appeal.viewed",
    objectType: "appeal",
    objectId: a.id,
  });

  const [c] = await db
    .select({
      id: moderationCases.id,
      caseNumber: moderationCases.caseNumber,
      status: moderationCases.status,
      priority: moderationCases.priority,
      targetType: moderationCases.targetType,
      decisionSummary: moderationCases.decisionSummary,
      ruleRef: moderationCases.ruleRef,
      decidedAt: moderationCases.decidedAt,
      subjectAccountId: moderationCases.subjectAccountId,
    })
    .from(moderationCases)
    .where(eq(moderationCases.id, a.caseId));
  if (!c) return null;

  const actions = await db
    .select({
      id: moderationActions.id,
      kind: moderationActions.kind,
      actorId: moderationActions.actorId,
      ruleRef: moderationActions.ruleRef,
      publicReason: moderationActions.publicReason,
      durationHours: moderationActions.durationHours,
      requiresSecondApproval: moderationActions.requiresSecondApproval,
      approvedAt: moderationActions.approvedAt,
      createdAt: moderationActions.createdAt,
    })
    .from(moderationActions)
    .where(eq(moderationActions.caseId, c.id))
    .orderBy(desc(moderationActions.createdAt));

  const deciders = await caseDeciders(c.id);
  const names = await pseudonymsFor([a.assignedReviewerId, ...actions.map((x) => x.actorId)]);

  // Zuweisung nur an Personen, die nicht entschieden haben und nicht selbst betroffen sind (SAF05).
  const candidates = lead
    ? (await staffWithRoles(["moderator", "moderation_lead"])).filter(
        (s) => !deciders.has(s.id) && s.id !== a.appellantId && s.id !== c.subjectAccountId,
      )
    : [];

  let reason: string | null = null;
  try {
    reason = decrypt(a.reasonEncrypted);
  } catch {
    reason = null;
  }

  return {
    id: a.id,
    status: a.status,
    reason,
    decisionNote: a.decisionNote,
    decidedAt: a.decidedAt,
    createdAt: a.createdAt,
    answerBy: appealAnswerBy(a.createdAt),
    reviewerId: a.assignedReviewerId,
    reviewer: a.assignedReviewerId ? (names.get(a.assignedReviewerId) ?? "Mitarbeitende Person") : null,
    viewerIsReviewer: assigned,
    viewerIsDecider: deciders.has(viewer.accountId),
    viewerIsLead: lead,
    case: c,
    actions: actions.map((x) => ({ ...x, actor: x.actorId ? (names.get(x.actorId) ?? "Mitarbeitende Person") : null })),
    candidates,
  };
}
