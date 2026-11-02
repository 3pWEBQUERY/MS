import "server-only";
import { and, asc, eq, inArray, sql as dsql } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { UserError } from "@/server/action";
import { decrypt, encrypt, encryptOptional, receiptNumber, sha256 } from "@/server/crypto";
import { db, type Tx } from "@/server/db";
import {
  comments,
  communityProfiles,
  contactRelationships,
  conversations,
  evidenceItems,
  groups,
  messages,
  moderationCases,
  posts,
  reports,
} from "@/server/db/schema";
import { interestLabel, cantonName } from "@/lib/catalog";
import { canSeeComment, canSeeGroup, canSeePost } from "@/server/modules/messaging/targets";

/**
 * Melden (SAF02, F06, Kapitel 10) – wiederverwendbarer Service für Web und spätere Apps.
 * Erstellt Report + minimierte EvidenceItems (verschlüsselter Snapshot, SHA-256,
 * unveränderlicher Erfassungszeitpunkt) und hängt die Meldung an einen offenen Fall
 * zum selben Ziel an oder eröffnet einen neuen Fall mit Priorität und Frist.
 */

export type ReportTargetType = "post" | "comment" | "profile" | "message" | "group";
export type ReportReason = "harassment" | "privacy" | "dangerous_medical" | "spam_fraud" | "acute_danger" | "other";
export type Priority = "P0" | "P1" | "P2" | "P3";

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  post: "Beitrag",
  comment: "Antwort",
  profile: "Profil",
  message: "Nachricht",
  group: "Gruppe",
};

/** Höchstens zehn Nachrichten pro Chatmeldung (F06, MSG05). */
export const MAX_REPORTED_MESSAGES = 10;
export const REPORT_DETAILS_MAX = 1000;

/** Priorität aus dem Grund (Kapitel 10, vereinfacht). */
export function priorityForReason(reason: ReportReason): Priority {
  switch (reason) {
    case "acute_danger":
      return "P0";
    case "dangerous_medical":
    case "spam_fraud":
      return "P1";
    case "harassment":
    case "privacy":
      return "P2";
    default:
      return "P3";
  }
}

/** Reaktionsziele: P0 30 min, P1 2 h, P2 24 h, P3 72 h (Kapitel 10). */
export const PRIORITY_DUE_MS: Record<Priority, number> = {
  P0: 30 * 60 * 1000,
  P1: 2 * 60 * 60 * 1000,
  P2: 24 * 60 * 60 * 1000,
  P3: 72 * 60 * 60 * 1000,
};

const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const OPEN_STATUSES = ["new", "triaged", "in_progress", "escalated"] as const;

type Snapshot = {
  sourceType: string;
  sourceId: string;
  authorLabel: string;
  text: string;
  sourceCreatedAt: Date | null;
};

export type ReportTargetView = {
  type: ReportTargetType;
  id: string;
  /** Konto, dessen Inhalt gemeldet wird (Fall-Betroffene) */
  subjectAccountId: string | null;
  /** Kurze, neutrale Beschreibung für die Meldeseite (ohne Inhalt fremder Gruppen) */
  label: string;
  conversationId?: string;
  /** Für Chatmeldungen: auswählbare Nachrichten, die der Meldende bereits sieht */
  selectable?: { id: string; seq: number; mine: boolean; body: string; createdAt: Date; authorLabel: string }[];
};

async function pseudonym(accountId: string | null): Promise<string> {
  if (!accountId) return "Unbekannt";
  const [p] = await db
    .select({ pseudonym: communityProfiles.pseudonym })
    .from(communityProfiles)
    .where(eq(communityProfiles.accountId, accountId));
  return p?.pseudonym ?? "Ehemaliges Mitglied";
}

/** Konversation, an der der Meldende beteiligt ist (inkl. blockierter – F05). */
async function participantConversation(viewer: Viewer, conversationId: string) {
  const me = viewer.accountId;
  const [row] = await db
    .select({ id: conversations.id, low: contactRelationships.accountLow, high: contactRelationships.accountHigh })
    .from(conversations)
    .innerJoin(contactRelationships, eq(contactRelationships.id, conversations.relationshipId))
    .where(eq(conversations.id, conversationId));
  if (!row || (row.low !== me && row.high !== me)) return null;
  return { id: row.id, otherId: row.low === me ? row.high : row.low };
}

