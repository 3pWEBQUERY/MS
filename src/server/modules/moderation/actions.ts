"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { CASE_TRANSITIONS, RULE_REFS, type ActionKind, type CaseStatus, type Priority } from "@/components/admin/labels";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit, recordDenied } from "../../audit";
import { actionStaff, type Viewer } from "../../auth/viewer";
import { db, type Executor } from "../../db";
import { appeals, comments, moderationActions, moderationCases, posts, reports, sanctions } from "../../db/schema";
import { hasActiveRole, isUuid } from "../admin/common";
import { notify } from "../messaging/notify";
import {
  canAccessCase,
  caseDeciders,
  computeDueAt,
  EVIDENCE_RETENTION_MS,
  isLead,
  moderationRole,
  OPEN_STATUSES,
} from "./cases";

/**
 * Server Actions der Fallbearbeitung (SAF03–SAF05, Kapitel 10). Jede Aktion prüft Rolle,
 * MFA-Sitzung und Fallzugriff selbst, schreibt atomar und protokolliert ohne Freitexte.
 */

const MOD_ROLES = ["moderator", "moderation_lead"] as const;
const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
const RULE_VALUES = new Set(RULE_REFS.map((r) => r.value));
const HOUR = 60 * 60 * 1000;

type CaseRow = {
  id: string;
  status: CaseStatus;
  priority: Priority;
  assigneeId: string | null;
  targetType: "post" | "comment" | "profile" | "message" | "group";
  targetId: string;
  subjectAccountId: string | null;
  createdAt: Date;
  version: number;
};

async function loadCase(viewer: Viewer, caseId: string, executor: Executor = db): Promise<CaseRow> {
  if (!isUuid(caseId)) throw new UserError("Dieser Fall ist nicht verfügbar.");
  const [c] = await executor
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
    .where(eq(moderationCases.id, caseId));
  if (!c || !canAccessCase(viewer, c)) {
    if (c) await recordDenied("case_action", viewer.accountId, "moderation_case");
    throw new UserError("Dieser Fall ist nicht verfügbar.");
  }
  return c;
}

function readVersion(formData: FormData): number {
  const v = Number(str(formData, "version"));
  return Number.isInteger(v) && v > 0 ? v : -1;
}

const conflict = () => new UserError("Der Fall wurde inzwischen geändert. Bitte lade die Seite neu und prüfe den aktuellen Stand.");

/** Optimistische Versionierung: setzt Felder nur, wenn der gelesene Stand noch aktuell ist. */
async function bumpCase(
  tx: Executor,
  c: CaseRow,
  version: number,
  set: Partial<typeof moderationCases.$inferInsert>,
): Promise<void> {
  const rows = await tx
    .update(moderationCases)
    .set({ ...set, version: c.version + 1, updatedAt: new Date() })
    .where(and(eq(moderationCases.id, c.id), eq(moderationCases.version, version)))
    .returning({ id: moderationCases.id });
  if (rows.length === 0) throw conflict();
}

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
      // Frist ab Eingang, gemäss Kapitel 10 (vereinfacht in Kalenderzeit)
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

/* ───────────── Massnahmen (SAF04) ───────────── */

const MEASURE_KINDS: ActionKind[] = ["note", "warn", "request_edit", "hide_content", "write_suspend", "account_suspend", "no_action"];
const NEEDS_PUBLIC_REASON: ActionKind[] = ["warn", "request_edit", "hide_content", "write_suspend", "account_suspend"];
const HEAVY: ActionKind[] = ["hide_content", "write_suspend", "account_suspend"];
const WRITE_DURATIONS = [24, 72, 168, 336, 720, 0];
const ACCOUNT_DURATIONS = [168, 720, 0];

/** Setzt Beitrag oder Antwort auf «ausgeblendet» bzw. zurück auf «veröffentlicht». */
async function setContentVisibility(tx: Executor, c: CaseRow, hidden: boolean): Promise<boolean> {
  const from = hidden ? "published" : "hidden";
  const to = hidden ? "hidden" : "published";
  if (c.targetType === "post") {
    const r = await tx
      .update(posts)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(posts.id, c.targetId), eq(posts.status, from)))
      .returning({ id: posts.id });
    return r.length > 0;
  }
  if (c.targetType === "comment") {
    const r = await tx
      .update(comments)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(comments.id, c.targetId), eq(comments.status, from)))
      .returning({ id: comments.id });
    return r.length > 0;
  }
  return false;
}

async function applySanction(tx: Executor, c: CaseRow, kind: "write_suspend" | "account_suspend", durationHours: number) {
  if (!c.subjectAccountId) throw new UserError("Für diesen Fall ist kein betroffenes Konto bekannt.");
  const now = new Date();
  await tx.insert(sanctions).values({
    accountId: c.subjectAccountId,
    kind,
    caseId: c.id,
    startsAt: now,
    endsAt: durationHours > 0 ? new Date(now.getTime() + durationHours * HOUR) : null,
  });
}

