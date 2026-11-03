import "server-only";
import { asc, eq } from "drizzle-orm";
import { decryptOptional } from "../../crypto";
import { db } from "../../db";
import { appeals, comments, groupMemberships, groups, posts, reports, sanctions, topics } from "../../db/schema";
import { iso } from "./export-format";

/**
 * Export: eigene Beiträge, Antworten, Gruppenmitgliedschaften sowie eigene Meldungen,
 * Einsprüche und Massnahmen gegen das eigene Konto (PRI03). Fremde Texte sind nicht enthalten;
 * Meldungen gegen dieses Konto bleiben zum Schutz der Meldenden aussen vor.
 */
export async function collectCommunity(accountId: string) {
  const [ownPosts, ownComments, memberships, ownReports, ownAppeals, ownSanctions] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        status: posts.status,
        topic: topics.name,
        group: groups.title,
        publishedAt: posts.publishedAt,
        editedAt: posts.editedAt,
      })
      .from(posts)
      .leftJoin(topics, eq(topics.id, posts.topicId))
      .leftJoin(groups, eq(groups.id, posts.groupId))
      .where(eq(posts.authorId, accountId))
      .orderBy(asc(posts.publishedAt)),
    db
      .select({
        id: comments.id,
        postId: comments.postId,
        body: comments.body,
        status: comments.status,
        createdAt: comments.createdAt,
        editedAt: comments.editedAt,
      })
      .from(comments)
      .where(eq(comments.authorId, accountId))
      .orderBy(asc(comments.createdAt)),
    db
      .select({ group: groups.title, status: groupMemberships.status, createdAt: groupMemberships.createdAt })
      .from(groupMemberships)
      .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
      .where(eq(groupMemberships.accountId, accountId)),
    db
      .select({
        receiptNumber: reports.receiptNumber,
        targetType: reports.targetType,
        reason: reports.reason,
        detailsEncrypted: reports.detailsEncrypted,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.reporterId, accountId))
      .orderBy(asc(reports.createdAt)),
    db
      .select({ status: appeals.status, reasonEncrypted: appeals.reasonEncrypted, createdAt: appeals.createdAt, decidedAt: appeals.decidedAt })
      .from(appeals)
      .where(eq(appeals.appellantId, accountId)),
    db
      .select({ kind: sanctions.kind, startsAt: sanctions.startsAt, endsAt: sanctions.endsAt, liftedAt: sanctions.liftedAt })
      .from(sanctions)
      .where(eq(sanctions.accountId, accountId)),
  ]);

  return {
    community: {
      beitraege: ownPosts.map((p) => ({
        id: p.id,
        titel: p.title,
        text: p.status === "deleted" ? null : p.body || null,
        status: p.status,
        thema: p.topic,
        gruppe: p.group,
        veroeffentlicht_utc: iso(p.publishedAt),
        bearbeitet_utc: iso(p.editedAt),
      })),
      antworten: ownComments.map((c) => ({
        id: c.id,
        beitrag_id: c.postId,
        text: c.status === "deleted" ? null : c.body || null,
        status: c.status,
        erstellt_utc: iso(c.createdAt),
        bearbeitet_utc: iso(c.editedAt),
      })),
      gruppen: memberships.map((m) => ({ gruppe: m.group, status: m.status, seit_utc: iso(m.createdAt) })),
    },
    meldungen: ownReports.map((r) => ({
      beleg: r.receiptNumber,
      zieltyp: r.targetType,
      grund: r.reason,
      details: decryptOptional(r.detailsEncrypted),
      zeitpunkt_utc: iso(r.createdAt),
    })),
    einsprueche: ownAppeals.map((a) => ({
      status: a.status,
      begruendung: decryptOptional(a.reasonEncrypted),
      eingereicht_utc: iso(a.createdAt),
      entschieden_utc: iso(a.decidedAt),
    })),
    massnahmen: ownSanctions.map((s) => ({
      art: s.kind,
      ab_utc: iso(s.startsAt),
      bis_utc: iso(s.endsAt),
      aufgehoben_utc: iso(s.liftedAt),
    })),
  };
}
