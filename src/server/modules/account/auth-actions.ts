"use server";

import { and, desc, eq, isNull, sql as dsql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, ok, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/catalog";
import { runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from "../../auth/password";
import { createSession, destroyCurrentSession, readSessionToken, revokeAllSessions } from "../../auth/session";
import { verifyTotp } from "../../auth/totp";
import { getViewer, safeNext } from "../../auth/viewer";
import { decrypt, encrypt, sha256 } from "../../crypto";
import { db } from "../../db";
import {
  accounts,
  consentRecords,
  emailTokens,
  mfaFactors,
  recoveryCodes,
  sessions,
  userPreferences,
} from "../../db/schema";
import { isEnabled } from "../../flags";
import { enqueue } from "../../outbox";
import { consume, LIMITS, peek } from "../../rate-limit";
import { findValidToken, issueEmailToken } from "./tokens";

async function clientKey() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Bitte gib deine E-Mail-Adresse ein.")
  .max(254, "Die E-Mail-Adresse ist zu lang.")
  .email("Bitte gib eine gültige E-Mail-Adresse ein, z. B. name@beispiel.ch.");

/* ───────────────────────── S02 Registrierung (ACC01) ───────────────────────── */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { email: str(formData, "email") };
  return runAction(async () => {
    if (!(await isEnabled("registration")))
      return fail("Neue Registrierungen sind im Moment pausiert. Wissen und Hilfe bleiben ohne Konto erreichbar.", {
        values,
      });

    const parsed = z
      .object({
        email: emailSchema,
        password: z.string(),
        audience: z.literal("on", { error: "Diese Bestätigung ist für ein Mitgliederkonto erforderlich." }),
        terms: z.literal("on", { error: "Bitte akzeptiere die Nutzungsbedingungen." }),
      })
      .safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        audience: formData.get("audience") ?? undefined,
        terms: formData.get("terms") ?? undefined,
      });
    if (!parsed.success)
      return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });

    const { email, password } = parsed.data;
    const problem = passwordProblem(password, email);
    if (problem) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: { password: problem }, values });

    const existing = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(dsql`lower(${accounts.email}) = ${email}`)
      .limit(1);

    // Neutrale Rückmeldung, ohne Kontoexistenz offenzulegen (F01).
    if (existing.length > 0) {
      await burnPasswordCheck(password);
      redirect("/email-bestaetigen?status=gesendet");
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const accountId = await db.transaction(async (tx) => {
      const [acc] = await tx
        .insert(accounts)
        .values({ email, passwordHash, status: "unverified", audienceConfirmedAt: now, termsVersion: TERMS_VERSION })
        .returning({ id: accounts.id });
      await tx.insert(userPreferences).values({ accountId: acc.id });
      await tx.insert(consentRecords).values([
        { accountId: acc.id, purpose: "terms", textVersion: TERMS_VERSION, decision: "granted", decidedAt: now },
        { accountId: acc.id, purpose: "privacy_notice", textVersion: PRIVACY_VERSION, decision: "granted", decidedAt: now },
      ]);
      await issueEmailToken({ accountId: acc.id, purpose: "verify_email", sendTo: email }, tx);
      return acc.id;
    });
    await createSession(accountId);
    redirect("/email-bestaetigen?status=gesendet");
  }, values);
}

