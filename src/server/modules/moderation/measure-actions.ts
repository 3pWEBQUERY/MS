"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import type { ActionKind } from "@/components/admin/labels";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { moderationActions } from "../../db/schema";
import { isUuid } from "../admin/common";
import { applySanction, bumpCase, loadCase, MOD_ROLES, RULE_VALUES, setContentVisibility } from "./case-helpers";
import { isLead, moderationRole, OPEN_STATUSES } from "./cases";

/**
 * Server Actions für Massnahmen (SAF04, Kapitel 10 «Verhältnismässiger Ablauf»): verwarnen,
 * Überarbeitung anfordern, ausblenden, zeitweise Schreibsperre, Kontosperre – mit Regelbezug,
 * sicherer Begründung, Dauer und zweiter Freigabe binnen 24 Betriebsstunden.
 */

/* ───────────── Massnahmen (SAF04) ───────────── */

const MEASURE_KINDS: ActionKind[] = ["note", "warn", "request_edit", "hide_content", "write_suspend", "account_suspend", "no_action"];
const NEEDS_PUBLIC_REASON: ActionKind[] = ["warn", "request_edit", "hide_content", "write_suspend", "account_suspend"];
const HEAVY: ActionKind[] = ["hide_content", "write_suspend", "account_suspend"];
const WRITE_DURATIONS = [24, 72, 168, 336, 720, 0];
const ACCOUNT_DURATIONS = [168, 720, 0];

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