export async function takeMeasureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    kind: str(formData, "kind"),
    ruleRef: str(formData, "ruleRef"),
    publicReason: str(formData, "publicReason"),
    internalNote: str(formData, "internalNote"),
    durationHours: str(formData, "durationHours"),
  };
  return runAction(async () => {
    const viewer = await actionStaff([...MOD_ROLES]);
    const c = await loadCase(viewer, str(formData, "caseId"));
    const kind = values.kind as ActionKind;
    const fe: Record<string, string> = {};

    if (!MEASURE_KINDS.includes(kind)) fe.kind = "Bitte wähle eine Massnahme.";
    const publicReason = cleanText(values.publicReason);
    const internalNote = cleanText(values.internalNote);
    if (kind !== "note" && kind !== "no_action" && !RULE_VALUES.has(values.ruleRef)) fe.ruleRef = "Bitte wähle den Regelbezug.";
    if (kind === "no_action" && values.ruleRef && !RULE_VALUES.has(values.ruleRef)) fe.ruleRef = "Unbekannter Regelbezug.";
    if (NEEDS_PUBLIC_REASON.includes(kind) && publicReason.length < 10)
      fe.publicReason = "Bitte formuliere eine verständliche Begründung (mindestens 10 Zeichen).";
    if (publicReason.length > 1000) fe.publicReason = "Höchstens 1000 Zeichen.";
    if (kind === "note" && internalNote.length < 3) fe.internalNote = "Bitte halte die Notiz fest.";
    if (internalNote.length > 2000) fe.internalNote = "Höchstens 2000 Zeichen.";

    const duration = Number(values.durationHours || "-1");
    if (kind === "write_suspend" && !WRITE_DURATIONS.includes(duration)) fe.durationHours = "Bitte wähle eine Dauer.";
    if (kind === "account_suspend" && !ACCOUNT_DURATIONS.includes(duration)) fe.durationHours = "Bitte wähle eine Dauer.";
    if (HEAVY.includes(kind) && formData.get("confirm") !== "yes")
      fe.confirm = "Bitte bestätige, dass die Massnahme verhältnismässig und begründet ist.";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });

    // Status: Massnahmen erst nach Triage – ausser sofortigem Verbergen bei akuter Gefahr (SAF04).
    const p0Hide = kind === "hide_content" && c.priority === "P0";
    if (c.status === "new" && !p0Hide && kind !== "note")
      return fail("Bitte triagiere den Fall zuerst. Bei akuter Gefahr (P0) ist sofortiges Verbergen möglich.", { values });
    if (!OPEN_STATUSES.includes(c.status) && kind !== "note")
      return fail("Für diesen Fallstatus sind keine weiteren Massnahmen möglich.", { values });
    if (c.status === "escalated" && !isLead(viewer) && kind !== "note")
      return fail("Eskalierte Fälle entscheidet die Moderationsleitung. Du kannst eine interne Notiz hinzufügen.", { values });
    if (kind === "hide_content" && c.targetType !== "post" && c.targetType !== "comment")
      return fail("Ausblenden ist nur für Beiträge und Antworten möglich. Nachrichten bleiben ausschliesslich im Fall.", { values });
    if ((kind === "write_suspend" || kind === "account_suspend") && !c.subjectAccountId)
      return fail("Für diesen Fall ist kein betroffenes Konto bekannt.", { values });
    if (c.subjectAccountId === viewer.accountId) return fail("Eigene Fälle können nicht bearbeitet werden.", { values });

    // Zweite Freigabe (SAF04, Kapitel 10): dauerhafte oder lange Sperren erst nach Freigabe wirksam;
    // sofortiges Verbergen bei P0 wird innerhalb von 24 Betriebsstunden nachgeprüft.
    const longWrite = kind === "write_suspend" && (duration === 0 || duration > 168);
    const pendingEffect = kind === "account_suspend" || longWrite;
    const requiresSecondApproval = pendingEffect || p0Hide ? 1 : 0;

    let effectApplied = false;
    await db.transaction(async (tx) => {
      await tx.insert(moderationActions).values({
        caseId: c.id,
        actorId: viewer.accountId,
        kind,
        ruleRef: values.ruleRef || null,
        publicReason: publicReason || null,
        internalNote: internalNote || null,
        durationHours: kind === "write_suspend" || kind === "account_suspend" ? duration : null,
        requiresSecondApproval,
      });

      if (kind === "hide_content") {
        effectApplied = await setContentVisibility(tx, c, true);
      } else if (kind === "write_suspend" && !pendingEffect) {
        await applySanction(tx, c, "write_suspend", duration);
        effectApplied = true;
      }

      if ((c.status === "new" || c.status === "triaged") && kind !== "note") {
        await bumpCase(tx, c, c.version, { status: "in_progress" });
      }

      await audit(
        {
          actorId: viewer.accountId,
          actorRole: moderationRole(viewer),
          action: `case.action.${kind}`,
          objectType: "moderation_case",
          objectId: c.id,
          ticket: values.ruleRef || null,
        },
        tx,
      );
      if (requiresSecondApproval) {
        await audit(
          { actorId: viewer.accountId, actorRole: moderationRole(viewer), action: "case.action.approval_requested", objectType: "moderation_case", objectId: c.id },
          tx,
        );
      }
    });
    refresh();
    if (pendingEffect) return ok("Massnahme festgehalten. Sie wird erst nach zweiter Freigabe durch eine andere zuständige Person wirksam.");
    if (p0Hide) return ok(effectApplied ? "Inhalt sofort ausgeblendet. Die Zweitprüfung ist binnen 24 Betriebsstunden fällig." : "Massnahme festgehalten. Der Inhalt war bereits nicht mehr sichtbar.");
    if (kind === "hide_content") return ok(effectApplied ? "Inhalt ausgeblendet." : "Massnahme festgehalten. Der Inhalt war bereits nicht mehr sichtbar.");
    if (kind === "note") return ok("Interne Notiz gespeichert.");
    return ok("Massnahme festgehalten.");
  }, values);
}