/**
 * Prüft, dass der Meldende das Ziel sehen darf, und liefert eine neutrale Ansicht.
 * null → neutral 404.
 */
export async function getReportTarget(
  viewer: Viewer,
  type: ReportTargetType,
  id: string | null,
  conversationId?: string | null,
): Promise<ReportTargetView | null> {
  const me = viewer.accountId;
  switch (type) {
    case "post": {
      if (!id || !(await canSeePost(me, id))) return null;
      const [p] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id));
      if (!p || p.authorId === me) return null;
      return { type, id, subjectAccountId: p.authorId, label: `Beitrag von ${await pseudonym(p.authorId)}` };
    }
    case "comment": {
      if (!id || !(await canSeeComment(me, id))) return null;
      const [c] = await db.select({ authorId: comments.authorId }).from(comments).where(eq(comments.id, id));
      if (!c || c.authorId === me) return null;
      return { type, id, subjectAccountId: c.authorId, label: `Antwort von ${await pseudonym(c.authorId)}` };
    }
    case "profile": {
      if (!id || id === me) return null;
      const [p] = await db
        .select({ pseudonym: communityProfiles.pseudonym })
        .from(communityProfiles)
        .where(eq(communityProfiles.accountId, id));
      if (!p) return null;
      return { type, id, subjectAccountId: id, label: `Profil von ${p.pseudonym}` };
    }
    case "group": {
      if (!id || !(await canSeeGroup(me, id))) return null;
      const [g] = await db.select({ title: groups.title }).from(groups).where(eq(groups.id, id));
      if (!g) return null;
      return { type, id, subjectAccountId: null, label: `Gruppe «${g.title}»` };
    }
    case "message": {
      if (!conversationId) return null;
      const conv = await participantConversation(viewer, conversationId);
      if (!conv) return null;
      // Nur bereits für den Meldenden sichtbare, nicht entfernte Nachrichten (F06).
      const rows = await db
        .select({
          id: messages.id,
          seq: messages.seq,
          senderId: messages.senderId,
          bodyEncrypted: messages.bodyEncrypted,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(eq(messages.conversationId, conv.id), dsql`${messages.deletedAt} is null`))
        .orderBy(dsql`${messages.seq} desc`)
        .limit(60);
      if (id && !rows.some((r) => r.id === id)) return null;
      const otherName = await pseudonym(conv.otherId);
      const selectable = rows
        .reverse()
        .filter((r) => r.bodyEncrypted)
        .map((r) => {
          let body = "";
          try {
            body = decrypt(r.bodyEncrypted!);
          } catch {
            body = "";
          }
          return {
            id: r.id,
            seq: Number(r.seq),
            mine: r.senderId === me,
            body,
            createdAt: r.createdAt,
            authorLabel: r.senderId === me ? "Du" : otherName,
          };
        });
      return {
        type,
        id: id ?? conv.id,
        subjectAccountId: conv.otherId,
        label: `Nachrichten im Gespräch mit ${otherName}`,
        conversationId: conv.id,
        selectable,
      };
    }
  }
}