/* ───────────────────────── S03 E-Mail bestätigen (ACC02) ───────────────────────── */
export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const token = str(formData, "token");
    const row = (await findValidToken(token, "verify_email")) ?? (await findValidToken(token, "change_email"));
    if (!row)
      return fail("Dieser Link ist abgelaufen oder wurde bereits verwendet. Fordere bitte einen neuen Link an.", {
        data: { invalid: true },
      });

    await db.transaction(async (tx) => {
      const used = await tx
        .update(emailTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(emailTokens.id, row.id), isNull(emailTokens.usedAt)))
        .returning({ id: emailTokens.id });
      if (used.length === 0) throw new UserError("Dieser Link wurde bereits verwendet.");

      if (row.purpose === "change_email" && row.newEmail) {
        const [acc] = await tx.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, row.accountId));
        await tx
          .update(accounts)
          .set({ email: row.newEmail, emailVerifiedAt: new Date(), version: dsql`${accounts.version} + 1` })
          .where(eq(accounts.id, row.accountId));
        // Alte Adresse erhält einen neutralen Sicherheitshinweis (ACC07).
        await enqueue(
          {
            type: "email.security_notice",
            aggregateType: "account",
            aggregateId: row.accountId,
            payload: { what: "email_changed", toEncrypted: encrypt(acc.email) },
            dedupeKey: `security:email_changed:${row.id}`,
          },
          tx,
        );
      } else {
        await tx
          .update(accounts)
          .set({
            emailVerifiedAt: new Date(),
            status: dsql`case when ${accounts.status} = 'unverified' then 'active'::identity.account_status else ${accounts.status} end`,
          })
          .where(eq(accounts.id, row.accountId));
      }
      await audit({ actorId: row.accountId, action: `account.${row.purpose}.confirmed`, objectType: "account", objectId: row.accountId }, tx);
    });

    const viewer = await getViewer();
    if (viewer && viewer.accountId === row.accountId) redirect(row.purpose === "change_email" ? "/konto?email=geaendert" : "/willkommen");
    redirect("/anmelden?status=bestaetigt");
  });
}

export async function resendVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await getViewer();
    let target: { id: string; email: string } | undefined;
    if (viewer && !viewer.verified) {
      [target] = await db.select({ id: accounts.id, email: accounts.email }).from(accounts).where(eq(accounts.id, viewer.accountId));
    } else {
      const email = emailSchema.safeParse(formData.get("email"));
      if (!email.success) return fail("Bitte gib eine gültige E-Mail-Adresse ein.", { fieldErrors: { email: email.error.issues[0].message } });
      [target] = await db
        .select({ id: accounts.id, email: accounts.email })
        .from(accounts)
        .where(and(dsql`lower(${accounts.email}) = ${email.data}`, isNull(accounts.emailVerifiedAt)));
    }
    const neutral = ok("Falls ein unbestätigtes Konto zu dieser Adresse besteht, haben wir einen neuen Link gesendet.");
    if (!target) return neutral;
    const allowed = await consume(`verify-resend:${sha256(target.email.toLowerCase())}`, LIMITS.verificationResend.limit, LIMITS.verificationResend.window);
    if (!allowed) return fail("Du hast in der letzten Stunde bereits drei Links angefordert. Bitte versuche es später erneut.");
    await issueEmailToken({ accountId: target.id, purpose: "verify_email", sendTo: target.email });
    return neutral;
  });
}

/* ───────────────────────── S04 Login (ACC03) ───────────────────────── */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { email: str(formData, "email") };
  return runAction(async () => {
    const email = values.email.toLowerCase();
    const password = String(formData.get("password") ?? "");
    const next = safeNext(str(formData, "next"));
    if (!email || !password)
      return fail("Bitte gib E-Mail-Adresse und Passwort ein.", {
        fieldErrors: { ...(email ? {} : { email: "Bitte gib deine E-Mail-Adresse ein." }), ...(password ? {} : { password: "Bitte gib dein Passwort ein." }) },
        values,
      });

    const throttleKey = `login-fail:${sha256(email)}`;
    const ipKey = `login-fail-ip:${await clientKey()}`;
    if ((await peek(throttleKey, LIMITS.loginFailures.window)) >= LIMITS.loginFailures.limit || (await peek(ipKey, LIMITS.loginFailures.window)) >= 50) {
      return fail("Zu viele Anmeldeversuche. Bitte warte 15 Minuten oder setze dein Passwort zurück.", { values });
    }

    const [acc] = await db
      .select({ id: accounts.id, passwordHash: accounts.passwordHash, status: accounts.status, mfaEnabled: accounts.mfaEnabled })
      .from(accounts)
      .where(dsql`lower(${accounts.email}) = ${email}`)
      .limit(1);

    const valid = acc ? await verifyPassword(acc.passwordHash, password) : (await burnPasswordCheck(password), false);
    if (!acc || !valid || acc.status === "deleted" || acc.status === "deletion_pending") {
      await consume(throttleKey, 1000, LIMITS.loginFailures.window);
      await consume(ipKey, 1000, LIMITS.loginFailures.window);
      return fail("E-Mail-Adresse oder Passwort stimmen nicht.", { values });
    }

    await createSession(acc.id);
    await audit({ actorId: acc.id, action: "auth.login", objectType: "account", objectId: acc.id });
    if (acc.mfaEnabled) redirect(`/anmelden/mfa?next=${encodeURIComponent(next)}`);
    redirect(next);
  }, values);
}

