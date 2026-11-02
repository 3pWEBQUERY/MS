"use server";

import { and, eq, isNull, sql as dsql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { hashPassword, passwordProblem } from "../../auth/password";
import { revokeAllSessions } from "../../auth/session";
import { actionViewer, AuthError, hasRecentAuth } from "../../auth/viewer";
import { db } from "../../db";
import { accounts, sessions, userPreferences } from "../../db/schema";
import { enqueue } from "../../outbox";
import { consume } from "../../rate-limit";
import { issueEmailToken } from "./tokens";

/* ───────────────────────── E-Mail ändern (ACC07) ───────────────────────── */
export async function changeEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { email: str(formData, "email") };
  return runAction(async () => {
    const viewer = await actionViewer();
    if (!hasRecentAuth(viewer)) throw new AuthError("reauth");

    const parsed = z
      .string()
      .trim()
      .toLowerCase()
      .max(254, "Die E-Mail-Adresse ist zu lang.")
      .email("Bitte gib eine gültige E-Mail-Adresse ein, z. B. name@beispiel.ch.")
      .safeParse(values.email);
    if (!parsed.success)
      return fail("Bitte prüfe die neue E-Mail-Adresse.", { fieldErrors: { email: parsed.error.issues[0].message }, values });
    const newEmail = parsed.data;

    const [me] = await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, viewer.accountId));
    if (!me) throw new AuthError("unauthenticated");
    if (me.email.toLowerCase() === newEmail)
      return fail("Das ist bereits deine aktuelle E-Mail-Adresse.", { fieldErrors: { email: "Bitte gib eine andere Adresse ein." }, values });

    if (!(await consume(`email-change:${viewer.accountId}`, 3, 3600)))
      return fail("Du hast in der letzten Stunde bereits drei Änderungen angefordert. Bitte versuche es später erneut.", { values });

    // Neutralität: Ob die Adresse bereits vergeben ist, wird nicht offengelegt (F01, ACC07).
    const [taken] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(dsql`lower(${accounts.email}) = ${newEmail}`)
      .limit(1);
    if (!taken) {
      await db.transaction(async (tx) => {
        await issueEmailToken({ accountId: viewer.accountId, purpose: "change_email", sendTo: newEmail, newEmail }, tx);
        await audit({ actorId: viewer.accountId, action: "account.change_email.requested", objectType: "account", objectId: viewer.accountId }, tx);
      });
    }
    return ok(
      "Falls die Adresse verwendet werden kann, haben wir einen Bestätigungslink an sie gesendet. Erst nach der Bestätigung wird sie ausgetauscht – bis dahin gilt deine bisherige Adresse.",
    );
  }, values);
}

/* ───────────────────────── Passwort ändern (ACC07, ACC04) ───────────────────────── */
export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    if (!hasRecentAuth(viewer)) throw new AuthError("reauth");
    const password = String(formData.get("newPassword") ?? "");
    const repeat = String(formData.get("repeatPassword") ?? "");

    const [me] = await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, viewer.accountId));
    if (!me) throw new AuthError("unauthenticated");
    const problem = passwordProblem(password, me.email);
    if (problem) return fail("Bitte prüfe das neue Passwort.", { fieldErrors: { newPassword: problem } });
    if (password !== repeat)
      return fail("Die beiden Eingaben stimmen nicht überein.", { fieldErrors: { repeatPassword: "Bitte wiederhole das neue Passwort genau." } });
    if (!(await consume(`password-change:${viewer.accountId}`, 5, 3600)))
      return fail("Bitte warte etwas, bevor du dein Passwort erneut änderst.");

    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({ passwordHash, version: dsql`${accounts.version} + 1` })
        .where(eq(accounts.id, viewer.accountId));
      await enqueue(
        {
          type: "email.security_notice",
          aggregateType: "account",
          aggregateId: viewer.accountId,
          payload: { what: "password_changed" },
          dedupeKey: `security:pw-change:${viewer.accountId}:${Date.now()}`,
        },
        tx,
      );
      await audit({ actorId: viewer.accountId, action: "account.password_changed", objectType: "account", objectId: viewer.accountId }, tx);
    });
    // Andere Sitzungen widerrufen; diese Sitzung bleibt angemeldet.
    const revoked = await revokeAllSessions(viewer.accountId, viewer.sessionId);
    refresh();
    return ok(
      revoked > 0
        ? `Passwort geändert. ${revoked === 1 ? "Eine andere Sitzung wurde" : `${revoked} andere Sitzungen wurden`} abgemeldet.`
        : "Passwort geändert.",
    );
  });
}

/* ───────────────────────── Sitzungen (ACC07) ───────────────────────── */
export async function revokeSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true });
    const id = z.uuid().safeParse(str(formData, "sessionId"));
    if (!id.success) throw new UserError("Diese Sitzung wurde nicht gefunden.");
    if (id.data === viewer.sessionId) throw new UserError("Diese Sitzung beendest du über «Abmelden».");
    // Nur eigene Sitzungen; der Widerruf greift beim nächsten Zugriff (getViewer prüft revoked_at).
    const rows = await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, id.data), eq(sessions.accountId, viewer.accountId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    if (rows.length === 0) throw new UserError("Diese Sitzung ist bereits beendet.");
    await audit({ actorId: viewer.accountId, action: "session.revoked", objectType: "session", objectId: id.data });
    refresh();
    return ok("Die Sitzung wurde beendet. Das Gerät wird beim nächsten Zugriff abgemeldet.");
  });
}

export async function revokeOtherSessionsAction(_prev: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true });
    const count = await revokeAllSessions(viewer.accountId, viewer.sessionId);
    await audit({ actorId: viewer.accountId, action: "session.revoked_others", objectType: "account", objectId: viewer.accountId });
    refresh();
    return ok(
      count === 0
        ? "Es gab keine anderen aktiven Sitzungen."
        : `${count === 1 ? "Eine andere Sitzung wurde" : `${count} andere Sitzungen wurden`} beendet.`,
    );
  });
}

/* ───────────────────────── S13 Anzeige (HOM06) ───────────────────────── */
const displaySchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  textScale: z.union([z.literal(100), z.literal(112), z.literal(125), z.literal(150)]),
  motion: z.enum(["system", "reduce", "allow"]),
  simple: z.boolean(),
});

export type DisplayInput = z.infer<typeof displaySchema>;

/** Speichert Anzeigepräferenzen geräteübergreifend für Mitglieder. Nicht sensibel. */
export async function saveDisplayPrefsAction(input: DisplayInput): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true, allowNoProfile: true, allowUnverified: true });
    const parsed = displaySchema.safeParse(input);
    if (!parsed.success) throw new UserError("Diese Einstellung ist nicht verfügbar.");
    const p = parsed.data;
    const set = { theme: p.theme, textScale: p.textScale, motion: p.motion, simpleView: p.simple };
    await db
      .insert(userPreferences)
      .values({ accountId: viewer.accountId, ...set })
      .onConflictDoUpdate({
        target: userPreferences.accountId,
        set: { ...set, version: dsql`${userPreferences.version} + 1` },
      });
    return ok("Gespeichert – gilt auf allen deinen Geräten.");
  });
}
