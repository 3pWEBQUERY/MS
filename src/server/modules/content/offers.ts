import "server-only";
import { and, asc, eq, gt, inArray, isNotNull, sql as dsql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { HELP_TOPICS } from "@/lib/catalog";
import { db } from "../../db";
import { helpTopics, supportOffers } from "../../db/schema";
import { stillValid } from "./articles";

/**
 * Unterstützungsverzeichnis (CON04, CON05, S47, S48).
 * Öffentlich nur Angebote mit Status «published» und gültigem nächstem Prüftermin.
 * Externe Links werden ohne Parameter ausgegeben (CON04).
 */

export type OfferCard = {
  id: string;
  slug: string;
  organization: string;
  title: string;
  summary: string;
  topicSlugs: string[];
  cantons: string[];
  languages: string[];
  nextReviewAt: string;
};

export type OfferDetail = OfferCard & {
  description: string;
  audience: string;
  responsibility: string;
  access: string;
  costNote: string;
  contactWay: string;
  url: string;
  reviewedAt: string | null;
};

export type HelpTopic = { slug: string; name: string; description: string | null };

export const offerVisibleSql = and(eq(supportOffers.status, "published"), gt(supportOffers.nextReviewAt, dsql`now()`));

const cardFields = {
  id: supportOffers.id,
  slug: supportOffers.slug,
  organization: supportOffers.organization,
  title: supportOffers.title,
  summary: supportOffers.summary,
  topicSlugs: supportOffers.topicSlugs,
  cantons: supportOffers.cantons,
  languages: supportOffers.languages,
  nextReviewAt: supportOffers.nextReviewAt,
};

async function cachedOffers(): Promise<OfferCard[]> {
  "use cache";
  cacheTag("offers");
  cacheLife("minutes");
  const rows = await db
    .select(cardFields)
    .from(supportOffers)
    .where(offerVisibleSql)
    .orderBy(asc(supportOffers.organization), asc(supportOffers.title));
  return rows.map((r) => ({ ...r, nextReviewAt: r.nextReviewAt!.toISOString() }));
}

async function cachedHelpTopics(): Promise<HelpTopic[]> {
  "use cache";
  cacheTag("offers");
  cacheLife("hours");
  const rows = await db
    .select({ slug: helpTopics.slug, name: helpTopics.name, description: helpTopics.description })
    .from(helpTopics)
    .orderBy(asc(helpTopics.sort), asc(helpTopics.name));
  return rows;
}

/** Themen des Finders; ohne Datenbankeintrag gilt der Katalog (HELP_TOPICS). */
export async function listHelpTopics(): Promise<HelpTopic[]> {
  await connection();
  try {
    const rows = await cachedHelpTopics();
    if (rows.length > 0) return rows;
  } catch {
    // Katalog als Rückfall
  }
  return HELP_TOPICS.map(([slug, name]) => ({ slug, name, description: null }));
}

/** Alle aktuell sichtbaren Angebote. Innerhalb von Suspense aufrufen. */
export async function listPublicOffers(): Promise<OfferCard[]> {
  await connection();
  const all = await cachedOffers();
  const now = Date.now();
  return all.filter((o) => stillValid(o.nextReviewAt, now));
}

export type OfferFilterResult = {
  /** Angebote, die ausdrücklich im gewählten Kanton tätig sind */
  regional: OfferCard[];
  /** Schweizweit verfügbare Angebote (Kanton «CH») */
  national: OfferCard[];
};

/**
 * Filter nach Thema und Kanton ohne Standortzugriff (CON04). Bei gewähltem Kanton werden
 * regionale und schweizweite Angebote getrennt ausgewiesen; leere Regionen verweisen
 * transparent auf schweizweite Angebote (CON08).
 */
export async function filterPublicOffers(topic: string | null, canton: string | null): Promise<OfferFilterResult> {
  const all = await listPublicOffers();
  const byTopic = topic ? all.filter((o) => o.topicSlugs.includes(topic)) : all;
  if (!canton) {
    return { regional: byTopic.filter((o) => !o.cantons.includes("CH")), national: byTopic.filter((o) => o.cantons.includes("CH")) };
  }
  return {
    regional: byTopic.filter((o) => o.cantons.includes(canton)),
    national: byTopic.filter((o) => o.cantons.includes("CH") && !o.cantons.includes(canton)),
  };
}

async function cachedOffer(slug: string) {
  "use cache";
  cacheTag("offers");
  cacheLife("minutes");
  const [row] = await db
    .select({
      ...cardFields,
      description: supportOffers.description,
      audience: supportOffers.audience,
      responsibility: supportOffers.responsibility,
      access: supportOffers.access,
      costNote: supportOffers.costNote,
      contactWay: supportOffers.contactWay,
      url: supportOffers.url,
      status: supportOffers.status,
      reviewedAt: supportOffers.reviewedAt,
    })
    .from(supportOffers)
    // Entwürfe und nie geprüfte Angebote sind nie öffentlich – auch nicht als «abgelaufen».
    .where(and(eq(supportOffers.slug, slug), inArray(supportOffers.status, ["published", "expired", "hidden"]), isNotNull(supportOffers.reviewedAt)))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    nextReviewAt: row.nextReviewAt?.toISOString() ?? "",
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

export type PublicOfferResult =
  | { state: "available"; offer: OfferDetail }
  /** F03: abgelaufen oder ausgeblendet – Kontaktdaten werden nicht ausgegeben */
  | { state: "unavailable"; offer: Pick<OfferDetail, "id" | "slug" | "organization" | "title" | "topicSlugs" | "cantons"> };

export async function getPublicOffer(slug: string): Promise<PublicOfferResult | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  await connection();
  const row = await cachedOffer(slug);
  if (!row) return null;
  if (row.status === "published" && stillValid(row.nextReviewAt)) {
    const { status: _status, ...offer } = row;
    void _status;
    return { state: "available", offer };
  }
  return {
    state: "unavailable",
    offer: { id: row.id, slug: row.slug, organization: row.organization, title: row.title, topicSlugs: row.topicSlugs, cantons: row.cantons },
  };
}

/** Alternativen zu einem Angebot: gleiches Thema, bevorzugt gleiche Region (F03). */
export async function offerAlternatives(offer: { id: string; topicSlugs: string[]; cantons: string[] }, limit = 3): Promise<OfferCard[]> {
  const all = (await listPublicOffers()).filter((o) => o.id !== offer.id);
  const score = (o: OfferCard) =>
    (o.topicSlugs.some((t) => offer.topicSlugs.includes(t)) ? 2 : 0) +
    (o.cantons.some((c) => offer.cantons.includes(c)) ? 1 : 0);
  return all
    .map((o) => ({ o, s: score(o) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.o);
}

/** Für Merkliste und andere Module (HOM04): nur sichtbare Angebote liefern Titel und Link. */
export async function getVisibleOfferRefs(ids: string[]): Promise<Map<string, { title: string; href: string; summary: string }>> {
  const unique = [...new Set(ids)].filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: supportOffers.id, slug: supportOffers.slug, title: supportOffers.title, organization: supportOffers.organization, summary: supportOffers.summary })
    .from(supportOffers)
    .where(and(inArray(supportOffers.id, unique), offerVisibleSql));
  return new Map(rows.map((r) => [r.id, { title: `${r.title} – ${r.organization}`, href: `/hilfe/${r.slug}`, summary: r.summary }]));
}

export function helpTopicName(topics: HelpTopic[], slug: string): string {
  return topics.find((t) => t.slug === slug)?.name ?? HELP_TOPICS.find(([s]) => s === slug)?.[1] ?? slug;
}
