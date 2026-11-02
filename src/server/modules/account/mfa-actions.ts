"use server";

import { and, eq, isNotNull, isNull, sql as dsql } from "drizzle-orm";
import { refresh } from "next/cache";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { generateRecoveryCodes, generateSecret, verifyTotp } from "../../auth/totp";
import { actionViewer, AuthError, hasRecentAuth, type Viewer } from "../../auth/viewer";
import { decrypt, encrypt, sha256 } from "../../crypto";
import { db, type Executor } from "../../db";
import { accounts, mfaFactors, recoveryCodes, sessions } from "../../db/schema";
import { enqueue } from "../../outbox";
import { consume, peek } from "../../rate-limit";

/**
 * Zweiter Faktor (ACC05): TOTP für Mitglieder optional, für Mitarbeitende Pflicht.
 * Geheimnis verschlüsselt, Recovery-Codes nur als SHA-256-Hash, einmalig angezeigt.
 */

async function sensitiveViewer(): Promise<Viewer> {
  const viewer = await actionViewer({ allowSuspended: true, allowNoProfile: true });
  if (!hasRecentAuth(viewer)) throw new AuthError("reauth");
  return viewer;
}

async function replaceRecoveryCodes(accountId: string, tx: Executor): Promise<string[]> {
  const codes = generateRecoveryCodes(10);
  await tx.delete(recoveryCodes).where(eq(recoveryCodes.accountId, accountId));
  // Bei der Prüfung werden Codes kleingeschrieben verglichen (mfaVerifyAction).
  await tx.insert(recoveryCodes).values(codes.map((c) => ({ accountId, codeHash: sha256(c.toLowerCase()) })));
  return codes;
}

function securityNotice(accountId: string, tx: Executor) {
  return enqueue(
    {
      type: "email.security_notice",
      aggregateType: "account",
      aggregateId: accountId,
      payload: { what: "mfa_changed" },
      dedupeKey: `security:mfa:${accountId}:${Date.now()}`,
    },
    tx,
  );
}

/** Schritt 1: neues, noch unbestätigtes Geheimnis anlegen. */
export async function startMfaSetupAction(): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await sensitiveViewer();
    if (viewer.mfaEnabled) throw new UserError("Der zweite Faktor ist bereits eingerichtet.");
    await db.transaction(async (tx) => {
      await tx.delete(mfaFactors).where(and(eq(mfaFactors.accountId, viewer.accountId), isNull(mfaFactors.confirmedAt)));
      await tx.insert(mfaFactors).values({ accountId: viewer.accountId, type: "totp", secretEncrypted: encrypt(generateSecret()) });
    });
    refresh();
    return ok("Schlüssel erstellt. Scanne jetzt den QR-Code.");
  });
}

export async function cancelMfaSetupAction(): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true, allowNoProfile: true });
    await db.delete(mfaFactors).where(and(eq(mfaFactors.accountId, viewer.accountId), isNull(mfaFactors.confirmedAt)));
    refresh();
    return ok("Die Einrichtung wurde abgebrochen.");
  });
}

/** Schritt 2: Code bestätigen → aktivieren, Recovery-Codes einmalig zurückgeben. */
export async function confirmMfaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await sensitiveViewer();
    const failKey = `mfa-setup-fail:${viewer.accountId}`;
    if ((await peek(failKey, 900)) >= 8) return fail("Zu viele Versuche. Bitte warte 15 Minuten.");

    const [pending] = await db
      .select({ id: mfaFactors.id, secretEncrypted: mfaFactors.secretEncrypted })
      .from(mfaFactors)
      .where(and(eq(mfaFactors.accountId, viewer.accountId), isNull(mfaFactors.confirmedAt)))
      .limit(1);
    if (!pending) throw new UserError("Bitte starte die Einrichtung erneut.");

    const step = verifyTotp(decrypt(pending.secretEncrypted), str(formData, "code"));
    if (step === null) {
      await consume(failKey, 1000, 900);
      return fail("Der Code passt nicht. Prüfe die Uhrzeit deines Geräts und gib den aktuellen Code ein.", {
        fieldErrors: { code: "Code ungültig." },
      });
    }

    const now = new Date();
    const codes = await db.transaction(async (tx) => {
      // Ein bestätigter Faktor je Konto
      await tx
        .delete(mfaFactors)
        .where(and(eq(mfaFactors.accountId, viewer.accountId), isNotNull(mfaFactors.confirmedAt)));
      await tx.update(mfaFactors).set({ confirmedAt: now, lastUsedStep: step }).where(eq(mfaFactors.id, pending.id));
      await tx
        .update(accounts)
        .set({ mfaEnabled: true, version: dsql`${accounts.version} + 1` })
        .where(eq(accounts.id, viewer.accountId));
      // Diese Sitzung gilt als mit zweitem Faktor bestätigt; andere Sitzungen müssen ihn eingeben.
      await tx.update(sessions).set({ mfaVerifiedAt: now }).where(eq(sessions.id, viewer.sessionId));
      const generated = await replaceRecoveryCodes(viewer.accountId, tx);
      await securityNotice(viewer.accountId, tx);
      await audit({ actorId: viewer.accountId, action: "mfa.enabled", objectType: "account", objectId: viewer.accountId }, tx);
      return generated;
    });
    // Kein refresh(): die Codes stehen nur in dieser Antwort und werden genau einmal angezeigt.
    return ok("Der zweite Faktor ist eingerichtet.", { data: { codes } });
  });
}

export async function regenerateRecoveryCodesAction(): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await sensitiveViewer();
    if (!viewer.mfaEnabled) throw new UserError("Richte zuerst den zweiten Faktor ein.");
    const codes = await db.transaction(async (tx) => {
      const generated = await replaceRecoveryCodes(viewer.accountId, tx);
      await securityNotice(viewer.accountId, tx);
      await audit({ actorId: viewer.accountId, action: "mfa.recovery_regenerated", objectType: "account", objectId: viewer.accountId }, tx);
      return generated;
    });
    return ok("Neue Wiederherstellungscodes erstellt. Die bisherigen Codes sind ab sofort ungültig.", { data: { codes } });
  });
}

/** Nur für Mitglieder ohne Mitarbeitendenrolle (ACC05: für Mitarbeitende Pflicht). */
export async function disableMfaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await sensitiveViewer();
    if (viewer.isStaff)
      throw new UserError("Für Mitarbeitende ist der zweite Faktor Pflicht. Er kann nur über den geprüften Supportprozess ersetzt werden.");
    if (formData.get("confirm") !== "on")
      return fail("Bitte bestätige, dass du den zweiten Faktor ausschalten möchtest.", {
        fieldErrors: { confirm: "Bestätigung erforderlich." },
      });
    await db.transaction(async (tx) => {
      await tx.delete(mfaFactors).where(eq(mfaFactors.accountId, viewer.accountId));
      await tx.delete(recoveryCodes).where(eq(recoveryCodes.accountId, viewer.accountId));
      await tx
        .update(accounts)
        .set({ mfaEnabled: false, version: dsql`${accounts.version} + 1` })
        .where(eq(accounts.id, viewer.accountId));
      await securityNotice(viewer.accountId, tx);
      await audit({ actorId: viewer.accountId, action: "mfa.disabled", objectType: "account", objectId: viewer.accountId }, tx);
    });
    refresh();
    return ok("Der zweite Faktor ist ausgeschaltet. Du meldest dich künftig nur mit Passwort an.");
  });
}
