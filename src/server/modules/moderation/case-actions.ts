"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { CASE_TRANSITIONS, type CaseStatus, type Priority } from "@/components/admin/labels";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { moderationActions, reports } from "../../db/schema";
import { hasActiveRole, isUuid } from "../admin/common";
import { notify } from "../messaging/notify";
import { bumpCase, loadCase, MOD_ROLES, PRIORITIES, readVersion, RULE_VALUES } from "./case-helpers";
import { computeDueAt, EVIDENCE_RETENTION_MS, isLead, moderationRole, OPEN_STATUSES } from "./cases";

/**
 * Server Actions der Fallführung (SAF03, SAF05, Kapitel 10): Zuweisung, Triage/Priorität,
 * Statusautomat sowie Entscheid und Information. Jede Aktion prüft Rolle, MFA-Sitzung und
 * Fallzugriff selbst, schreibt atomar und protokolliert ohne Freitexte.
 */

/* ───────────── Zuweisung (S52, nur Leitung) ───────────── */

export async function assignCaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { assigneeId: str(formData, "assigneeId") };
  return runAction(async () => {
    const viewer = await actionStaff(["moderation_lead"]);
    const c = await loadCase(viewer, str(formData, "caseId"));
    const assigneeId = values.assigneeId;
    if (!isUuid(assigneeId)) return fail("Bitte wähle eine zuständige Person.", { fieldErrors: { assigneeId: "Bitte wähle eine Person." }, values });
    if (assigneeId === c.subjectAccountId) return fail("Die betroffene Person kann den eigenen Fall nicht bearbeiten.", { values });
    if (!(await hasActiveRole(assigneeId, [...MOD_ROLES])))
      return fail("Diese Person hat keine aktive Moderationsrolle mit MFA.", { values });
    if (c.status === "closed") return fail("Abgeschlossene Fälle können nicht neu zugewiesen werden.", { values });
    if (c.assigneeId === assigneeId) return ok("Der Fall ist dieser Person bereits zugewiesen.");

    await db.transaction(async (tx) => {
      await bumpCase(tx, c, readVersion(formData), { assigneeId });
      await audit(
        { actorId: viewer.accountId, actorRole: "moderation_lead", action: "case.assigned", objectType: "moderation_case", objectId: c.id },
        tx,
      );
    });
    refresh();
    return ok("Zuweisung gespeichert.");
  }, values);
}

/* ───────────── Triage und Priorität ───────────── */

export async function setPriorityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { priority: str(formData, "priority") };
  return runAction(async () => {
    const viewer = await actionStaff([...MOD_ROLES]);
    const c = await loadCase(viewer, str(formData, "caseId"));
    const priority = values.priority as Priority;
    if (!PRIORITIES.includes(priority)) return fail("Bitte wähle eine Priorität.", { values });
    if (!OPEN_STATUSES.includes(c.status)) return fail("Die Priorität kann nur bei offenen Fällen geändert werden.", { values });
    const triage = c.status === "new";
    if (!triage && priority === c.priority) return ok("Die Priorität ist unverändert.");

    await db.transaction(async (tx) => {
      // Frist ab Eingang, gezählt in Betriebszeit (Kapitel 10)
      await bumpCase(tx, c, readVersion(formData), {
        priority,
        dueAt: computeDueAt(priority, c.createdAt),
        ...(triage ? { status: "triaged" as const } : {}),
      });
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: moderationRole(viewer),
          action: triage ? "case.triaged" : "case.priority_changed",
          objectType: "moderation_case",
          objectId: c.id,
          ticket: priority,
        },
        tx,
      );
    });
    refresh();
    return ok(triage ? "Fall triagiert." : "Priorität geändert.");
  }, values);
}

/* ───────────── Statuswechsel (Automat, SAF03) ───────────── */

export async function changeCaseStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff([...MOD_ROLES]);
    const c = await loadCase(viewer, str(formData, "caseId"));
    const to = str(formData, "to") as CaseStatus;
    if (!CASE_TRANSITIONS[c.status]?.includes(to))
      return fail("Dieser Statuswechsel ist vom aktuellen Stand aus nicht möglich.");
    if (c.status === "escalated" && !isLead(viewer))
      return fail("Eskalierte Fälle übernimmt die Moderationsleitung.");

    const now = new Date();
    await db.transaction(async (tx) => {
      await bumpCase(tx, c, readVersion(formData), {
        status: to,
        ...(to === "closed" ? { closedAt: now, evidencePurgeAfter: new Date(now.getTime() + EVIDENCE_RETENTION_MS) } : {}),
      });
      await audit(
        { actorId: viewer.accountId, actorRole: moderationRole(viewer), action: `case.status.${to}`, objectType: "moderation_case", objectId: c.id },
        tx,
      );
    });
    refresh();
    const msg: Partial<Record<CaseStatus, string>> = {
      triaged: "Fall als triagiert markiert.",
      in_progress: "Fall ist in Bearbeitung.",
      escalated: "Fall an die Moderationsleitung eskaliert.",
      closed: "Fall abgeschlossen. Belege werden nach 180 Tagen gelöscht.",
    };
    return ok(msg[to] ?? "Status geändert.");
  });
}

