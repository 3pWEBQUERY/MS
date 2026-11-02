import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql as dsql } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { UserError } from "@/server/action";
import { decrypt, encrypt } from "@/server/crypto";
import { db, type Executor } from "@/server/db";
import {
  contactRelationships,
  conversations,
  conversationViews,
  messages,
  notifications,
} from "@/server/db/schema";
import { notify } from "./notify";
import { accountsUsable, hasWriteSuspension, MESSAGE_MAX, pseudonymsFor } from "./access";
import { blockedIdsFor, hasBlocked, isBlockedBetween } from "./blocks";

/**
 * Einzelgespräche (MSG03–MSG06, S39, S40). Nachrichten sind serverseitig verschlüsselt
 * (MSG05, keine Ende-zu-Ende-Verschlüsselung im MVP). Lesestand ist privat (keine
 * Lesebestätigung für die Gegenseite).
 */

export type ConversationState = "active" | "closed" | "blocked";

export type ConversationAccess = {
  id: string;
  relationshipId: string;
  otherId: string;
  otherPseudonym: string;
  state: ConversationState;
  /** Nur bei eigener Blockierung true (nie für die blockierte Seite sichtbar) */
  blockedByMe: boolean;
  lastSeq: number;
  lastReadSeq: number;
};

/**
 * Beteiligung prüfen (genau zwei Beteiligte, PRD 09). Gibt null für fremde oder
 * unbekannte IDs zurück – die Seite antwortet neutral mit 404.
 */
export async function getConversationAccess(
  accountId: string,
  conversationId: string,
  executor: Executor = db,
): Promise<ConversationAccess | null> {
  const [row] = await executor
    .select({
      id: conversations.id,
      lastSeq: conversations.lastSeq,
      relationshipId: contactRelationships.id,
      low: contactRelationships.accountLow,
      high: contactRelationships.accountHigh,
      status: contactRelationships.status,
      lowConsentAt: contactRelationships.lowConsentAt,
      highConsentAt: contactRelationships.highConsentAt,
      lastReadSeq: conversationViews.lastReadSeq,
    })
    .from(conversations)
    .innerJoin(contactRelationships, eq(contactRelationships.id, conversations.relationshipId))
    .leftJoin(
      conversationViews,
      and(eq(conversationViews.conversationId, conversations.id), eq(conversationViews.accountId, accountId)),
    )
    .where(
      and(
        eq(conversations.id, conversationId),
        or(eq(contactRelationships.accountLow, accountId), eq(contactRelationships.accountHigh, accountId)),
      ),
    );
  if (!row) return null;
  const otherId = row.low === accountId ? row.high : row.low;
  const [blocked, blockedByMe, names] = await Promise.all([
    isBlockedBetween(accountId, otherId, executor),
    hasBlocked(accountId, otherId, executor),
    pseudonymsFor([otherId], executor),
  ]);
  const active = row.status === "active" && row.lowConsentAt !== null && row.highConsentAt !== null;
  return {
    id: row.id,
    relationshipId: row.relationshipId,
    otherId,
    otherPseudonym: names.get(otherId) ?? "Ehemaliges Mitglied",
    state: blocked ? "blocked" : active ? "active" : "closed",
    blockedByMe,
    lastSeq: Number(row.lastSeq),
    lastReadSeq: Number(row.lastReadSeq ?? 0),
  };
}

export type ConversationListItem = {
  id: string;
  otherPseudonym: string;
  state: "active" | "closed";
  hasNew: boolean;
  lastActivityAt: Date | null;
};