/** Minimierter Beleg zum Erfassungszeitpunkt (SAF02). */
async function captureSnapshots(
  target: ReportTargetView,
  messageIds: string[],
  tx: Tx,
): Promise<Snapshot[]> {
  switch (target.type) {
    case "post": {
      const [p] = await tx
        .select({ title: posts.title, body: posts.body, authorId: posts.authorId, publishedAt: posts.publishedAt })
        .from(posts)
        .where(eq(posts.id, target.id));
      if (!p) return [];
      return [
        {
          sourceType: "post",
          sourceId: target.id,
          authorLabel: await pseudonym(p.authorId),
          text: [p.title, p.body].filter(Boolean).join("\n\n"),
          sourceCreatedAt: p.publishedAt,
        },
      ];
    }
    case "comment": {
      const [c] = await tx
        .select({ body: comments.body, authorId: comments.authorId, createdAt: comments.createdAt })
        .from(comments)
        .where(eq(comments.id, target.id));
      if (!c) return [];
      return [
        { sourceType: "comment", sourceId: target.id, authorLabel: await pseudonym(c.authorId), text: c.body, sourceCreatedAt: c.createdAt },
      ];
    }
    case "profile": {
      const [p] = await tx
        .select({
          pseudonym: communityProfiles.pseudonym,
          interests: communityProfiles.interests,
          canton: communityProfiles.canton,
          updatedAt: communityProfiles.updatedAt,
        })
        .from(communityProfiles)
        .where(eq(communityProfiles.accountId, target.id));
      if (!p) return [];
      const text = [
        `Pseudonym: ${p.pseudonym}`,
        p.interests.length > 0 ? `Interessen: ${p.interests.map(interestLabel).join(", ")}` : null,
        p.canton ? `Kanton: ${cantonName(p.canton) ?? p.canton}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return [{ sourceType: "profile", sourceId: target.id, authorLabel: p.pseudonym, text, sourceCreatedAt: p.updatedAt }];
    }
    case "group": {
      const [g] = await tx
        .select({ title: groups.title, description: groups.description, createdAt: groups.createdAt })
        .from(groups)
        .where(eq(groups.id, target.id));
      if (!g) return [];
      return [
        { sourceType: "group", sourceId: target.id, authorLabel: "Gruppe", text: `${g.title}\n\n${g.description}`, sourceCreatedAt: g.createdAt },
      ];
    }
    case "message": {
      const ids = [...new Set(messageIds)];
      if (ids.length === 0 || !target.conversationId) return [];
      const rows = await tx
        .select({
          id: messages.id,
          senderId: messages.senderId,
          bodyEncrypted: messages.bodyEncrypted,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(
          and(eq(messages.conversationId, target.conversationId), inArray(messages.id, ids), dsql`${messages.deletedAt} is null`),
        )
        .orderBy(asc(messages.seq));
      const names = new Map<string, string>();
      const out: Snapshot[] = [];
      for (const r of rows) {
        if (!r.bodyEncrypted) continue;
        if (!names.has(r.senderId)) names.set(r.senderId, await pseudonym(r.senderId));
        out.push({
          sourceType: "message",
          sourceId: r.id,
          authorLabel: names.get(r.senderId)!,
          text: decrypt(r.bodyEncrypted),
          sourceCreatedAt: r.createdAt,
        });
      }
      return out;
    }
  }
}

export type CreateReportInput = {
  type: ReportTargetType;
  id: string | null;
  conversationId?: string | null;
  reason: ReportReason;
  details: string | null;
  messageIds: string[];
};

export type CreateReportResult = {
  receiptNumber: string;
  subjectAccountId: string | null;
  priority: Priority;
};

/**
 * Meldung anlegen (SAF02). Rate-Limit und Feature-Prüfung erfolgen in der Action.
 * Mehrere Meldungen zum gleichen offenen Ziel werden an denselben Fall angehängt.
 */
export async function createReport(viewer: Viewer, input: CreateReportInput): Promise<CreateReportResult> {
  // Bei Chatmeldungen bestimmen allein die ausgewählten Nachrichten den Umfang (F06).
  const target = await getReportTarget(viewer, input.type, input.type === "message" ? null : input.id, input.conversationId);
  if (!target) throw new UserError("Dieser Inhalt ist nicht mehr verfügbar.");

  let messageIds: string[] = [];
  if (target.type === "message") {
    const allowed = new Set((target.selectable ?? []).map((m) => m.id));
    messageIds = [...new Set(input.messageIds)].filter((m) => allowed.has(m));
    if (messageIds.length === 0)
      throw new UserError("Bitte wähle mindestens eine Nachricht aus.", { messageIds: "Bitte wähle mindestens eine Nachricht aus." });
    if (messageIds.length > MAX_REPORTED_MESSAGES)
      throw new UserError("Du kannst höchstens zehn Nachrichten auswählen.", { messageIds: "Höchstens zehn Nachrichten." });
  }
  if (input.details && input.details.length > REPORT_DETAILS_MAX)
    throw new UserError("Die Erläuterung ist zu lang.", { details: "Höchstens 1 000 Zeichen." });

  const priority = priorityForReason(input.reason);
  const now = new Date();
  const dueAt = new Date(now.getTime() + PRIORITY_DUE_MS[priority]);

  // Fallziel: bei Chatmeldungen die zuerst ausgewählte Nachricht der Gegenseite (sonst die erste).
  let caseTargetId = target.id;
  if (target.type === "message") {
    const sel = (target.selectable ?? []).filter((m) => messageIds.includes(m.id));
    caseTargetId = (sel.find((m) => !m.mine) ?? sel[0])!.id;
  }

  return db.transaction(async (tx) => {
    // Gleichzeitige Meldungen zum selben Ziel serialisieren (ein offener Fall).
    const lockKey = target.type === "message" ? `report:conv:${target.conversationId}` : `report:${target.type}:${target.id}`;
    await tx.execute(dsql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const snapshots = await captureSnapshots(target, messageIds, tx);
    if (snapshots.length === 0) throw new UserError("Dieser Inhalt ist nicht mehr verfügbar.");

    const [openCase] =
      target.type === "message"
        ? await tx
            .select({ id: moderationCases.id, priority: moderationCases.priority, dueAt: moderationCases.dueAt })
            .from(moderationCases)
            .where(
              and(
                eq(moderationCases.targetType, "message"),
                inArray(moderationCases.status, [...OPEN_STATUSES]),
                dsql`${moderationCases.targetId} in (select id from messaging.messages where conversation_id = ${target.conversationId})`,
              ),
            )
            .limit(1)
        : await tx
            .select({ id: moderationCases.id, priority: moderationCases.priority, dueAt: moderationCases.dueAt })
            .from(moderationCases)
            .where(
              and(
                eq(moderationCases.targetType, target.type),
                eq(moderationCases.targetId, target.id),
                inArray(moderationCases.status, [...OPEN_STATUSES]),
              ),
            )
            .limit(1);

    let caseId: string;
    if (openCase) {
      caseId = openCase.id;
      // Höhere Priorität und frühere Frist übernehmen.
      if (PRIORITY_RANK[priority] < PRIORITY_RANK[openCase.priority as Priority] || dueAt < openCase.dueAt) {
        await tx
          .update(moderationCases)
          .set({
            priority: PRIORITY_RANK[priority] < PRIORITY_RANK[openCase.priority as Priority] ? priority : openCase.priority,
            dueAt: dueAt < openCase.dueAt ? dueAt : openCase.dueAt,
            version: dsql`${moderationCases.version} + 1`,
          })
          .where(eq(moderationCases.id, openCase.id));
      }
    } else {
      const [created] = await tx
        .insert(moderationCases)
        .values({
          caseNumber: receiptNumber("F"),
          priority,
          dueAt,
          targetType: target.type,
          targetId: caseTargetId,
          subjectAccountId: target.subjectAccountId,
        })
        .returning({ id: moderationCases.id });
      caseId = created!.id;
    }

    const receipt = receiptNumber("M");
    const [report] = await tx
      .insert(reports)
      .values({
        receiptNumber: receipt,
        caseId,
        reporterId: viewer.accountId,
        targetType: target.type,
        targetId: caseTargetId,
        reason: input.reason,
        detailsEncrypted: encryptOptional(input.details),
      })
      .returning({ id: reports.id });

    await tx.insert(evidenceItems).values(
      snapshots.map((s) => ({
        reportId: report!.id,
        caseId,
        sourceType: s.sourceType,
        sourceId: s.sourceId,
        authorLabel: s.authorLabel,
        snapshotEncrypted: encrypt(s.text),
        contentHash: sha256(s.text),
        sourceCreatedAt: s.sourceCreatedAt,
        capturedAt: now,
      })),
    );

    return { receiptNumber: receipt, subjectAccountId: target.subjectAccountId, priority };
  });
}
