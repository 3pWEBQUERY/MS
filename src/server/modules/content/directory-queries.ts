import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { safetyContacts, supportOffers, verificationRecords } from "../../db/schema";
import { isUuid } from "./staff";

/** Verzeichnisverwaltung (S57, CON05) und Pflege der Sicherheitskontakte (S49, SAF06). */

export async function listOffersForStaff() {
  return db
    .select({
      id: supportOffers.id,
      slug: supportOffers.slug,
      organization: supportOffers.organization,
      title: supportOffers.title,
      topicSlugs: supportOffers.topicSlugs,
      cantons: supportOffers.cantons,
      status: supportOffers.status,
      changeFlag: supportOffers.changeFlag,
      changeNote: supportOffers.changeNote,
      reviewedAt: supportOffers.reviewedAt,
      nextReviewAt: supportOffers.nextReviewAt,
      updatedAt: supportOffers.updatedAt,
    })
    .from(supportOffers)
    .orderBy(desc(supportOffers.changeFlag), asc(supportOffers.nextReviewAt), asc(supportOffers.organization))
    .limit(500);
}

export type StaffOfferRow = Awaited<ReturnType<typeof listOffersForStaff>>[number];

/** Arbeitsvorrat-Zustand eines Angebots (CON05). */
export function offerDueState(o: Pick<StaffOfferRow, "status" | "nextReviewAt">, now = new Date()) {
  if (!o.nextReviewAt) return "unverified" as const;
  if (o.nextReviewAt <= now) return "overdue" as const;
  if (o.nextReviewAt.getTime() - now.getTime() < 30 * 86400_000) return "due_soon" as const;
  return "ok" as const;
}

export async function getOfferForStaff(id: string) {
  if (!isUuid(id)) return null;
  const [offer] = await db
    .select({
      id: supportOffers.id,
      slug: supportOffers.slug,
      organization: supportOffers.organization,
      title: supportOffers.title,
      summary: supportOffers.summary,
      description: supportOffers.description,
      topicSlugs: supportOffers.topicSlugs,
      cantons: supportOffers.cantons,
      languages: supportOffers.languages,
      audience: supportOffers.audience,
      responsibility: supportOffers.responsibility,
      access: supportOffers.access,
      costNote: supportOffers.costNote,
      contactWay: supportOffers.contactWay,
      url: supportOffers.url,
      status: supportOffers.status,
      changeFlag: supportOffers.changeFlag,
      changeNote: supportOffers.changeNote,
      reviewedAt: supportOffers.reviewedAt,
      nextReviewAt: supportOffers.nextReviewAt,
      version: supportOffers.version,
    })
    .from(supportOffers)
    .where(eq(supportOffers.id, id))
    .limit(1);
  if (!offer) return null;
  const records = await listVerifications("offer", id);
  return { offer, records };
}

export type StaffOffer = NonNullable<Awaited<ReturnType<typeof getOfferForStaff>>>["offer"];

export async function listVerifications(targetType: "offer" | "safety_contact", targetId: string) {
  return db
    .select({
      id: verificationRecords.id,
      method: verificationRecords.method,
      verifiedAt: verificationRecords.verifiedAt,
      nextDueAt: verificationRecords.nextDueAt,
      note: verificationRecords.note,
    })
    .from(verificationRecords)
    .where(and(eq(verificationRecords.targetType, targetType), eq(verificationRecords.targetId, targetId)))
    .orderBy(desc(verificationRecords.verifiedAt))
    .limit(50);
}

export async function listSafetyContactsForStaff() {
  return db
    .select({
      id: safetyContacts.id,
      name: safetyContacts.name,
      phone: safetyContacts.phone,
      url: safetyContacts.url,
      region: safetyContacts.region,
      availability: safetyContacts.availability,
      sort: safetyContacts.sort,
      active: safetyContacts.active,
      verifiedAt: safetyContacts.verifiedAt,
      verifiedBy: safetyContacts.verifiedBy,
      nextDueAt: safetyContacts.nextDueAt,
    })
    .from(safetyContacts)
    .orderBy(asc(safetyContacts.sort), asc(safetyContacts.name));
}

export async function getSafetyContactForStaff(id: string) {
  if (!isUuid(id)) return null;
  const [contact] = await db
    .select({
      id: safetyContacts.id,
      name: safetyContacts.name,
      description: safetyContacts.description,
      phone: safetyContacts.phone,
      url: safetyContacts.url,
      availability: safetyContacts.availability,
      region: safetyContacts.region,
      sort: safetyContacts.sort,
      active: safetyContacts.active,
      verifiedAt: safetyContacts.verifiedAt,
      verifiedBy: safetyContacts.verifiedBy,
      nextDueAt: safetyContacts.nextDueAt,
    })
    .from(safetyContacts)
    .where(eq(safetyContacts.id, id))
    .limit(1);
  if (!contact) return null;
  return { contact, records: await listVerifications("safety_contact", id) };
}

export type StaffSafetyContact = NonNullable<Awaited<ReturnType<typeof getSafetyContactForStaff>>>["contact"];

/** SAF06: monatliche Verifikation überfällig? */
export function safetyDueState(c: { nextDueAt: Date | null; verifiedAt: Date | null }, now = new Date()) {
  if (!c.verifiedAt || !c.nextDueAt) return "unverified" as const;
  if (c.nextDueAt <= now) return "overdue" as const;
  if (c.nextDueAt.getTime() - now.getTime() < 7 * 86400_000) return "due_soon" as const;
  return "ok" as const;
}