/** S39: freigegebene und geschlossene Gespräche; blockierte sind ausgeblendet (F05). */
export async function listConversations(viewer: Viewer): Promise<ConversationListItem[]> {
  const me = viewer.accountId;
  const blocked = new Set(await blockedIdsFor(me));
  const rows = await db
    .select({
      id: conversations.id,
      lastSeq: conversations.lastSeq,
      low: contactRelationships.accountLow,
      high: contactRelationships.accountHigh,
      status: contactRelationships.status,
      lastReadSeq: conversationViews.lastReadSeq,
      hiddenAt: conversationViews.hiddenAt,
      lastActivityAt: dsql<Date | null>`(select max(m.created_at) from messaging.messages m where m.conversation_id = ${conversations.id})`.mapWith(
        (v: string | Date | null) => (v ? new Date(v) : null),
      ),
      hasNewFromOther: dsql<boolean>`exists (select 1 from messaging.messages m where m.conversation_id = ${conversations.id} and m.sender_id <> ${me} and m.deleted_at is null and m.seq > coalesce(${conversationViews.lastReadSeq}, 0))`,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(contactRelationships, eq(contactRelationships.id, conversations.relationshipId))
    .leftJoin(conversationViews, and(eq(conversationViews.conversationId, conversations.id), eq(conversationViews.accountId, me)))
    .where(or(eq(contactRelationships.accountLow, me), eq(contactRelationships.accountHigh, me)))
    .limit(500);

  const visible = rows.filter((r) => !blocked.has(r.low === me ? r.high : r.low) && !r.hiddenAt);
  const names = await pseudonymsFor(visible.map((r) => (r.low === me ? r.high : r.low)));
  return visible
    .map((r) => {
      const otherId = r.low === me ? r.high : r.low;
      const state: "active" | "closed" = r.status === "active" ? "active" : "closed";
      return {
        id: r.id,
        otherPseudonym: names.get(otherId) ?? "Ehemaliges Mitglied",
        state,
        hasNew: Boolean(r.hasNewFromOther),
        lastActivityAt: r.lastActivityAt ?? r.createdAt,
      };
    })
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === "active" ? -1 : 1;
      return (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0);
    });
}

export type ChatMessage = {
  id: string;
  seq: number;
  mine: boolean;
  /** null = «Nachricht entfernt» (MSG06) */
  body: string | null;
  createdAt: string;
  /** Nur bei eigenen Nachrichten: Vorgangs-ID zum Abgleich mit dem lokalen Sendestatus */
  op?: string;
};

function toChatMessage(
  m: {
    id: string;
    seq: number;
    senderId: string;
    bodyEncrypted: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    clientOpId: string;
  },
  me: string,
): ChatMessage {
  let body: string | null = null;
  if (!m.deletedAt && m.bodyEncrypted) {
    try {
      body = decrypt(m.bodyEncrypted);
    } catch {
      body = null;
    }
  }
  const mine = m.senderId === me;
  return {
    id: m.id,
    seq: Number(m.seq),
    mine,
    body,
    createdAt: m.createdAt.toISOString(),
    ...(mine ? { op: m.clientOpId } : {}),
  };
}

const messageFields = {
  id: messages.id,
  seq: messages.seq,
  senderId: messages.senderId,
  bodyEncrypted: messages.bodyEncrypted,
  deletedAt: messages.deletedAt,
  createdAt: messages.createdAt,
  clientOpId: messages.clientOpId,
};

/** Nachrichten geordnet nach Sequenz. Aufrufer muss Beteiligung zuvor geprüft haben. */
export async function listMessages(
  accountId: string,
  conversationId: string,
  opts: { beforeSeq?: number; afterSeq?: number; limit?: number } = {},
): Promise<{ items: ChatMessage[]; hasOlder: boolean }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  if (opts.afterSeq !== undefined) {
    const rows = await db
      .select(messageFields)
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), gt(messages.seq, opts.afterSeq)))
      .orderBy(asc(messages.seq))
      .limit(limit);
    return { items: rows.map((m) => toChatMessage(m, accountId)), hasOlder: false };
  }
  const rows = await db
    .select(messageFields)
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        opts.beforeSeq !== undefined ? lt(messages.seq, opts.beforeSeq) : undefined,
      ),
    )
    .orderBy(desc(messages.seq))
    .limit(limit + 1);
  const hasOlder = rows.length > limit;
  return { items: rows.slice(0, limit).reverse().map((m) => toChatMessage(m, accountId)), hasOlder };
}