/* ───────────────────────── S06 Zweiter Faktor (ACC05) ───────────────────────── */
export async function mfaVerifyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const token = await readSessionToken();
    const viewer = await getViewer();
    if (!token || !viewer) redirect("/anmelden");
    const next = safeNext(str(formData, "next"));
    const code = str(formData, "code").replace(/\s/g, "");
    const mode = str(formData, "mode");
    const failKey = `mfa-fail:${viewer.accountId}`;
    if ((await peek(failKey, 900)) >= 8) return fail("Zu viele Versuche. Bitte warte 15 Minuten.");

    let okCode = false;
    if (mode === "recovery") {
      const normalized = code.toLowerCase();
      const used = await db
        .update(recoveryCodes)
        .set({ usedAt: new Date() })
        .where(and(eq(recoveryCodes.accountId, viewer.accountId), eq(recoveryCodes.codeHash, sha256(normalized)), isNull(recoveryCodes.usedAt)))
        .returning({ id: recoveryCodes.id });
      okCode = used.length > 0;
      if (okCode) await audit({ actorId: viewer.accountId, action: "auth.recovery_code_used", objectType: "account", objectId: viewer.accountId });
    } else {
      const [factor] = await db
        .select()
        .from(mfaFactors)
        .where(and(eq(mfaFactors.accountId, viewer.accountId), dsql`${mfaFactors.confirmedAt} is not null`))
        .orderBy(desc(mfaFactors.createdAt))
        .limit(1);
      if (factor) {
        const step = verifyTotp(decrypt(factor.secretEncrypted), code, factor.lastUsedStep);
        if (step !== null) {
          okCode = true;
          await db.update(mfaFactors).set({ lastUsedStep: step }).where(eq(mfaFactors.id, factor.id));
        }
      }
    }
    if (!okCode) {
      await consume(failKey, 1000, 900);
      return fail("Der Code ist nicht gültig. Bitte prüfe ihn und versuche es erneut.", { fieldErrors: { code: "Code ungültig oder bereits verwendet." } });
    }
    await db.update(sessions).set({ mfaVerifiedAt: new Date(), reauthAt: new Date() }).where(eq(sessions.tokenHash, sha256(token)));
    redirect(next);
  });
}

/* ───────────────────────── Abmelden (ACC03) ───────────────────────── */
export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/?abgemeldet=1");
}

export async function keepAliveAction(): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  return { ok: Boolean(viewer) };
}

