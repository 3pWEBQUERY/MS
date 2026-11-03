"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff, AuthError, getViewer, hasRecentAuth } from "../../auth/viewer";
import { receiptNumber } from "../../crypto";
import { db } from "../../db";
import { accounts, privacyRequests } from "../../db/schema";
import { enqueue } from "../../outbox";
import { consume } from "../../rate-limit";
import { hasActiveStaffRole, identityCheckLabel, resetSecondFactor, TICKET_RE } from "./mfa-recovery";
import { dueDate, IDENTITY_METHODS } from "./requests";

/* ───────────────────────── S06: Wiederherstellung anfordern (Mitglied) ───────────────────────── */

/**
 * Nur in einer Sitzung, die das Passwort soeben bestätigt hat, aber den zweiten Faktor nicht
 * vorweisen kann. Es wird nichts geändert – die Datenschutzstelle prüft zuerst die Identität.
 */
export async function requestMfaRecoveryAction(): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new AuthError("unauthenticated");
    if (!viewer.mfaEnabled) throw new UserError("Für dein Konto ist kein zweiter Faktor eingerichtet.");
    if (viewer.mfaVerified) throw new UserError("Du bist bereits bestätigt. Neue Wiederherstellungscodes erstellst du unter «Sicherheit».");
    if (!hasRecentAuth(viewer)) throw new AuthError("unauthenticated");

    const [open] = await db
      .select({ receipt: privacyRequests.receiptNumber })
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.accountId, viewer.accountId),
          eq(privacyRequests.type, "mfa_recovery"),
          inArray(privacyRequests.status, ["requested", "verified"]),
        ),
      )
      .limit(1);
    if (open) return ok(`Deine Anfrage ist bereits in Bearbeitung (Beleg ${open.receipt}). Die Datenschutzstelle meldet sich per E-Mail.`);
    if (!(await consume(`mfa-recovery:${viewer.accountId}`, 3, 86400)))
      return fail("Du hast heute bereits mehrere Anfragen gestellt. Bitte versuche es morgen erneut.");

    const receipt = receiptNumber("A");
    await db.transaction(async (tx) => {
      const [req] = await tx
        .insert(privacyRequests)
        .values({
          accountId: viewer.accountId,
          receiptNumber: receipt,
          type: "mfa_recovery",
          status: "requested",
          identityMethod: IDENTITY_METHODS.mfa_pending,
          dueAt: dueDate(),
        })
        .returning({ id: privacyRequests.id });
      // Die Inhaberin wird sofort informiert – falls jemand anderes ihr Passwort kennt (ACC05).
      await enqueue(
        {
          type: "email.security_notice",
          aggregateType: "account",
          aggregateId: viewer.accountId,
          payload: { what: "mfa_recovery_requested" },
          dedupeKey: `security:mfa_recovery_requested:${req.id}`,
        },
        tx,
      );
      await audit({ actorId: viewer.accountId, action: "mfa.recovery_requested", objectType: "privacy_request", objectId: req.id }, tx);
    });
    return ok(
      `Deine Anfrage ist eingegangen (Beleg ${receipt}). Die Datenschutzstelle meldet sich über deine bestätigte E-Mail-Adresse und prüft deine Identität – ohne Ausweiskopie. Erst danach wird der zweite Faktor zurückgesetzt; dabei werden alle Sitzungen beendet.`,
    );
  });
}

/* ───────────────────────── S58: Prüfen, zurücksetzen oder ablehnen (Datenschutzstelle) ───────────────────────── */

