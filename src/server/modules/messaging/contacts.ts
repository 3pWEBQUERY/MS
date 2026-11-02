import "server-only";
import { and, count, desc, eq, gt, inArray, isNull, ne, or, sql as dsql } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { UserError } from "@/server/action";
import { db, type Tx } from "@/server/db";
import {
  communityProfiles,
  contactRelationships,
  conversations,
  notifications,
} from "@/server/db/schema";
import { notify } from "./notify";
import {
  accountsUsable,
  MAX_PENDING_OUTGOING,
  orderPair,
  pseudonymsFor,
  REQUEST_COOLDOWN_MS,
  REQUEST_TTL_MS,
  retireRequestNotifications,
} from "./access";
import { blockedIdsFor, isBlockedBetween } from "./blocks";

/**
 * Kontaktfreigabe (MSG01, MSG02, F05, PRD 09 «Zustandsautomaten»):
 * nicht aktiv → ausstehend → aktiv → beendet; ausstehend kann abgelehnt,
 * zurückgezogen oder abgelaufen sein. Genau ein Datensatz je ungeordnetem Paar.
 * Jede Zustandsänderung läuft in einer Transaktion mit SELECT … FOR UPDATE auf das Paar.
 */

type RelRow = typeof contactRelationships.$inferSelect;

/** Sperrt die Paarzeile (legt sie bei Bedarf an, ohne Duplikate – unique pair index). */
async function lockPairRow(tx: Tx, a: string, b: string): Promise<RelRow | undefined> {
  const { low, high } = orderPair(a, b);
  const [row] = await tx
    .select()
    .from(contactRelationships)
    .where(and(eq(contactRelationships.accountLow, low), eq(contactRelationships.accountHigh, high)))
    .for("update");
  return row;
}

async function lockById(tx: Tx, id: string): Promise<RelRow | undefined> {
  const [row] = await tx.select().from(contactRelationships).where(eq(contactRelationships.id, id)).for("update");
  return row;
}

const isParticipant = (rel: Pick<RelRow, "accountLow" | "accountHigh">, me: string) =>
  rel.accountLow === me || rel.accountHigh === me;
const otherOf = (rel: Pick<RelRow, "accountLow" | "accountHigh">, me: string) =>
  rel.accountLow === me ? rel.accountHigh : rel.accountLow;
const consentField = (rel: Pick<RelRow, "accountLow">, who: string) =>
  rel.accountLow === who ? ("lowConsentAt" as const) : ("highConsentAt" as const);

/** Ausstehend, aber abgelaufen (MSG02: 14 Tage) – wird lazy und periodisch auf «expired» gesetzt. */
const isExpiredPending = (rel: Pick<RelRow, "status" | "expiresAt">, now = new Date()) =>
  rel.status === "pending" && rel.expiresAt !== null && rel.expiresAt.getTime() <= now.getTime();

export type RequestOutcome =
  | { kind: "sent"; relationshipId: string }
  | { kind: "already_pending" }
  | { kind: "incoming_exists" }
  | { kind: "active"; conversationId: string | null };

/** Zustand des Paars aus Sicht des Viewers für S38 (ohne Offenlegung einer Ablehnung). */
export type PairState =
  | { kind: "none" }
  | { kind: "outgoing_pending" }
  | { kind: "incoming_pending"; relationshipId: string }
  | { kind: "active"; conversationId: string | null }
  | { kind: "cooldown"; until: Date }
  | { kind: "blocked_by_me" };

export async function getPairState(viewer: Viewer, otherId: string): Promise<PairState> {
  const me = viewer.accountId;
  const { low, high } = orderPair(me, otherId);
  const [rel] = await db
    .select({
      id: contactRelationships.id,
      status: contactRelationships.status,
      initiatorId: contactRelationships.initiatorId,
      expiresAt: contactRelationships.expiresAt,
      cooldownUntil: contactRelationships.cooldownUntil,
      conversationId: conversations.id,
    })
    .from(contactRelationships)
    .leftJoin(conversations, eq(conversations.relationshipId, contactRelationships.id))
    .where(and(eq(contactRelationships.accountLow, low), eq(contactRelationships.accountHigh, high)));
  if (!rel) return { kind: "none" };
  const now = new Date();
  if (rel.status === "active") return { kind: "active", conversationId: rel.conversationId };
  if (rel.status === "pending" && !isExpiredPending(rel, now))
    return rel.initiatorId === me ? { kind: "outgoing_pending" } : { kind: "incoming_pending", relationshipId: rel.id };
  if (rel.initiatorId === me && rel.cooldownUntil && rel.cooldownUntil > now && rel.status !== "ended")
    return { kind: "cooldown", until: rel.cooldownUntil };
  return { kind: "none" };
}