/** Seit einem Zeitpunkt entfernte Nachrichten (für offene Ansichten, MSG06). */
export async function listRemovedSince(conversationId: string, since: Date): Promise<string[]> {
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), gt(messages.deletedAt, since)))
    .limit(200);
  return rows.map((r) => r.id);
}

/** Bestimmte Nachrichten eines Gesprächs (für Meldungen: nur ausgewählte, MSG05). */
export async function getMessagesByIds(conversationId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select(messageFields)
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), inArray(messages.id, ids), isNull(messages.deletedAt)))
    .orderBy(asc(messages.seq));
}

export type SendResult = { id: string; seq: number; createdAt: string; duplicate: boolean };

/**
 * Senden (MSG03, MSG04, AT05): im selben Transaktionskontext werden die Kontaktzeile
 * gesperrt (FOR UPDATE – dieselbe Sperre wie Kontakt beenden/Blockieren), beidseitige
 * Freigabe, Blockierungen und Kontostatus geprüft und die Sequenz vergeben.
 * Wiederholung mit derselben clientOpId liefert die bestehende Nachricht (kein Duplikat).
 * Feature-Schalter und Rate-Limit prüft die Action vorher.
 */
export async function sendMessage(
  viewer: Viewer,
  conversationId: string,
  body: string,
  clientOpId: string,
): Promise<SendResult> {
  const me = viewer.accountId;
  if (body.length === 0) throw new UserError("Bitte schreibe eine Nachricht.", { body: "Bitte schreibe eine Nachricht." });
  if (body.length > MESSAGE_MAX)
    throw new UserError("Eine Nachricht kann höchstens 2 000 Zeichen lang sein.", {
      body: "Höchstens 2 000 Zeichen.",
    });

  return db.transaction(async (tx) => {
    const [conv] = await tx
      .select({ id: conversations.id, relationshipId: conversations.relationshipId })
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (!conv) throw new UserError("Dieses Gespräch ist nicht verfügbar.");

    // MSG04: Beziehung sperren – Entzug und Senden werden serialisiert.
    const [rel] = await tx
      .select({
        low: contactRelationships.accountLow,
        high: contactRelationships.accountHigh,
        status: contactRelationships.status,
        lowConsentAt: contactRelationships.lowConsentAt,
        highConsentAt: contactRelationships.highConsentAt,
      })
      .from(contactRelationships)
      .where(eq(contactRelationships.id, conv.relationshipId))
      .for("update");
    if (!rel || (rel.low !== me && rel.high !== me)) throw new UserError("Dieses Gespräch ist nicht verfügbar.");

    // Idempotenz: dieselbe Vorgangs-ID → bestehende Nachricht (MSG03).
    const [existing] = await tx
      .select({ id: messages.id, seq: messages.seq, createdAt: messages.createdAt, conversationId: messages.conversationId })
      .from(messages)
      .where(and(eq(messages.senderId, me), eq(messages.clientOpId, clientOpId)));
    if (existing) {
      if (existing.conversationId !== conversationId) throw new UserError("Ungültige Vorgangskennung. Bitte lade die Seite neu.");
      return { id: existing.id, seq: Number(existing.seq), createdAt: existing.createdAt.toISOString(), duplicate: true };
    }

    const other = rel.low === me ? rel.high : rel.low;
    const consented = rel.status === "active" && rel.lowConsentAt !== null && rel.highConsentAt !== null;
    if (!consented) throw new UserError("Dieser Kontakt ist nicht mehr aktiv. Es können keine Nachrichten gesendet werden.");
    if (await isBlockedBetween(me, other, tx))
      throw new UserError("In diesem Gespräch können keine Nachrichten mehr gesendet werden.");
    if (!(await accountsUsable([me, other], tx)))
      throw new UserError("In diesem Gespräch können zurzeit keine Nachrichten gesendet werden.");
    if (await hasWriteSuspension(me, tx))
      throw new UserError("Dein Konto ist zurzeit für das Schreiben eingeschränkt. Einspruch ist unter «Meine Meldungen» möglich.");

    const [seqRow] = await tx
      .update(conversations)
      .set({ lastSeq: dsql`${conversations.lastSeq} + 1` })
      .where(eq(conversations.id, conversationId))
      .returning({ lastSeq: conversations.lastSeq });
    const seq = Number(seqRow!.lastSeq);

    const [msg] = await tx
      .insert(messages)
      .values({ conversationId, senderId: me, seq, bodyEncrypted: encrypt(body), clientOpId })
      .returning({ id: messages.id, createdAt: messages.createdAt });

    // Eigener Lesestand folgt der eigenen Nachricht.
    await upsertReadSeq(tx, conversationId, me, seq);

    // MSG07: höchstens eine ungelesene «Neue Nachricht»-Mitteilung je Gespräch.
    const [openNote] = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.accountId, other),
          eq(notifications.type, "new_message"),
          eq(notifications.targetId, conversationId),
          isNull(notifications.readAt),
          or(isNull(notifications.expiresAt), gt(notifications.expiresAt, new Date())),
        ),
      )
      .limit(1);
    if (!openNote)
      await notify(
        {
          accountId: other,
          type: "new_message",
          targetType: "conversation",
          targetId: conversationId,
          actorId: me,
          dedupeKey: `msg:${conversationId}:${other}:${seq}`,
        },
        tx,
      );

    return { id: msg!.id, seq, createdAt: msg!.createdAt.toISOString(), duplicate: false };
  });
}