/* ───────────── Zweite Freigabe (SAF04, binnen 24 Betriebsstunden) ───────────── */

/**
 * requiresSecondApproval: 0 = nicht nötig, 1 = nötig (offen bzw. freigegeben, wenn approvedAt gesetzt),
 * 2 = nicht bestätigt. approvedBy/approvedAt halten die zweite prüfende Person und den Zeitpunkt fest.
 */
export async function reviewMeasureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff(["moderation_lead"]);
    const actionId = str(formData, "actionId");
    const decision = str(formData, "decision");
    if (!isUuid(actionId) || (decision !== "approve" && decision !== "reject")) return fail("Diese Freigabe ist nicht verfügbar.");
    if (formData.get("confirm") !== "yes") return fail("Bitte bestätige, dass du die Massnahme selbst geprüft hast.", { fieldErrors: { confirm: "Bitte bestätigen." } });

    const [a] = await db
      .select({
        id: moderationActions.id,
        caseId: moderationActions.caseId,
        kind: moderationActions.kind,
        actorId: moderationActions.actorId,
        durationHours: moderationActions.durationHours,
        requiresSecondApproval: moderationActions.requiresSecondApproval,
        approvedAt: moderationActions.approvedAt,
      })
      .from(moderationActions)
      .where(eq(moderationActions.id, actionId));
    if (!a || a.requiresSecondApproval !== 1 || a.approvedAt) return fail("Diese Freigabe ist nicht mehr offen.");
    if (a.actorId === viewer.accountId) return fail("Die zweite Freigabe muss durch eine andere Person erfolgen.");
    const c = await loadCase(viewer, a.caseId);
    if (c.subjectAccountId === viewer.accountId) return fail("Eigene Fälle können nicht freigegeben werden.");

    const approve = decision === "approve";
    const now = new Date();
    await db.transaction(async (tx) => {
      const upd = await tx
        .update(moderationActions)
        .set({ approvedBy: viewer.accountId, approvedAt: now, ...(approve ? {} : { requiresSecondApproval: 2 }) })
        .where(and(eq(moderationActions.id, a.id), eq(moderationActions.requiresSecondApproval, 1), isNull(moderationActions.approvedAt)))
        .returning({ id: moderationActions.id });
      if (upd.length === 0) throw new UserError("Diese Freigabe wurde bereits bearbeitet.");

      if (approve && (a.kind === "account_suspend" || a.kind === "write_suspend")) {
        await applySanction(tx, c, a.kind, a.durationHours ?? 0);
      }
      if (!approve && a.kind === "hide_content") {
        // Sofort verborgener Inhalt wird wieder sichtbar, wenn die Zweitprüfung ihn nicht bestätigt.
        const restored = await setContentVisibility(tx, c, false);
        if (restored)
          await tx.insert(moderationActions).values({
            caseId: c.id,
            actorId: viewer.accountId,
            kind: "restore",
            internalNote: "Zweitprüfung: Ausblenden nicht bestätigt, Inhalt wiederhergestellt.",
          });
      }
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: "moderation_lead",
          action: approve ? "case.action.approved" : "case.action.rejected",
          objectType: "moderation_action",
          objectId: a.id,
        },
        tx,
      );
    });
    refresh();
    return ok(approve ? "Zweite Freigabe erteilt." : "Massnahme nicht bestätigt. Eine sofortige Wirkung wurde zurückgenommen.");
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
