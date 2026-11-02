"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { erasureTasks, privacyRequests } from "../../db/schema";
import { enqueue } from "../../outbox";

/**
 * S58 Datenschutzaufträge (PRI06, PRI08): getrennte Berechtigung «privacy_officer»,
 * jede Aktion protokolliert. Keine Inhalte, nur Auftragsmetadaten.
 */
const ROLE = "privacy_officer" as const;

async function loadRequest(id: string) {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) throw new UserError("Dieser Auftrag wurde nicht gefunden.");
  const [req] = await db
    .select({ id: privacyRequests.id, type: privacyRequests.type, status: privacyRequests.status })
    .from(privacyRequests)
    .where(eq(privacyRequests.id, parsed.data));
  if (!req) throw new UserError("Dieser Auftrag wurde nicht gefunden.");
  return req;
}

/** Fehlgeschlagene oder eskalierte Teilschritte erneut anstossen. */
export async function retryErasureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const officer = await actionStaff([ROLE]);
    const req = await loadRequest(str(formData, "requestId"));
    if (req.type !== "erasure_account" && req.type !== "erasure_health") throw new UserError("Nur Löschaufträge haben Teilschritte.");
    if (req.status === "completed") throw new UserError("Dieser Auftrag ist bereits abgeschlossen.");
    await db.transaction(async (tx) => {
      const reset = await tx
        .update(erasureTasks)
        .set({ status: "pending", attempts: 0 })
        .where(and(eq(erasureTasks.requestId, req.id), inArray(erasureTasks.status, ["failed", "escalated", "pending"])))
        .returning({ id: erasureTasks.id });
      if (reset.length === 0) throw new UserError("Es gibt keine offenen Teilschritte.");
      await tx.update(privacyRequests).set({ status: "in_progress", handledBy: officer.accountId }).where(eq(privacyRequests.id, req.id));
      await enqueue(
        {
          type: req.type === "erasure_account" ? "erasure.account" : "erasure.health",
          aggregateType: "privacy_request",
          aggregateId: req.id,
          dedupeKey: `${req.type}:retry:${req.id}:${Date.now()}`,
        },
        tx,
      );
      await audit({ actorId: officer.accountId, actorRole: ROLE, action: "privacy.erasure.retried", objectType: "privacy_request", objectId: req.id }, tx);
    });
    refresh();
    return ok("Die offenen Teilschritte werden erneut ausgeführt.");
  });
}

/** Begründete, befristete Ausnahme erfassen (PRI06: kein pauschales «für immer»). */
export async function setExceptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { note: str(formData, "note"), until: str(formData, "until"), ticket: str(formData, "ticket") };
  return runAction(async () => {
    const officer = await actionStaff([ROLE]);
    const req = await loadRequest(str(formData, "requestId"));
    const note = cleanText(values.note);
    const errors: Record<string, string> = {};
    if (note.length < 10) errors.note = "Bitte begründe die Ausnahme (mindestens 10 Zeichen, ohne Inhalte der Person).";
    if (note.length > 500) errors.note = "Bitte fasse dich kürzer (höchstens 500 Zeichen).";
    const until = /^\d{4}-\d{2}-\d{2}$/.test(values.until) ? new Date(`${values.until}T23:59:59Z`) : null;
    const max = Date.now() + 366 * 864e5;
    if (!until || Number.isNaN(until.getTime()) || until.getTime() <= Date.now())
      errors.until = "Bitte wähle ein Enddatum in der Zukunft.";
    else if (until.getTime() > max) errors.until = "Ausnahmen gelten höchstens ein Jahr und werden danach erneut geprüft.";
    if (!values.ticket) errors.ticket = "Bitte gib die Vorgangs- oder Ticketnummer an.";
    if (Object.keys(errors).length > 0) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: errors, values });

    await db.transaction(async (tx) => {
      await tx
        .update(privacyRequests)
        .set({ exceptionNote: note, exceptionUntil: until, handledBy: officer.accountId })
        .where(eq(privacyRequests.id, req.id));
      await audit(
        { actorId: officer.accountId, actorRole: ROLE, action: "privacy.exception.set", objectType: "privacy_request", objectId: req.id, ticket: values.ticket.slice(0, 60) },
        tx,
      );
    });
    refresh();
    return ok("Die Ausnahme ist erfasst und befristet.");
  }, values);
}

export async function clearExceptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const officer = await actionStaff([ROLE]);
    const req = await loadRequest(str(formData, "requestId"));
    await db.transaction(async (tx) => {
      await tx.update(privacyRequests).set({ exceptionNote: null, exceptionUntil: null }).where(eq(privacyRequests.id, req.id));
      await audit({ actorId: officer.accountId, actorRole: ROLE, action: "privacy.exception.cleared", objectType: "privacy_request", objectId: req.id }, tx);
    });
    refresh();
    return ok("Die Ausnahme wurde aufgehoben.");
  });
}

/** Auskunfts- und Berichtigungsanfragen: Bearbeitung übernehmen und als erledigt markieren. */
export async function updateRequestStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const officer = await actionStaff([ROLE]);
    const req = await loadRequest(str(formData, "requestId"));
    const next = str(formData, "status");
    if (req.type !== "access" && req.type !== "rectification" && req.type !== "export")
      throw new UserError("Löschaufträge werden über ihre Teilschritte abgeschlossen.");
    const allowed: Record<string, string[]> = {
      requested: ["in_progress", "completed", "rejected"],
      in_progress: ["completed", "rejected"],
      verified: ["completed"],
    };
    if (!allowed[req.status]?.includes(next)) return fail("Dieser Statuswechsel ist nicht möglich.");
    const status = next as "in_progress" | "completed" | "rejected";
    await db.transaction(async (tx) => {
      const changed = await tx
        .update(privacyRequests)
        .set({
          status,
          handledBy: officer.accountId,
          completedAt: status === "completed" || status === "rejected" ? new Date() : null,
        })
        .where(and(eq(privacyRequests.id, req.id), eq(privacyRequests.status, req.status)))
        .returning({ id: privacyRequests.id });
      if (changed.length === 0) throw new UserError("Der Auftrag wurde inzwischen geändert. Bitte lade die Seite neu.");
      await audit({ actorId: officer.accountId, actorRole: ROLE, action: `privacy.${req.type}.${status}`, objectType: "privacy_request", objectId: req.id }, tx);
    });
    refresh();
    return ok(status === "completed" ? "Als erledigt markiert." : status === "rejected" ? "Als abgelehnt markiert." : "Bearbeitung übernommen.");
  });
}
