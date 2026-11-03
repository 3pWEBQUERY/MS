"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { invitations } from "../../db/schema";
import { consume } from "../../rate-limit";
import { generateInviteCode, inviteCodeHash, inviteCodeHint, normalizeInviteCode } from "../account/invite-code";
import { INVITE_MAX_USES, INVITE_VALIDITY_DAYS } from "../account/invitations";
import { actorRoleFor, isUuid } from "./common";
import { OPS_ROLES } from "./ops";

/**
 * S60 Einladungen (PRD 17 «begrenzte Einladung», D06): Codes erzeugen und widerrufen.
 * Nur Betrieb und Administration mit MFA (actionStaff). Der Klartext wird genau einmal in der
 * Antwort zurückgegeben und nirgends gespeichert oder protokolliert.
 */

/** Zweck ohne Personendaten: keine E-Mail-Adressen, keine Telefonnummern. */
function purposeProblem(v: string): string | null {
  if (v.length < 3) return "Bitte beschreibe den Zweck in mindestens 3 Zeichen, z. B. «Pilot Gruppe Bern».";
  if (v.length > 80) return "Höchstens 80 Zeichen.";
  if (/@/.test(v) || /\d[\d\s/.-]{6,}\d/.test(v)) return "Bitte keine E-Mail-Adressen, Telefonnummern oder anderen Personendaten.";
  return null;
}

export async function createInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { purpose: str(formData, "purpose"), maxUses: str(formData, "maxUses"), days: str(formData, "days") };
  return runAction(async () => {
    const viewer = await actionStaff([...OPS_ROLES]);
    const purpose = cleanText(values.purpose).replace(/\s+/g, " ").trim();
    const maxUses = Number(values.maxUses);
    const days = Number(values.days);
    const fe: Record<string, string> = {};
    const problem = purposeProblem(purpose);
    if (problem) fe.purpose = problem;
    if (!(INVITE_MAX_USES as readonly number[]).includes(maxUses)) fe.maxUses = "Bitte wähle ein Kontingent.";
    if (!(INVITE_VALIDITY_DAYS as readonly number[]).includes(days)) fe.days = "Bitte wähle eine Gültigkeit.";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });
    if (!(await consume(`invite-create:${viewer.accountId}`, 30, 3600)))
      return fail("Du hast in der letzten Stunde bereits viele Codes erzeugt. Bitte warte etwas.", { values });

    const code = generateInviteCode();
    const normalized = normalizeInviteCode(code)!;
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(invitations)
        .values({
          codeHash: inviteCodeHash(normalized),
          codeHint: inviteCodeHint(normalized),
          purpose,
          maxUses,
          expiresAt,
          createdBy: viewer.accountId,
        })
        .returning({ id: invitations.id });
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: actorRoleFor(viewer, ["ops", "admin"]),
          action: "invitation.created",
          objectType: "invitation",
          objectId: row.id,
          ticket: String(maxUses),
        },
        tx,
      );
    });
    refresh();
    return ok("Einladungscode erzeugt. Er wird nur jetzt angezeigt – bitte sicher weitergeben.", {
      data: { code, maxUses, expiresAt: expiresAt.toISOString() },
    });
  }, values);
}

export async function revokeInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff([...OPS_ROLES]);
    const id = str(formData, "invitationId");
    if (!isUuid(id)) return fail("Dieser Code ist nicht verfügbar.");
    const done = await db.transaction(async (tx) => {
      const rows = await tx
        .update(invitations)
        .set({ revokedAt: new Date(), revokedBy: viewer.accountId })
        .where(and(eq(invitations.id, id), isNull(invitations.revokedAt)))
        .returning({ id: invitations.id });
      if (rows.length === 0) return false;
      await audit(
        { actorId: viewer.accountId, actorRole: actorRoleFor(viewer, ["ops", "admin"]), action: "invitation.revoked", objectType: "invitation", objectId: id },
        tx,
      );
      return true;
    });
    if (!done) return fail("Dieser Code ist bereits widerrufen.");
    refresh();
    return ok("Code widerrufen. Er kann ab sofort nicht mehr eingelöst werden.");
  });
}