/**
 * S38 Anfrage senden (MSG01, MSG02). Der Sender stimmt damit dem Kontakt zu.
 * Gleichzeitige Gegenanfrage → gemeinsamer ausstehender Vorgang ohne automatische Annahme.
 * Rate-Limit (5/Tag) prüft die Action vor dem Aufruf.
 */
export async function sendContactRequest(viewer: Viewer, targetId: string): Promise<RequestOutcome> {
  const me = viewer.accountId;
  if (targetId === me) throw new UserError("Du kannst dir selbst keine Anfrage senden.");

  return db.transaction(async (tx) => {
    // Neutrale Meldung, ob blockiert oder nicht verfügbar (keine Offenlegung, SAF01).
    if ((await isBlockedBetween(me, targetId, tx)) || !(await accountsUsable([me, targetId], tx)))
      throw new UserError("Eine Anfrage an diese Person ist zurzeit nicht möglich.");

    const now = new Date();
    let rel = await lockPairRow(tx, me, targetId);

    if (rel && isExpiredPending(rel, now)) {
      await tx
        .update(contactRelationships)
        .set({
          status: "expired",
          cooldownUntil: new Date(rel.expiresAt!.getTime() + REQUEST_COOLDOWN_MS),
          lowConsentAt: null,
          highConsentAt: null,
          version: dsql`${contactRelationships.version} + 1`,
        })
        .where(eq(contactRelationships.id, rel.id));
      await retireRequestNotifications(tx, rel.id);
      rel = await lockById(tx, rel.id);
    }

    if (rel?.status === "active") {
      const [conv] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.relationshipId, rel.id));
      return { kind: "active", conversationId: conv?.id ?? null };
    }
    if (rel?.status === "pending") {
      // Gegenanfrage: kein stilles Annehmen, die Person bestätigt bewusst in S37 (MSG01, F05).
      return rel.initiatorId === me ? { kind: "already_pending" } : { kind: "incoming_exists" };
    }
    if (rel && rel.initiatorId === me && rel.status !== "ended" && rel.cooldownUntil && rel.cooldownUntil > now)
      throw new UserError(
        `Eine neue Anfrage an diese Person ist frühestens ab ${new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long", year: "numeric", timeZone: viewer.prefs.timezone }).format(rel.cooldownUntil)} möglich.`,
      );

    // MSG02: höchstens 20 ausstehende ausgehende Anfragen.
    const [pending] = await tx
      .select({ c: count() })
      .from(contactRelationships)
      .where(
        and(
          eq(contactRelationships.initiatorId, me),
          eq(contactRelationships.status, "pending"),
          gt(contactRelationships.expiresAt, now),
        ),
      );
    if (Number(pending?.c ?? 0) >= MAX_PENDING_OUTGOING)
      throw new UserError(
        "Du hast bereits 20 offene Anfragen. Ziehe eine zurück oder warte, bis Anfragen beantwortet sind.",
      );

    const { low, high } = orderPair(me, targetId);
    const fields = {
      initiatorId: me,
      status: "pending" as const,
      lowConsentAt: low === me ? now : null,
      highConsentAt: high === me ? now : null,
      requestedAt: now,
      expiresAt: new Date(now.getTime() + REQUEST_TTL_MS),
      cooldownUntil: null,
      endedAt: null,
      endedBy: null,
    };

    let relationshipId: string;
    if (rel) {
      await tx
        .update(contactRelationships)
        .set({ ...fields, version: dsql`${contactRelationships.version} + 1` })
        .where(eq(contactRelationships.id, rel.id));
      relationshipId = rel.id;
    } else {
      const [inserted] = await tx
        .insert(contactRelationships)
        .values({ accountLow: low, accountHigh: high, ...fields })
        .onConflictDoNothing()
        .returning({ id: contactRelationships.id });
      if (!inserted) {
        // Gleichzeitige Anlage (Doppelklick oder Gegenanfrage): gemeinsamer Vorgang, keine Annahme.
        const concurrent = await lockPairRow(tx, me, targetId);
        return concurrent?.initiatorId === me ? { kind: "already_pending" } : { kind: "incoming_exists" };
      }
      relationshipId = inserted.id;
    }

    await notify(
      {
        accountId: targetId,
        type: "contact_request",
        targetType: "contact",
        targetId: relationshipId,
        actorId: me,
        dedupeKey: `contact_request:${relationshipId}:${now.getTime()}`,
      },
      tx,
    );
    return { kind: "sent", relationshipId };
  });
}

