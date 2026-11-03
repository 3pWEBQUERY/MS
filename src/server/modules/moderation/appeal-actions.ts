"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str } from "../../action";
import { audit, recordDenied } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { appeals, moderationActions, moderationCases, sanctions } from "../../db/schema";
import { hasActiveRole, isUuid } from "../admin/common";
import { notify } from "../messaging/notify";
import { MOD_ROLES, setContentVisibility, type CaseRow } from "./case-helpers";
import { caseDeciders, EVIDENCE_RETENTION_MS, moderationRole } from "./cases";

/**
 * Server Actions der Einspruchsprüfung (SAF05, US20, AT07): Zuweisung an eine unabhängige
 * Person durch die Leitung und Entscheid durch die zugewiesene prüfende Person.
 */

/* ───────────── Einsprüche (SAF05, US20, AT07) ───────────── */

export async function assignAppealAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { reviewerId: str(formData, "reviewerId") };
  return runAction(async () => {
    const viewer = await actionStaff(["moderation_lead"]);
    const appealId = str(formData, "appealId");
    if (!isUuid(appealId)) return fail("Dieser Einspruch ist nicht verfügbar.");
    const [a] = await db
      .select({ id: appeals.id, caseId: appeals.caseId, appellantId: appeals.appellantId, status: appeals.status })
      .from(appeals)
      .where(eq(appeals.id, appealId));
    if (!a) return fail("Dieser Einspruch ist nicht verfügbar.");
    if (a.status !== "open" && a.status !== "in_review") return fail("Dieser Einspruch ist bereits entschieden.");
    const reviewerId = values.reviewerId;
    if (!isUuid(reviewerId)) return fail("Bitte wähle eine prüfende Person.", { fieldErrors: { reviewerId: "Bitte wähle eine Person." }, values });

    // Unabhängige Prüfung: niemand, der am Entscheid beteiligt war, niemand Betroffenes (SAF05, PRD 03).
    const deciders = await caseDeciders(a.caseId);
    const [c] = await db
      .select({ subjectAccountId: moderationCases.subjectAccountId, status: moderationCases.status, version: moderationCases.version })
      .from(moderationCases)
      .where(eq(moderationCases.id, a.caseId));
    if (deciders.has(reviewerId))
      return fail("Diese Person war am Entscheid beteiligt. Der Einspruch muss von einer anderen Person geprüft werden.", { values });
    if (reviewerId === a.appellantId || reviewerId === c?.subjectAccountId)
      return fail("Eigene Einsprüche können nicht selbst geprüft werden.", { values });
    if (!(await hasActiveRole(reviewerId, [...MOD_ROLES])))
      return fail("Diese Person hat keine aktive Moderationsrolle mit MFA.", { values });

    await db.transaction(async (tx) => {
      await tx.update(appeals).set({ assignedReviewerId: reviewerId, status: "in_review" }).where(eq(appeals.id, a.id));
      if (c && (c.status === "decided" || c.status === "closed")) {
        await tx
          .update(moderationCases)
          .set({ status: "appeal", version: c.version + 1, updatedAt: new Date() })
          .where(and(eq(moderationCases.id, a.caseId), eq(moderationCases.version, c.version)));
      }
      await audit(
        { actorId: viewer.accountId, actorRole: "moderation_lead", action: "appeal.assigned", objectType: "appeal", objectId: a.id },
        tx,
      );
    });
    refresh();
    return ok("Einspruch zur unabhängigen Prüfung zugewiesen.");
  }, values);
}

