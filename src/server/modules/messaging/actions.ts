"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "@/server/action";
import { actionViewer, AuthError } from "@/server/auth/viewer";
import { assertEnabled, FeatureDisabledError } from "@/server/flags";
import { consume, LIMITS, peek } from "@/server/rate-limit";
import { isUuid } from "./access";
import { blockMember, unblock } from "./blocks";
import { endContact, respondToRequest, sendContactRequest, withdrawRequest } from "./contacts";
import { markConversationRead, removeOwnMessage, sendMessage } from "./conversations";
import {
  createTestNotification,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPrefs,
} from "./notifications";

/**
 * Server Actions für Kontakte, Gespräche, Blockieren und Mitteilungen.
 * Jede Action prüft selbst Sitzung, Kontostatus, Feature-Schalter und Limits.
 */

function requireId(v: string, message = "Dieser Vorgang ist nicht mehr verfügbar."): string {
  if (!isUuid(v)) throw new UserError(message);
  return v;
}

/* ───────────────────────── Kontakte (MSG01, MSG02) ───────────────────────── */

export async function sendContactRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ requireWrite: true });
    await assertEnabled("chat");
    const targetId = requireId(str(formData, "targetId"), "Diese Person ist nicht verfügbar.");
    const key = `contact:${viewer.accountId}`;
    // MSG02: höchstens fünf neue Anfragen pro Tag (gezählt werden nur gesendete Anfragen).
    if ((await peek(key, LIMITS.contactRequestsPerDay.window)) >= LIMITS.contactRequestsPerDay.limit)
      return fail("Du hast heute bereits fünf Kontaktanfragen gesendet. Morgen kannst du wieder Anfragen senden.");
    const outcome = await sendContactRequest(viewer, targetId);
    switch (outcome.kind) {
      case "sent":
        await consume(key, LIMITS.contactRequestsPerDay.limit, LIMITS.contactRequestsPerDay.window);
        refresh();
        return ok("Anfrage gesendet. Sobald sie angenommen ist, könnt ihr einander schreiben.", { data: { outcome: "sent" } });
      case "already_pending":
        return ok("Deine Anfrage ist bereits ausstehend.", { data: { outcome: "already_pending" } });
      case "incoming_exists":
        return ok("Diese Person hat dir bereits eine Anfrage gesendet. Du kannst sie unter «Kontakte» annehmen.", {
          data: { outcome: "incoming_exists" },
        });
      case "active":
        return ok("Ihr seid bereits verbunden.", { data: { outcome: "active", conversationId: outcome.conversationId } });
    }
  });
}

export async function respondContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const relationshipId = requireId(str(formData, "relationshipId"));
    const accept = str(formData, "decision") === "accept";
    if (accept) await assertEnabled("chat");
    const { conversationId } = await respondToRequest(viewer, relationshipId, accept);
    // F05: Annahme öffnet S40.
    if (accept && conversationId) redirect(`/community/gespraeche/${conversationId}?status=verbunden`);
    redirect("/community/kontakte?status=abgelehnt");
  });
}

export async function withdrawRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    await withdrawRequest(viewer, requireId(str(formData, "relationshipId")));
    redirect("/community/kontakte?status=zurueckgezogen");
  });
}

export async function endContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    await endContact(viewer, requireId(str(formData, "relationshipId")));
    const conversationId = str(formData, "conversationId");
    if (isUuid(conversationId)) redirect(`/community/gespraeche/${conversationId}?status=beendet`);
    redirect("/community/kontakte?status=beendet");
  });
}

/* ───────────────────────── Blockieren (SAF01) ───────────────────────── */

export async function blockMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    // Schutzfunktion: auch bei Schreibsperre oder abgeschaltetem Chat verfügbar.
    const viewer = await actionViewer();
    await blockMember(viewer, requireId(str(formData, "targetId"), "Diese Person ist nicht verfügbar."));
    redirect("/community/blockiert?status=blockiert");
  });
}

export async function unblockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    await unblock(viewer, requireId(str(formData, "blockId")));
    redirect("/community/blockiert?status=aufgehoben");
  });
}

/* ───────────────────────── Gespräche (MSG03–MSG06) ───────────────────────── */

export type SendMessageResult =
  | { ok: true; id: string; seq: number; createdAt: string }
  | { ok: false; message: string; retryable: boolean; closed?: boolean };