/* ───────────────────────── S05 Passwort zurücksetzen (ACC04) ───────────────────────── */
export async function requestResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { email: str(formData, "email") };
  return runAction(async () => {
    const email = emailSchema.safeParse(formData.get("email"));
    if (!email.success) return fail("Bitte gib eine gültige E-Mail-Adresse ein.", { fieldErrors: { email: email.error.issues[0].message }, values });
    const neutral = ok("Falls ein Konto zu dieser Adresse besteht, erhältst du in wenigen Minuten einen Link. Er ist 30 Minuten gültig.");
    const allowed = await consume(`reset:${sha256(email.data)}`, LIMITS.passwordReset.limit, LIMITS.passwordReset.window);
    const ipAllowed = await consume(`reset-ip:${await clientKey()}`, 20, 3600);
    if (!allowed || !ipAllowed) return neutral;
    const [acc] = await db
      .select({ id: accounts.id, email: accounts.email, status: accounts.status })
      .from(accounts)
      .where(dsql`lower(${accounts.email}) = ${email.data}`);
    if (acc && acc.status !== "deleted" && acc.status !== "deletion_pending") {
      await issueEmailToken({ accountId: acc.id, purpose: "reset_password", sendTo: acc.email });
    }
    return neutral;
  }, values);
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const token = str(formData, "token");
    const password = String(formData.get("password") ?? "");
    const row = await findValidToken(token, "reset_password");
    if (!row) return fail("Dieser Link ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen an.", { data: { invalid: true } });
    const [acc] = await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, row.accountId));
    const problem = passwordProblem(password, acc?.email);
    if (problem) return fail("Bitte prüfe das neue Passwort.", { fieldErrors: { password: problem } });
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const used = await tx
        .update(emailTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(emailTokens.id, row.id), isNull(emailTokens.usedAt)))
        .returning({ id: emailTokens.id });
      if (used.length === 0) throw new UserError("Dieser Link wurde bereits verwendet.");
      await tx
        .update(accounts)
        .set({ passwordHash, emailVerifiedAt: dsql`coalesce(${accounts.emailVerifiedAt}, now())`, version: dsql`${accounts.version} + 1` })
        .where(eq(accounts.id, row.accountId));
      await enqueue(
        { type: "email.security_notice", aggregateType: "account", aggregateId: row.accountId, payload: { what: "password_changed" }, dedupeKey: `security:pw:${row.id}` },
        tx,
      );
      await audit({ actorId: row.accountId, action: "auth.password_reset", objectType: "account", objectId: row.accountId }, tx);
    });
    // Erfolg widerruft alle Sitzungen (ACC04).
    await revokeAllSessions(row.accountId);
    await destroyCurrentSession();
    redirect("/anmelden?status=passwort");
  });
}

/* ───────────────────────── Erneute Authentifizierung (ACC07, PRI03–05) ───────────────────────── */
export async function reauthAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await getViewer();
    const token = await readSessionToken();
    if (!viewer || !token) redirect("/anmelden");
    const next = safeNext(str(formData, "next"), "/konto");
    const password = String(formData.get("password") ?? "");
    const failKey = `reauth-fail:${viewer.accountId}`;
    if ((await peek(failKey, 900)) >= 8) return fail("Zu viele Versuche. Bitte warte 15 Minuten.");
    const [acc] = await db.select({ passwordHash: accounts.passwordHash }).from(accounts).where(eq(accounts.id, viewer.accountId));
    if (!acc || !(await verifyPassword(acc.passwordHash, password))) {
      await consume(failKey, 1000, 900);
      return fail("Das Passwort stimmt nicht.", { fieldErrors: { password: "Das Passwort stimmt nicht." } });
    }
    if (viewer.mfaEnabled) {
      const code = str(formData, "code");
      const [factor] = await db
        .select()
        .from(mfaFactors)
        .where(and(eq(mfaFactors.accountId, viewer.accountId), dsql`${mfaFactors.confirmedAt} is not null`))
        .orderBy(desc(mfaFactors.createdAt))
        .limit(1);
      const step = factor ? verifyTotp(decrypt(factor.secretEncrypted), code, factor.lastUsedStep) : null;
      if (step === null) {
        await consume(failKey, 1000, 900);
        return fail("Der Code aus deiner Authenticator-App ist nicht gültig.", { fieldErrors: { code: "Code ungültig." } });
      }
      await db.update(mfaFactors).set({ lastUsedStep: step }).where(eq(mfaFactors.id, factor!.id));
    }
    await db.update(sessions).set({ reauthAt: new Date() }).where(eq(sessions.tokenHash, sha256(token)));
    redirect(next);
  });
}
