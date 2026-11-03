"use server";

import { redirect } from "next/navigation";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "@/server/action";
import { actionViewer } from "@/server/auth/viewer";
import { consume, LIMITS } from "@/server/rate-limit";
import { submitAppeal } from "@/server/modules/moderation/member-cases";
import { formatServiceStart, OPERATING_HOURS_LABEL } from "@/server/modules/moderation/operating-hours";
import { createReport, REPORT_DETAILS_MAX, type ReportReason, type ReportTargetType } from "@/server/modules/moderation/reports";
import { REPORT_REASONS } from "@/lib/catalog";
import { recordLimitHit } from "@/server/modules/community/limit-hits";
import { isUuid } from "./access";

/** Melden (SAF02) und Einspruch (SAF05) – Mitgliederseite. */

const TARGETS: ReportTargetType[] = ["post", "comment", "profile", "message", "group"];

export async function createReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    reason: str(formData, "reason"),
    details: str(formData, "details"),
    messageIds: formData.getAll("messageIds").filter((v): v is string => typeof v === "string"),
  };
  return runAction(async () => {
    // Melden bleibt auch bei Schreibsperre möglich.
    const viewer = await actionViewer();
    const type = str(formData, "type") as ReportTargetType;
    const id = str(formData, "id");
    const conversationId = str(formData, "conversationId");
    if (!TARGETS.includes(type)) throw new UserError("Dieser Inhalt kann nicht gemeldet werden.");
    const reason = values.reason as ReportReason;
    if (!REPORT_REASONS.some(([r]) => r === reason))
      return fail("Bitte wähle einen Grund.", { fieldErrors: { reason: "Bitte wähle einen Grund." }, values });
    const details = cleanText(values.details);
    if (details.length > REPORT_DETAILS_MAX)
      return fail("Die Erläuterung ist zu lang.", { fieldErrors: { details: "Höchstens 1 000 Zeichen." }, values });
    if (!(await consume(`report:${viewer.accountId}`, LIMITS.reportsPerHour.limit, LIMITS.reportsPerHour.window))) {
      await recordLimitHit("report", viewer.accountId, LIMITS.reportsPerHour.window);
      return fail(
        "Du hast in der letzten Stunde sehr viele Meldungen gesendet. Bitte versuche es später erneut oder schreib uns über das Kontaktformular. Bei akuter Gefahr: Notruf 144.",
        { values },
      );
    }
    const result = await createReport(viewer, {
      type,
      id: isUuid(id) ? id : null,
      conversationId: isUuid(conversationId) ? conversationId : null,
      reason,
      details: details.length > 0 ? details : null,
      messageIds: values.messageIds.filter(isUuid),
    });
    // Bestätigung mit Belegnummer im Formular (keine Belegnummer in der URL).
    return ok("Danke. Deine Meldung ist eingegangen.", {
      data: {
        receipt: result.receiptNumber,
        subjectAccountId: result.subjectAccountId && result.subjectAccountId !== viewer.accountId ? result.subjectAccountId : null,
        acute: reason === "acute_danger",
        // Kapitel 10: Eingang ausserhalb der Betriebszeit → nächster Dienstbeginn und Verweis auf S49.
        nextServiceStart: result.nextServiceStart ? formatServiceStart(result.nextServiceStart) : null,
        operatingHours: OPERATING_HOURS_LABEL,
      },
    });
  }, values);
}

export async function submitAppealAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { reason: str(formData, "reason") };
  return runAction(async () => {
    // US20: Einspruch auch bei Kontosperre.
    const viewer = await actionViewer({ allowSuspended: true });
    const caseId = str(formData, "caseId");
    if (!isUuid(caseId)) throw new UserError("Für diesen Fall ist kein Einspruch möglich.");
    if (!(await consume(`appeal:${viewer.accountId}`, 10, 3600)))
      return fail("Bitte versuche es später erneut.", { values });
    await submitAppeal(viewer, caseId, cleanText(values.reason));
    redirect("/meldungen?status=einspruch");
  }, values);
}