/**
 * Nachricht senden. Wiederholung mit derselben clientOpId erzeugt kein Duplikat (MSG03).
 * Serverbestätigung bedeutet «gespeichert», nicht «gelesen».
 */
export async function sendMessageAction(conversationId: string, rawBody: string, clientOpId: string): Promise<SendMessageResult> {
  try {
    const viewer = await actionViewer({ requireWrite: true });
    await assertEnabled("chat");
    if (!isUuid(conversationId)) return { ok: false, message: "Dieses Gespräch ist nicht verfügbar.", retryable: false };
    const opId = isUuid(clientOpId) ? clientOpId : randomUUID();
    const body = cleanText(typeof rawBody === "string" ? rawBody : "");
    // SAF08: höchstens 30 Nachrichten pro Minute je Sender.
    if (!(await consume(`msg:${viewer.accountId}`, LIMITS.messagesPerMinute.limit, LIMITS.messagesPerMinute.window)))
      return {
        ok: false,
        message: "Du hast in kurzer Zeit sehr viele Nachrichten gesendet. Bitte warte eine Minute und versuche es dann erneut.",
        retryable: true,
      };
    const res = await sendMessage(viewer, conversationId, body, opId);
    return { ok: true, id: res.id, seq: res.seq, createdAt: res.createdAt };
  } catch (err) {
    if (err instanceof UserError) return { ok: false, message: err.message, retryable: false, closed: !err.fieldErrors };
    if (err instanceof AuthError) return { ok: false, message: err.message, retryable: false };
    if (err instanceof FeatureDisabledError)
      return { ok: false, message: `${err.message}. Bestehende Nachrichten bleiben erhalten.`, retryable: false };
    console.error("[chat] send failed", err instanceof Error ? err.name : "unknown");
    return { ok: false, message: "Nicht gesendet. Bitte versuche es erneut.", retryable: true };
  }
}

export async function removeMessageAction(messageId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const viewer = await actionViewer();
    if (!isUuid(messageId)) return { ok: false, message: "Diese Nachricht kann nicht entfernt werden." };
    await removeOwnMessage(viewer, messageId);
    return { ok: true };
  } catch (err) {
    if (err instanceof UserError || err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Das hat nicht geklappt. Bitte versuche es erneut." };
  }
}

/** Eigener Lesestand – nie für die Gegenseite sichtbar (MSG03: keine Lesebestätigung). */
export async function markConversationReadAction(conversationId: string, seq: number): Promise<void> {
  try {
    const viewer = await actionViewer({ allowSuspended: true });
    if (!isUuid(conversationId) || !Number.isFinite(seq)) return;
    await markConversationRead(viewer.accountId, conversationId, seq);
  } catch {
    // Lesestand ist eine Komfortfunktion; Fehler werden nicht angezeigt.
  }
}

/* ───────────────────────── Mitteilungen (MSG07, MSG08) ───────────────────────── */

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const viewer = await actionViewer({ allowSuspended: true }).catch(() => null);
  const id = str(formData, "id");
  if (!viewer || !isUuid(id)) return;
  await markNotificationRead(viewer, id);
  refresh();
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true });
    const n = await markAllNotificationsRead(viewer);
    refresh();
    return ok(n === 0 ? "Es gibt keine ungelesenen Hinweise." : "Alle Hinweise sind als gelesen markiert.");
  });
}

export async function updateNotificationPrefsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    quietStart: str(formData, "quietStart"),
    quietEnd: str(formData, "quietEnd"),
    pausedUntil: str(formData, "pausedUntil"),
    emailSocial: formData.get("emailSocial") === "on" ? "on" : "",
    inAppTypes: formData.getAll("inAppTypes").filter((v): v is string => typeof v === "string"),
  };
  return runAction(async () => {
    const viewer = await actionViewer();
    const version = Number(str(formData, "version"));
    await updateNotificationPrefs(viewer, {
      inAppTypes: values.inAppTypes,
      emailSocial: values.emailSocial === "on",
      quietStart: values.quietStart,
      quietEnd: values.quietEnd,
      pausedUntilDate: values.pausedUntil || null,
      version: Number.isInteger(version) ? version : 0,
    });
    refresh();
    return ok("Einstellungen gespeichert.");
  }, values);
}

export async function sendTestNotificationAction(): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    await createTestNotification(viewer);
    refresh();
    return ok("Ein Test-Hinweis ohne Inhaltsvorschau liegt jetzt in deinen Mitteilungen.");
  });
}