/* ───────────── Entscheid und Information (SAF05) ───────────── */

export async function decideCaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    decisionSummary: str(formData, "decisionSummary"),
    ruleRef: str(formData, "ruleRef"),
    withholdReason: str(formData, "withholdReason"),
    withhold: formData.get("withhold") === "yes" ? "yes" : "",
  };
  return runAction(async () => {
    const viewer = await actionStaff([...MOD_ROLES]);
    const c = await loadCase(viewer, str(formData, "caseId"));
    const fe: Record<string, string> = {};
    const summary = cleanText(values.decisionSummary);
    const withhold = values.withhold === "yes";
    const withholdReason = cleanText(values.withholdReason);
    if (summary.length < 10) fe.decisionSummary = "Bitte beschreibe den Entscheid verständlich (mindestens 10 Zeichen).";
    if (summary.length > 1500) fe.decisionSummary = "Höchstens 1500 Zeichen.";
    if (values.ruleRef && !RULE_VALUES.has(values.ruleRef)) fe.ruleRef = "Unbekannter Regelbezug.";
    if (withhold && withholdReason.length < 10) fe.withholdReason = "Bitte begründe, warum die Information zurückgehalten wird.";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });

    if (!["triaged", "in_progress", "escalated"].includes(c.status))
      return fail("Ein Entscheid ist erst nach der Triage und vor dem Abschluss möglich.", { values });
    if (c.status === "escalated" && !isLead(viewer)) return fail("Eskalierte Fälle entscheidet die Moderationsleitung.", { values });

    const documented = await db
      .select({ id: moderationActions.id })
      .from(moderationActions)
      .where(and(eq(moderationActions.caseId, c.id), ne(moderationActions.kind, "note")))
      .limit(1);
    if (documented.length === 0)
      return fail("Bitte halte zuerst eine Massnahme fest – auch «Keine Massnahme» ist ein dokumentierter Entscheid.", { values });

    const now = new Date();
    await db.transaction(async (tx) => {
      await bumpCase(tx, c, readVersion(formData), {
        status: "decided",
        decisionSummary: summary,
        ruleRef: values.ruleRef || null,
        decidedAt: now,
      });

      if (withhold) {
        // Schutz oder Verfahren gefährdet: Information wird bewusst zurückgehalten und begründet (SAF05).
        await tx.insert(moderationActions).values({
          caseId: c.id,
          actorId: viewer.accountId,
          kind: "note",
          internalNote: `Information an Betroffene zurückgehalten: ${withholdReason}`,
        });
        await audit(
          { actorId: viewer.accountId, actorRole: moderationRole(viewer), action: "case.info_withheld", objectType: "moderation_case", objectId: c.id },
          tx,
        );
      } else if (c.subjectAccountId) {
        await notify(
          {
            accountId: c.subjectAccountId,
            type: "moderation_decision",
            targetType: "case",
            targetId: c.id,
            dedupeKey: `case-decision:${c.id}:${now.getTime()}`,
          },
          tx,
        );
      }

      // Meldende erhalten einen neutralen Statushinweis – ohne Inhalte oder Massnahmendetails.
      const reporterRows = await tx
        .selectDistinct({ reporterId: reports.reporterId })
        .from(reports)
        .where(eq(reports.caseId, c.id));
      for (const r of reporterRows) {
        if (!r.reporterId || r.reporterId === c.subjectAccountId) continue;
        await notify(
          {
            accountId: r.reporterId,
            type: "moderation_decision",
            targetType: "case",
            targetId: c.id,
            dedupeKey: `case-report-status:${c.id}:${r.reporterId}:decided`,
          },
          tx,
        );
      }

      await audit(
        { actorId: viewer.accountId, actorRole: moderationRole(viewer), action: "case.decided", objectType: "moderation_case", objectId: c.id, ticket: values.ruleRef || null },
        tx,
      );
    });
    refresh();
    return ok(
      withhold
        ? "Entscheid gespeichert. Die Information an die betroffene Person wurde begründet zurückgehalten."
        : c.subjectAccountId
          ? "Entscheid gespeichert. Die betroffene Person wurde informiert."
          : "Entscheid gespeichert.",
    );
  }, values);
}
