import "server-only";
import { and, eq, gt, isNull, or, sql as dsql } from "drizzle-orm";
import { audit } from "../../audit";
import { type Tx } from "../../db";
import { accounts, mfaFactors, privacyRequests, recoveryCodes, roleAssignments, sessions } from "../../db/schema";
import { enqueue } from "../../outbox";

/**
 * Kontrollierte Wiederherstellung bei Verlust des zweiten Faktors (ACC05, S06):
 * – Anfrage nur nach erfolgreicher Passwort-Anmeldung; die Inhaberin erhält sofort einen Hinweis.
 * – Die Datenschutzstelle prüft die Identität verhältnismässig (keine Ausweiskopie, nie allein
 *   über eine Profilangabe) und dokumentiert das Verfahren als kontrollierten Code plus Ticket.
 * – Für Konten mit Mitarbeitendenrolle gilt das Vieraugenprinzip: Prüfung und Zurücksetzen
 *   erfolgen durch zwei verschiedene Personen. Niemand bearbeitet den eigenen Auftrag.
 */
export const IDENTITY_CHECKS = [
  { value: "email_reply", label: "Rückfrage an die bestätigte E-Mail-Adresse beantwortet" },
  { value: "email_and_call", label: "Rückfrage an die bestätigte E-Mail-Adresse und Rückruf" },
  { value: "in_person", label: "Persönliche Vorsprache bei der Datenschutzstelle" },
] as const;

export type IdentityCheck = (typeof IDENTITY_CHECKS)[number]["value"];

export const identityCheckLabel = (v: string) => IDENTITY_CHECKS.find((c) => c.value === v)?.label ?? null;

/** Ticket-Referenz ohne Freitext im Audit (PRI07). */
export const TICKET_RE = /^[\p{L}\p{N}#\-_.:/]{3,40}$/u;

/** Hat das Zielkonto eine aktive Mitarbeitendenrolle? Dann sind zwei Personen nötig. */
export async function hasActiveStaffRole(tx: Tx, accountId: string): Promise<boolean> {
  const now = new Date();
  const [row] = await tx
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.accountId, accountId),
        isNull(roleAssignments.revokedAt),
        dsql`${roleAssignments.startsAt} <= now()`,
        or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, now)),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Setzt den zweiten Faktor zurück: Geheimnis und Recovery-Codes entfernt, alle Sitzungen
 * widerrufen, Auftrag abgeschlossen, Hinweis an die bestätigte Adresse, Audit mit Ticket.
 * Mitarbeitende müssen MFA vor dem nächsten Verwaltungszugriff neu einrichten (requireStaff).
 */
export async function resetSecondFactor(
  tx: Tx,
  input: { requestId: string; accountId: string; officerId: string; ticket: string },
): Promise<void> {
  const now = new Date();
  await tx.delete(mfaFactors).where(eq(mfaFactors.accountId, input.accountId));
  await tx.delete(recoveryCodes).where(eq(recoveryCodes.accountId, input.accountId));
  await tx
    .update(accounts)
    .set({ mfaEnabled: false, version: dsql`${accounts.version} + 1` })
    .where(eq(accounts.id, input.accountId));
  await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.accountId, input.accountId), isNull(sessions.revokedAt)));
  await tx
    .update(privacyRequests)
    .set({ status: "completed", completedAt: now, handledBy: input.officerId })
    .where(eq(privacyRequests.id, input.requestId));
  await enqueue(
    {
      type: "email.security_notice",
      aggregateType: "account",
      aggregateId: input.accountId,
      payload: { what: "mfa_reset" },
      dedupeKey: `security:mfa_reset:${input.requestId}`,
    },
    tx,
  );
  await audit(
    {
      actorId: input.officerId,
      actorRole: "privacy_officer",
      action: "mfa.reset_after_identity_check",
      objectType: "account",
      objectId: input.accountId,
      ticket: input.ticket,
    },
    tx,
  );
}