/**
 * S37 Annehmen/Ablehnen (MSG01). Annahme setzt die Beziehung atomar auf aktiv und
 * öffnet dasselbe Gespräch wieder, sofern vorhanden (MSG04).
 */
export async function respondToRequest(
  viewer: Viewer,
  relationshipId: string,
  accept: boolean,
): Promise<{ conversationId: string | null }> {
  const me = viewer.accountId;
  return db.transaction(async (tx) => {
    const rel = await lockById(tx, relationshipId);
    const now = new Date();
    if (!rel || !isParticipant(rel, me) || rel.initiatorId === me)
      throw new UserError("Diese Anfrage ist nicht mehr verfügbar.");
    if (rel.status !== "pending" || isExpiredPending(rel, now))
      throw new UserError("Diese Anfrage ist nicht mehr aktiv.");
    const other = otherOf(rel, me);

    if (!accept) {
      // Ablehnung wird der sendenden Person nur als «nicht aktiv» angezeigt (MSG02).
      await tx
        .update(contactRelationships)
        .set({
          status: "declined",
          lowConsentAt: null,
          highConsentAt: null,
          cooldownUntil: new Date(now.getTime() + REQUEST_COOLDOWN_MS),
          expiresAt: null,
          version: dsql`${contactRelationships.version} + 1`,
        })
        .where(eq(contactRelationships.id, rel.id));
      await retireRequestNotifications(tx, rel.id);
      return { conversationId: null };
    }

    if ((await isBlockedBetween(me, other, tx)) || !(await accountsUsable([me, other], tx)))
      throw new UserError("Diese Anfrage kann zurzeit nicht angenommen werden.");

    // Beide Zustimmungen: Initiator mit dem Senden, Empfänger mit der bewussten Annahme.
    const initiatorConsent = rel[consentField(rel, other)] ?? rel.requestedAt ?? now;
    await tx
      .update(contactRelationships)
      .set({
        status: "active",
        lowConsentAt: rel.accountLow === me ? now : initiatorConsent,
        highConsentAt: rel.accountHigh === me ? now : initiatorConsent,
        expiresAt: null,
        cooldownUntil: null,
        endedAt: null,
        endedBy: null,
        version: dsql`${contactRelationships.version} + 1`,
      })
      .where(eq(contactRelationships.id, rel.id));

    await tx.insert(conversations).values({ relationshipId: rel.id }).onConflictDoNothing({ target: conversations.relationshipId });
    const [conv] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.relationshipId, rel.id));

    await tx
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.accountId, me), eq(notifications.type, "contact_request"), eq(notifications.targetId, rel.id), isNull(notifications.readAt)));

    await notify(
      {
        accountId: other,
        type: "contact_accepted",
        targetType: "conversation",
        targetId: conv!.id,
        actorId: me,
        dedupeKey: `contact_accepted:${rel.id}:${now.getTime()}`,
      },
      tx,
    );
    return { conversationId: conv!.id };
  });
}

/** Rücknahme durch die sendende Person (MSG01). */
export async function withdrawRequest(viewer: Viewer, relationshipId: string): Promise<void> {
  const me = viewer.accountId;
  await db.transaction(async (tx) => {
    const rel = await lockById(tx, relationshipId);
    if (!rel || !isParticipant(rel, me) || rel.initiatorId !== me || rel.status !== "pending")
      throw new UserError("Diese Anfrage ist nicht mehr ausstehend.");
    const now = new Date();
    await tx
      .update(contactRelationships)
      .set({
        status: "withdrawn",
        lowConsentAt: null,
        highConsentAt: null,
        expiresAt: null,
        cooldownUntil: new Date(now.getTime() + REQUEST_COOLDOWN_MS),
        version: dsql`${contactRelationships.version} + 1`,
      })
      .where(eq(contactRelationships.id, rel.id));
    await retireRequestNotifications(tx, rel.id);
  });
}

/**
 * Kontakt beenden (MSG04, US16): entfernt beide Zustimmungen. Dieselbe Zeilensperre wie
 * beim Senden serialisiert Entzug und Nachricht (AT05). Der Verlauf bleibt lesbar.
 */
export async function endContact(viewer: Viewer, relationshipId: string): Promise<void> {
  const me = viewer.accountId;
  await db.transaction(async (tx) => {
    const rel = await lockById(tx, relationshipId);
    if (!rel || !isParticipant(rel, me)) throw new UserError("Dieser Kontakt ist nicht verfügbar.");
    if (rel.status !== "active") throw new UserError("Dieser Kontakt ist bereits beendet.");
    const now = new Date();
    await tx
      .update(contactRelationships)
      .set({
        status: "ended",
        lowConsentAt: null,
        highConsentAt: null,
        endedAt: now,
        endedBy: me,
        version: dsql`${contactRelationships.version} + 1`,
      })
      .where(eq(contactRelationships.id, rel.id));
  });
}

