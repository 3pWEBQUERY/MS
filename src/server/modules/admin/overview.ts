import "server-only";
import { and, count, eq, inArray, lt, notInArray, sql as dsql } from "drizzle-orm";
import { db } from "../../db";
import { articleVersions, featureFlags, privacyRequests, supportOffers } from "../../db/schema";
import { RESTRICTION_FLAGS } from "../../flags";

/**
 * Anzahlen für die Verwaltungsübersicht je Rolle – keine Inhalte, keine Personendaten.
 */

export async function editorialCounts() {
  const now = new Date();
  const [inReview] = await db.select({ c: count() }).from(articleVersions).where(eq(articleVersions.status, "in_review"));
  const [changes] = await db.select({ c: count() }).from(articleVersions).where(eq(articleVersions.status, "changes_requested"));
  const [overdueArticles] = await db
    .select({ c: count() })
    .from(articleVersions)
    .where(and(eq(articleVersions.status, "published"), lt(articleVersions.reviewDueAt, now)));
  const [overdueOffers] = await db
    .select({ c: count() })
    .from(supportOffers)
    .where(and(eq(supportOffers.status, "published"), lt(supportOffers.nextReviewAt, now)));
  const [flagged] = await db
    .select({ c: count() })
    .from(supportOffers)
    .where(and(eq(supportOffers.changeFlag, true), notInArray(supportOffers.status, ["expired"])));
  return {
    inReview: Number(inReview?.c ?? 0),
    changesRequested: Number(changes?.c ?? 0),
    overdueArticles: Number(overdueArticles?.c ?? 0),
    overdueOffers: Number(overdueOffers?.c ?? 0),
    flaggedOffers: Number(flagged?.c ?? 0),
  };
}

export async function privacyCounts() {
  const [r] = await db
    .select({
      open: count(),
      overdue: dsql<number>`count(*) filter (where ${privacyRequests.dueAt} < now())`,
    })
    .from(privacyRequests)
    .where(notInArray(privacyRequests.status, ["completed", "rejected"]));
  const [failed] = await db.select({ c: count() }).from(privacyRequests).where(inArray(privacyRequests.status, ["failed"]));
  return { open: Number(r?.open ?? 0), overdue: Number(r?.overdue ?? 0), failed: Number(failed?.c ?? 0) };
}

export async function disabledFlagCount(): Promise<number> {
  // Einschränkende Schalter (Einladungspflicht) sind kein Teilbetrieb (HOM08).
  const [r] = await db
    .select({ c: count() })
    .from(featureFlags)
    .where(and(eq(featureFlags.enabled, false), notInArray(featureFlags.key, [...RESTRICTION_FLAGS])));
  return Number(r?.c ?? 0);
}
