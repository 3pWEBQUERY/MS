import "server-only";
import { and, desc, eq, gt, isNull, lt, sql as dsql } from "drizzle-orm";
import { audit } from "../../audit";
import { db, type Executor } from "../../db";
import { invitations } from "../../db/schema";

/**
 * Begrenzte Einladung (PRD 17 «Rollout und Stoppkriterien», D06): Ist der Schalter
 * «registration_invite_only» eingeschaltet, verlangt S02 einen gültigen Einladungscode.
 * Codes sind gehasht, befristet und kontingentiert; Einlösungen werden nur gezählt –
 * ohne Verknüpfung zum neuen Konto.
 */

/** Versuche mit Einladungscodes je Verbindung (Schutz gegen Durchprobieren). */
export const INVITE_ATTEMPTS = { limit: 20, window: 3600 } as const;

/** Neutrale Meldung für unbekannte, abgelaufene, widerrufene oder ausgeschöpfte Codes. */
export const INVITE_INVALID =
  "Dieser Einladungscode ist nicht gültig. Bitte prüfe die Schreibweise oder wende dich an die Stelle, die dich eingeladen hat.";

export const INVITE_VALIDITY_DAYS = [7, 14, 30, 60, 90] as const;
export const INVITE_MAX_USES = [1, 5, 10, 25, 50, 100] as const;

/**
 * Löst einen Code atomar ein: eine einzige bedingte Aktualisierung, damit gleichzeitige
 * Registrierungen das Kontingent nie überschreiten. Gibt die Einladungs-ID oder null zurück.
 */
export async function redeemInvitation(codeHash: string, executor: Executor = db): Promise<string | null> {
  const now = new Date();
  const [row] = await executor
    .update(invitations)
    .set({ usedCount: dsql`${invitations.usedCount} + 1`, lastRedeemedAt: now })
    .where(
      and(
        eq(invitations.codeHash, codeHash),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, now),
        lt(invitations.usedCount, invitations.maxUses),
      ),
    )
    .returning({ id: invitations.id });
  if (!row) return null;
  // Audit ohne Konto: die Einlösung wird gezählt, aber nicht einer Person zugeordnet.
  await audit({ actorId: null, action: "invitation.redeemed", objectType: "invitation", objectId: row.id }, executor);
  return row.id;
}

export type InvitationStatus = "active" | "expired" | "exhausted" | "revoked";

export type InvitationRow = {
  id: string;
  purpose: string;
  codeHint: string;
  maxUses: number;
  usedCount: number;
  expiresAt: Date;
  createdAt: Date;
  lastRedeemedAt: Date | null;
  revokedAt: Date | null;
  status: InvitationStatus;
};

export function invitationStatus(r: Pick<InvitationRow, "revokedAt" | "usedCount" | "maxUses" | "expiresAt">, now = new Date()): InvitationStatus {
  if (r.revokedAt) return "revoked";
  if (r.usedCount >= r.maxUses) return "exhausted";
  if (r.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

/** S60 Einladungen: neueste zuerst, Cursor über den Erstellungszeitpunkt (20 je Seite). */
export async function listInvitations(cursor: Date | null, limit = 20): Promise<{ items: InvitationRow[]; next: string | null }> {
  const rows = await db
    .select({
      id: invitations.id,
      purpose: invitations.purpose,
      codeHint: invitations.codeHint,
      maxUses: invitations.maxUses,
      usedCount: invitations.usedCount,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      lastRedeemedAt: invitations.lastRedeemedAt,
      revokedAt: invitations.revokedAt,
    })
    .from(invitations)
    .where(cursor ? lt(invitations.createdAt, cursor) : undefined)
    .orderBy(desc(invitations.createdAt))
    .limit(limit + 1);
  const now = new Date();
  const items = rows.slice(0, limit).map((r) => ({ ...r, status: invitationStatus(r, now) }));
  const next = rows.length > limit ? items.at(-1)!.createdAt.toISOString() : null;
  return { items, next };
}

/** Kennzahlen ohne Personenbezug: aktive Codes, freie Plätze, Einlösungen der letzten 30 Tage. */
export async function invitationSummary(): Promise<{ active: number; openSeats: number; redeemed30d: number }> {
  const [r] = (await db.execute(dsql`
    select
      count(*) filter (where revoked_at is null and expires_at > now() and used_count < max_uses)::int as active,
      coalesce(sum(max_uses - used_count) filter (where revoked_at is null and expires_at > now()), 0)::int as open_seats,
      (select count(*)::int from ops.audit_events where action = 'invitation.redeemed' and occurred_at > now() - interval '30 days') as redeemed_30d
    from identity.invitations`)) as unknown as { active: number; open_seats: number; redeemed_30d: number }[];
  return { active: Number(r?.active ?? 0), openSeats: Number(r?.open_seats ?? 0), redeemed30d: Number(r?.redeemed_30d ?? 0) };
}