export type ContactLists = {
  incoming: { relationshipId: string; pseudonym: string; otherId: string; requestedAt: Date | null; expiresAt: Date | null }[];
  outgoing: { relationshipId: string; pseudonym: string; otherId: string; requestedAt: Date | null; state: "pending" | "inactive" }[];
  active: { relationshipId: string; pseudonym: string; otherId: string; conversationId: string | null; since: Date }[];
};

/** S37: eingehend, ausgehend, bestehend – blockierte Paare fehlen (SAF01). */
export async function listContacts(viewer: Viewer): Promise<ContactLists> {
  const me = viewer.accountId;
  const now = new Date();
  const blocked = new Set(await blockedIdsFor(me));
  const recent = new Date(now.getTime() - REQUEST_COOLDOWN_MS);

  const rows = await db
    .select({
      id: contactRelationships.id,
      low: contactRelationships.accountLow,
      high: contactRelationships.accountHigh,
      initiatorId: contactRelationships.initiatorId,
      status: contactRelationships.status,
      requestedAt: contactRelationships.requestedAt,
      expiresAt: contactRelationships.expiresAt,
      updatedAt: contactRelationships.updatedAt,
      conversationId: conversations.id,
    })
    .from(contactRelationships)
    .leftJoin(conversations, eq(conversations.relationshipId, contactRelationships.id))
    .where(
      and(
        or(eq(contactRelationships.accountLow, me), eq(contactRelationships.accountHigh, me)),
        or(
          inArray(contactRelationships.status, ["pending", "active"]),
          // Ausgehende, nicht mehr aktive Anfragen bleiben 30 Tage sichtbar – ohne Grund.
          and(
            eq(contactRelationships.initiatorId, me),
            inArray(contactRelationships.status, ["declined", "expired"]),
            gt(contactRelationships.updatedAt, recent),
          ),
        ),
      ),
    )
    .orderBy(desc(contactRelationships.updatedAt))
    .limit(300);

  const visible = rows.filter((r) => !blocked.has(r.low === me ? r.high : r.low));
  const names = await pseudonymsFor(visible.map((r) => (r.low === me ? r.high : r.low)));
  const out: ContactLists = { incoming: [], outgoing: [], active: [] };

  for (const r of visible) {
    const otherId = r.low === me ? r.high : r.low;
    const pseudonym = names.get(otherId);
    if (!pseudonym) continue;
    const expired = r.status === "pending" && r.expiresAt !== null && r.expiresAt <= now;
    if (r.status === "active") {
      out.active.push({ relationshipId: r.id, pseudonym, otherId, conversationId: r.conversationId, since: r.updatedAt });
    } else if (r.initiatorId === me) {
      out.outgoing.push({
        relationshipId: r.id,
        pseudonym,
        otherId,
        requestedAt: r.requestedAt,
        state: r.status === "pending" && !expired ? "pending" : "inactive",
      });
    } else if (r.status === "pending" && !expired) {
      out.incoming.push({ relationshipId: r.id, pseudonym, otherId, requestedAt: r.requestedAt, expiresAt: r.expiresAt });
    }
  }
  out.active.sort((a, b) => a.pseudonym.localeCompare(b.pseudonym, "de-CH"));
  return out;
}

/** S38: minimales Profil des Ziels (nur Pseudonym), sofern erreichbar. */
export async function getRequestTarget(viewer: Viewer, targetId: string) {
  if (targetId === viewer.accountId) return null;
  const [row] = await db
    .select({ accountId: communityProfiles.accountId, pseudonym: communityProfiles.pseudonym })
    .from(communityProfiles)
    .where(eq(communityProfiles.accountId, targetId));
  if (!row) return null;
  if (!(await accountsUsable([targetId]))) return null;
  return row;
}

/** Ausstehende eingehende Anfragen (für Zähler anderer Module). */
export async function countIncomingRequests(viewer: Viewer): Promise<number> {
  const me = viewer.accountId;
  const [row] = await db
    .select({ c: count() })
    .from(contactRelationships)
    .where(
      and(
        or(eq(contactRelationships.accountLow, me), eq(contactRelationships.accountHigh, me)),
        ne(contactRelationships.initiatorId, me),
        eq(contactRelationships.status, "pending"),
        gt(contactRelationships.expiresAt, new Date()),
      ),
    );
  return Number(row?.c ?? 0);
}