async function upsertReadSeq(executor: Executor, conversationId: string, accountId: string, seq: number) {
  await executor
    .insert(conversationViews)
    .values({ conversationId, accountId, lastReadSeq: seq })
    .onConflictDoUpdate({
      target: [conversationViews.conversationId, conversationViews.accountId],
      set: { lastReadSeq: dsql`greatest(${conversationViews.lastReadSeq}, ${seq})` },
    });
}

/**
 * Eigener Lesestand (S39 «neue Nachricht»): nur für das eigene Konto, nie für die
 * Gegenseite sichtbar. Erledigt zugleich die zugehörige Mitteilung.
 */
export async function markConversationRead(accountId: string, conversationId: string, seq: number): Promise<void> {
  const access = await getConversationAccess(accountId, conversationId);
  if (!access) return;
  const upTo = Math.min(Math.max(0, Math.floor(seq)), access.lastSeq);
  await upsertReadSeq(db, conversationId, accountId, upTo);
  if (upTo >= access.lastSeq) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.accountId, accountId),
          eq(notifications.type, "new_message"),
          eq(notifications.targetId, conversationId),
          isNull(notifications.readAt),
        ),
      );
  }
}

/**
 * Eigene Nachricht entfernen (MSG06): Inhalt sofort unzugänglich für beide Seiten,
 * Sequenz bleibt als neutraler Platzhalter. Bereits gesicherte Meldungsbelege sind
 * getrennt gespeichert und davon nicht betroffen.
 */
export async function removeOwnMessage(viewer: Viewer, messageId: string): Promise<{ conversationId: string }> {
  const [row] = await db
    .update(messages)
    .set({ bodyEncrypted: null, deletedAt: new Date() })
    .where(and(eq(messages.id, messageId), eq(messages.senderId, viewer.accountId), isNull(messages.deletedAt)))
    .returning({ conversationId: messages.conversationId });
  if (!row) throw new UserError("Diese Nachricht kann nicht entfernt werden.");
  return row;
}