export async function decideMfaRecoveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { check: str(formData, "check"), ticket: str(formData, "ticket") };
  return runAction(async () => {
    const officer = await actionStaff(["privacy_officer"]);
    const id = z.uuid().safeParse(str(formData, "requestId"));
    if (!id.success) throw new UserError("Dieser Auftrag wurde nicht gefunden.");
    const decision = str(formData, "decision");
    if (decision !== "verify" && decision !== "reset" && decision !== "reject") throw new UserError("Diese Entscheidung ist nicht möglich.");

    const fe: Record<string, string> = {};
    if (!TICKET_RE.test(values.ticket)) fe.ticket = "Ticket-Referenz: 3–40 Zeichen, ohne Leerzeichen (z. B. DS-2026-014).";
    const checkLabel = identityCheckLabel(values.check);
    if (decision === "verify" && !checkLabel) fe.check = "Bitte wähle das Prüfverfahren.";
    if (decision !== "reject" && formData.get("confirm") !== "on") fe.confirm = "Bitte bestätige die Prüfung.";
    if (Object.keys(fe).length > 0) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });

    const message = await db.transaction(async (tx) => {
      const [req] = await tx
        .select({ id: privacyRequests.id, accountId: privacyRequests.accountId, status: privacyRequests.status, handledBy: privacyRequests.handledBy, type: privacyRequests.type })
        .from(privacyRequests)
        .where(eq(privacyRequests.id, id.data))
        .for("update");
      if (!req || req.type !== "mfa_recovery" || !req.accountId) throw new UserError("Dieser Auftrag wurde nicht gefunden.");
      // Keine Bearbeitung eigener Aufträge (PRD 03)
      if (req.accountId === officer.accountId) throw new UserError("Eigene Aufträge bearbeitet eine andere Person der Datenschutzstelle.");
      const [target] = await tx.select({ status: accounts.status }).from(accounts).where(eq(accounts.id, req.accountId));
      if (!target || target.status === "deleted" || target.status === "deletion_pending")
        throw new UserError("Das Konto ist nicht mehr aktiv. Der Auftrag kann nur abgelehnt werden.");

      if (decision === "reject") {
        if (req.status !== "requested" && req.status !== "verified") throw new UserError("Dieser Auftrag ist bereits abgeschlossen.");
        await tx
          .update(privacyRequests)
          .set({ status: "rejected", completedAt: new Date(), handledBy: officer.accountId })
          .where(eq(privacyRequests.id, req.id));
        await audit({ actorId: officer.accountId, actorRole: "privacy_officer", action: "mfa.recovery_rejected", objectType: "privacy_request", objectId: req.id, ticket: values.ticket }, tx);
        return "Die Anfrage wurde abgelehnt. Der zweite Faktor bleibt unverändert.";
      }

      const staffTarget = await hasActiveStaffRole(tx, req.accountId);
      if (decision === "verify") {
        if (req.status !== "requested") throw new UserError("Die Identität wurde bereits geprüft.");
        if (!staffTarget) {
          await tx.update(privacyRequests).set({ identityMethod: checkLabel! }).where(eq(privacyRequests.id, req.id));
          await resetSecondFactor(tx, { requestId: req.id, accountId: req.accountId, officerId: officer.accountId, ticket: values.ticket });
          return "Identität geprüft und zweiter Faktor zurückgesetzt. Alle Sitzungen des Kontos wurden beendet.";
        }
        await tx
          .update(privacyRequests)
          .set({ status: "verified", identityMethod: checkLabel!, handledBy: officer.accountId })
          .where(eq(privacyRequests.id, req.id));
        await audit({ actorId: officer.accountId, actorRole: "privacy_officer", action: "mfa.recovery_identity_verified", objectType: "privacy_request", objectId: req.id, ticket: values.ticket }, tx);
        return "Identität geprüft. Weil das Konto eine Mitarbeitendenrolle hat, setzt eine zweite Person der Datenschutzstelle den Faktor zurück.";
      }

      // decision === "reset": zweite Freigabe für Mitarbeitendenkonten
      if (req.status !== "verified") throw new UserError("Bitte prüfe zuerst die Identität.");
      if (req.handledBy === officer.accountId) throw new UserError("Die zweite Freigabe muss eine andere Person erteilen (Vieraugenprinzip).");
      await resetSecondFactor(tx, { requestId: req.id, accountId: req.accountId, officerId: officer.accountId, ticket: values.ticket });
      return "Zweiter Faktor zurückgesetzt. Die Person richtet ihn vor dem nächsten Verwaltungszugriff neu ein.";
    });
    refresh();
    return ok(message);
  }, values);
}