export async function decideAppealAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { outcome: str(formData, "outcome"), decisionNote: str(formData, "decisionNote") };
  return runAction(async () => {
    const viewer = await actionStaff([...MOD_ROLES]);
    const appealId = str(formData, "appealId");
    if (!isUuid(appealId)) return fail("Dieser Einspruch ist nicht verfügbar.");
    const fe: Record<string, string> = {};
    const outcome = values.outcome;
    const note = cleanText(values.decisionNote);
    if (outcome !== "upheld" && outcome !== "overturned") fe.outcome = "Bitte wähle das Ergebnis.";
    if (note.length < 10) fe.decisionNote = "Bitte begründe das Ergebnis verständlich (mindestens 10 Zeichen).";
    if (note.length > 1500) fe.decisionNote = "Höchstens 1500 Zeichen.";
    if (formData.get("confirm") !== "yes") fe.confirm = "Bitte bestätige deine unabhängige Prüfung.";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });

    const [a] = await db
      .select({
        id: appeals.id,
        caseId: appeals.caseId,
        appellantId: appeals.appellantId,
        status: appeals.status,
        reviewerId: appeals.assignedReviewerId,
      })
      .from(appeals)
      .where(eq(appeals.id, appealId));
    if (!a || a.reviewerId !== viewer.accountId) {
      if (a) await recordDenied("appeal_action", viewer.accountId, "appeal");
      return fail("Dieser Einspruch ist dir nicht zur Prüfung zugewiesen.", { values });
    }
    if (a.status !== "in_review") return fail("Dieser Einspruch ist bereits entschieden.", { values });
    if ((await caseDeciders(a.caseId)).has(viewer.accountId))
      return fail("Du warst am Entscheid beteiligt. Bitte die Leitung, den Einspruch neu zuzuweisen.", { values });

    const [cRow] = await db
      .select({
        id: moderationCases.id,
        status: moderationCases.status,
        priority: moderationCases.priority,
        assigneeId: moderationCases.assigneeId,
        targetType: moderationCases.targetType,
        targetId: moderationCases.targetId,
        subjectAccountId: moderationCases.subjectAccountId,
        createdAt: moderationCases.createdAt,
        version: moderationCases.version,
      })
      .from(moderationCases)
      .where(eq(moderationCases.id, a.caseId));
    if (!cRow) return fail("Dieser Einspruch ist nicht verfügbar.", { values });

    const overturn = outcome === "overturned";
    const now = new Date();
    await db.transaction(async (tx) => {
      if (overturn) {
        // Massnahmen zurücknehmen: Sanktionen aufheben, Inhalt wiederherstellen, offene Freigaben beenden.
        await tx.update(sanctions).set({ liftedAt: now }).where(and(eq(sanctions.caseId, cRow.id), isNull(sanctions.liftedAt)));
        await tx
          .update(moderationActions)
          .set({ requiresSecondApproval: 2, approvedBy: viewer.accountId, approvedAt: now })
          .where(and(eq(moderationActions.caseId, cRow.id), eq(moderationActions.requiresSecondApproval, 1), isNull(moderationActions.approvedAt)));
        const hid = await tx
          .select({ id: moderationActions.id })
          .from(moderationActions)
          .where(and(eq(moderationActions.caseId, cRow.id), eq(moderationActions.kind, "hide_content")))
          .limit(1);
        if (hid.length > 0) await setContentVisibility(tx, cRow as CaseRow, false);
        await tx.insert(moderationActions).values({
          caseId: cRow.id,
          actorId: viewer.accountId,
          kind: "restore",
          publicReason: note,
          internalNote: "Einspruch gutgeheissen: Massnahmen zurückgenommen.",
        });
      }
      await tx
        .update(appeals)
        .set({ status: overturn ? "overturned" : "upheld", decisionNote: note, decidedAt: now })
        .where(and(eq(appeals.id, a.id), eq(appeals.status, "in_review")));
      await tx
        .update(moderationCases)
        .set({
          status: "closed",
          closedAt: now,
          evidencePurgeAfter: new Date(now.getTime() + EVIDENCE_RETENTION_MS),
          version: cRow.version + 1,
          updatedAt: now,
        })
        .where(and(eq(moderationCases.id, cRow.id), inArray(moderationCases.status, ["decided", "appeal", "closed"])));
      if (a.appellantId) {
        await notify(
          { accountId: a.appellantId, type: "moderation_decision", targetType: "case", targetId: cRow.id, dedupeKey: `appeal-decision:${a.id}` },
          tx,
        );
      }
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: moderationRole(viewer),
          action: overturn ? "appeal.overturned" : "appeal.upheld",
          objectType: "appeal",
          objectId: a.id,
        },
        tx,
      );
    });
    refresh();
    return ok(
      overturn
        ? "Einspruch gutgeheissen. Massnahmen wurden zurückgenommen und die Person informiert."
        : "Entscheid bestätigt. Die Person wurde informiert.",
    );
  }, values);
}
