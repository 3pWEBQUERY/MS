"use server";

import { and, eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CANTONS, HELP_TOPICS } from "@/lib/catalog";
import { fail, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { contactMessages, safetyContacts, supportOffers, verificationRecords } from "../../db/schema";
import { LANGUAGES, OFFER_REVIEW_MAX_MONTHS, SAFETY_REVIEW_MAX_DAYS, VERIFY_METHODS } from "./shared";
import { actingRole, addDaysTo, addMonths, EDITOR_ROLES, isUuid, parseDateInput } from "./staff";

/**
 * Verzeichnisverwaltung (S57, CON05) und Sicherheitskontakte (S49, SAF06).
 * Öffentlich nur nach dokumentierter Prüfung; spätestens nach sechs Monaten (Angebote) bzw.
 * monatlich (Sicherheitskontakte) erneut prüfen.
 */

const CANTON_CODES = ["CH", ...CANTONS.map(([c]) => c)] as string[];
const TOPIC_CODES = HELP_TOPICS.map(([c]) => c) as string[];
const LANGUAGE_CODES = LANGUAGES.map(([c]) => c) as string[];
const METHOD_CODES = VERIFY_METHODS.map(([c]) => c) as string[];

/** Geprüfte externe URL ohne Parameter (CON04): https, kein Query-String, kein Fragment. */
const httpsUrl = z
  .string()
  .max(300, "Höchstens 300 Zeichen.")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.search && !u.hash && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Bitte eine vollständige https-Adresse ohne Parameter (kein «?» oder «#»).");

const text = (min: number, max: number, msg: string) =>
  z.string().min(min, msg).max(max, `Höchstens ${max.toLocaleString("de-CH")} Zeichen.`);

const offerSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche.").max(100),
  organization: text(2, 120, "Bitte gib die Organisation an."),
  title: text(3, 140, "Bitte gib einen Titel an."),
  summary: text(20, 300, "Die Kurzbeschreibung braucht mindestens 20 Zeichen."),
  description: text(40, 4000, "Die Beschreibung braucht mindestens 40 Zeichen."),
  topicSlugs: z.array(z.string().refine((v) => TOPIC_CODES.includes(v))).min(1, "Bitte wähle mindestens ein Thema."),
  cantons: z.array(z.string().refine((v) => CANTON_CODES.includes(v))).min(1, "Bitte wähle «Ganze Schweiz» oder mindestens einen Kanton."),
  languages: z.array(z.string().refine((v) => LANGUAGE_CODES.includes(v))).min(1, "Bitte wähle mindestens eine Sprache."),
  audience: text(3, 300, "Bitte beschreibe die Zielgruppe."),
  responsibility: text(3, 300, "Bitte beschreibe die Zuständigkeit."),
  access: text(3, 400, "Bitte beschreibe den Zugang."),
  costNote: text(3, 200, "Bitte gib einen Kostenhinweis an, z. B. «Kosten gemäss Anbieter»."),
  contactWay: text(3, 300, "Bitte beschreibe den Kontaktweg."),
  url: httpsUrl,
});

const OFFER_TEXT_KEYS = ["slug", "organization", "title", "summary", "description", "audience", "responsibility", "access", "costNote", "contactWay", "url"] as const;

export async function saveOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values: Record<string, string | string[]> = {};
  for (const k of OFFER_TEXT_KEYS) values[k] = k === "description" ? cleanText(String(formData.get(k) ?? "")) : cleanText(str(formData, k));
  values.slug = (values.slug as string).toLowerCase();
  values.topicSlugs = formData.getAll("topicSlugs").map(String);
  values.cantons = formData.getAll("cantons").map(String);
  values.languages = formData.getAll("languages").map(String);
  const offerId = str(formData, "offerId");
  const readVersion = Number(str(formData, "version"));
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const parsed = offerSchema.safeParse(values);
    if (!parsed.success) return fail("Bitte prüfe die markierten Felder.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });
    const d = parsed.data;
    // «Ganze Schweiz» schliesst einzelne Kantone nicht aus, wird aber zuerst geführt.
    const cantons = d.cantons.includes("CH") ? ["CH", ...d.cantons.filter((c) => c !== "CH")] : d.cantons;
    const role = actingRole(viewer, EDITOR_ROLES);
    const [dup] = await db.select({ id: supportOffers.id }).from(supportOffers).where(eq(supportOffers.slug, d.slug));
    if (dup && dup.id !== offerId) return fail("Diese Adresse ist bereits vergeben.", { fieldErrors: { slug: "Bereits vergeben." }, values });

    const data = { ...d, cantons };
    if (!offerId) {
      const [row] = await db.insert(supportOffers).values({ ...data, status: "draft" }).returning({ id: supportOffers.id });
      await audit({ actorId: viewer.accountId, actorRole: role, action: "offer.created", objectType: "support_offer", objectId: row.id });
      redirect(`/verwaltung/verzeichnis/${row.id}?status=angelegt`);
    }
    if (!isUuid(offerId)) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    const [current] = await db.select({ status: supportOffers.status }).from(supportOffers).where(eq(supportOffers.id, offerId));
    if (!current) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    // CON05: Geänderte publizierte Angebote gehen erst nach erneuter Publikation wieder online.
    const nextStatus = current.status === "published" ? "in_review" : current.status;
    const res = await db
      .update(supportOffers)
      .set({ ...data, status: nextStatus, version: readVersion + 1 })
      .where(and(eq(supportOffers.id, offerId), eq(supportOffers.version, readVersion)))
      .returning({ id: supportOffers.id });
    if (!res.length)
      throw new UserError("Dieses Angebot wurde inzwischen geändert. Lade die Seite neu, um den aktuellen Stand zu sehen.", undefined, { conflict: true });
    await audit({ actorId: viewer.accountId, actorRole: role, action: "offer.updated", objectType: "support_offer", objectId: offerId });
    if (current.status === "published") updateTag("offers");
    redirect(`/verwaltung/verzeichnis/${offerId}?status=${current.status === "published" ? "gespeichert-offline" : "gespeichert"}`);
  }, values);
}

const verifySchema = z.object({
  method: z.string().refine((v) => METHOD_CODES.includes(v), "Bitte wähle das Prüfverfahren."),
  verifiedOn: z.string(),
  nextDueAt: z.string(),
  note: z.string().max(500, "Höchstens 500 Zeichen."),
});

function checkDates(verifiedOn: string, nextDueAt: string, maxDue: (from: Date) => Date, maxLabel: string) {
  const errors: Record<string, string> = {};
  const vOn = parseDateInput(verifiedOn);
  const due = parseDateInput(nextDueAt);
  const now = Date.now();
  if (!vOn || vOn.getTime() - now > 86400_000 || now - vOn.getTime() > 30 * 86400_000)
    errors.verifiedOn = "Bitte das Prüfdatum der letzten 30 Tage angeben.";
  if (!due || due.getTime() <= now) errors.nextDueAt = "Bitte ein Datum in der Zukunft wählen.";
  else if (vOn && due.getTime() > maxDue(vOn).getTime() + 86400_000) errors.nextDueAt = maxLabel;
  return { errors, vOn, due };
}

export async function verifyOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    method: str(formData, "method"),
    verifiedOn: str(formData, "verifiedOn"),
    nextDueAt: str(formData, "nextDueAt"),
    note: cleanText(str(formData, "note")),
    clearFlag: formData.get("clearFlag") === "on" ? "on" : "",
  };
  const offerId = str(formData, "offerId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const parsed = verifySchema.safeParse(values);
    if (!parsed.success) return fail("Bitte prüfe die markierten Felder.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });
    const { errors, vOn, due } = checkDates(values.verifiedOn, values.nextDueAt, (d) => addMonths(d, OFFER_REVIEW_MAX_MONTHS), "Spätestens sechs Monate nach der Prüfung (CON05).");
    if (Object.keys(errors).length) return fail("Bitte prüfe die markierten Felder.", { fieldErrors: errors, values });
    if (!isUuid(offerId)) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    const role = actingRole(viewer, EDITOR_ROLES);
    await db.transaction(async (tx) => {
      const [o] = await tx.select({ status: supportOffers.status }).from(supportOffers).where(eq(supportOffers.id, offerId)).for("update");
      if (!o) throw new UserError("Dieses Angebot ist nicht verfügbar.");
      await tx.insert(verificationRecords).values({
        targetType: "offer",
        targetId: offerId,
        verifierId: viewer.accountId,
        method: values.method,
        verifiedAt: vOn!,
        nextDueAt: due!,
        note: values.note || null,
      });
      await tx
        .update(supportOffers)
        .set({
          reviewedAt: vOn!,
          nextReviewAt: due!,
          status: o.status === "draft" || o.status === "expired" ? "in_review" : o.status,
          ...(values.clearFlag ? { changeFlag: false, changeNote: null } : {}),
        })
        .where(eq(supportOffers.id, offerId));
      await audit({ actorId: viewer.accountId, actorRole: role, action: "offer.verified", objectType: "support_offer", objectId: offerId }, tx);
    });
    updateTag("offers");
    redirect(`/verwaltung/verzeichnis/${offerId}?status=geprueft`);
  }, values);
}

export async function publishOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const offerId = str(formData, "offerId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(offerId)) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    const [o] = await db
      .select({ status: supportOffers.status, reviewedAt: supportOffers.reviewedAt, nextReviewAt: supportOffers.nextReviewAt })
      .from(supportOffers)
      .where(eq(supportOffers.id, offerId));
    if (!o) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    // CON05: Publikation nur mit gültiger, dokumentierter Prüfung.
    if (!o.reviewedAt || !o.nextReviewAt || o.nextReviewAt.getTime() <= Date.now())
      throw new UserError("Bitte erfasse zuerst eine gültige Prüfung beim Anbieter.");
    if (o.status === "published") throw new UserError("Dieses Angebot ist bereits publiziert.");
    await db
      .update(supportOffers)
      .set({ status: "published" })
      .where(and(eq(supportOffers.id, offerId), inArray(supportOffers.status, ["draft", "in_review", "hidden", "expired"])));
    await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "offer.published", objectType: "support_offer", objectId: offerId });
    updateTag("offers");
    redirect(`/verwaltung/verzeichnis/${offerId}?status=publiziert`);
  });
}

export async function hideOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { reason: cleanText(str(formData, "reason")) };
  const offerId = str(formData, "offerId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (values.reason.length < 5 || values.reason.length > 300)
      return fail("Bitte gib einen kurzen Grund an.", { fieldErrors: { reason: "5 bis 300 Zeichen, nur intern sichtbar." }, values });
    if (!isUuid(offerId)) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    const res = await db
      .update(supportOffers)
      .set({ status: "hidden", changeFlag: true, changeNote: `Ausgeblendet: ${values.reason}` })
      .where(eq(supportOffers.id, offerId))
      .returning({ id: supportOffers.id });
    if (!res.length) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "offer.hidden", objectType: "support_offer", objectId: offerId });
    updateTag("offers");
    redirect(`/verwaltung/verzeichnis/${offerId}?status=ausgeblendet`);
  }, values);
}

export async function setOfferFlagAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { note: cleanText(str(formData, "note")) };
  const offerId = str(formData, "offerId");
  const flag = str(formData, "flag") === "on";
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(offerId)) throw new UserError("Dieses Angebot ist nicht verfügbar.");
    if (flag && (values.note.length < 3 || values.note.length > 300))
      return fail("Bitte beschreibe kurz, was zu prüfen ist.", { fieldErrors: { note: "3 bis 300 Zeichen." }, values });
    await db
      .update(supportOffers)
      .set(flag ? { changeFlag: true, changeNote: values.note } : { changeFlag: false, changeNote: null })
      .where(eq(supportOffers.id, offerId));
    await audit({
      actorId: viewer.accountId,
      actorRole: actingRole(viewer, EDITOR_ROLES),
      action: flag ? "offer.flagged" : "offer.flag_cleared",
      objectType: "support_offer",
      objectId: offerId,
    });
    redirect(`/verwaltung/verzeichnis/${offerId}?status=${flag ? "markiert" : "erledigt"}`);
  }, values);
}

/* ───────────── Sicherheitskontakte (SAF06) ───────────── */

const safetySchema = z.object({
  name: text(2, 100, "Bitte gib einen Namen an."),
  description: text(10, 400, "Bitte beschreibe kurz, wofür dieser Hilfeweg da ist."),
  phone: z.string().max(20).refine((v) => v === "" || /^\+?[\d ]{3,18}$/.test(v), "Nur Ziffern, Leerzeichen und ein führendes «+»."),
  url: z.union([z.literal(""), httpsUrl]),
  availability: text(3, 120, "Bitte gib die Erreichbarkeit an."),
  region: text(2, 80, "Bitte gib die Region an."),
  sort: z.coerce.number().int().min(0).max(999),
});

export async function saveSafetyContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    name: cleanText(str(formData, "name")),
    description: cleanText(str(formData, "description")),
    phone: str(formData, "phone"),
    url: str(formData, "url"),
    availability: cleanText(str(formData, "availability")),
    region: cleanText(str(formData, "region")),
    sort: str(formData, "sort") || "0",
  };
  const contactId = str(formData, "contactId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const parsed = safetySchema.safeParse(values);
    if (!parsed.success) return fail("Bitte prüfe die markierten Felder.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });
    const d = parsed.data;
    if (!d.phone && !d.url) return fail("Bitte gib eine Telefonnummer oder eine Website an.", { fieldErrors: { phone: "Telefon oder Website ist nötig." }, values });
    const role = actingRole(viewer, EDITOR_ROLES);
    const data = { ...d, phone: d.phone || null, url: d.url || null };
    if (!contactId) {
      const [row] = await db.insert(safetyContacts).values({ ...data, active: false }).returning({ id: safetyContacts.id });
      await audit({ actorId: viewer.accountId, actorRole: role, action: "safety_contact.created", objectType: "safety_contact", objectId: row.id });
      redirect(`/verwaltung/verzeichnis/sicherheit/${row.id}?status=angelegt`);
    }
    if (!isUuid(contactId)) throw new UserError("Dieser Hilfeweg ist nicht verfügbar.");
    const [cur] = await db.select({ phone: safetyContacts.phone, url: safetyContacts.url, active: safetyContacts.active }).from(safetyContacts).where(eq(safetyContacts.id, contactId));
    if (!cur) throw new UserError("Dieser Hilfeweg ist nicht verfügbar.");
    // SAF06: Ein geänderter Kontaktweg ist ungeprüft und geht erst nach erneuter Verifikation online.
    const pathChanged = cur.phone !== data.phone || cur.url !== data.url;
    await db
      .update(safetyContacts)
      .set({ ...data, ...(pathChanged ? { active: false, verifiedAt: null, verifiedBy: null, nextDueAt: null } : {}) })
      .where(eq(safetyContacts.id, contactId));
    await audit({ actorId: viewer.accountId, actorRole: role, action: "safety_contact.updated", objectType: "safety_contact", objectId: contactId });
    updateTag("safety");
    redirect(`/verwaltung/verzeichnis/sicherheit/${contactId}?status=${pathChanged && cur.active ? "gespeichert-offline" : "gespeichert"}`);
  }, values);
}

export async function verifySafetyContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    method: str(formData, "method"),
    verifiedBy: cleanText(str(formData, "verifiedBy")),
    verifiedOn: str(formData, "verifiedOn"),
    nextDueAt: str(formData, "nextDueAt"),
    note: cleanText(str(formData, "note")),
  };
  const contactId = str(formData, "contactId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const fieldErrors: Record<string, string> = {};
    if (!METHOD_CODES.includes(values.method)) fieldErrors.method = "Bitte wähle das Prüfverfahren.";
    if (values.verifiedBy.length < 3 || values.verifiedBy.length > 120) fieldErrors.verifiedBy = "Bitte nenne die prüfende Stelle (3 bis 120 Zeichen).";
    if (values.note.length > 500) fieldErrors.note = "Höchstens 500 Zeichen.";
    const { errors, vOn, due } = checkDates(values.verifiedOn, values.nextDueAt, (d) => addDaysTo(d, SAFETY_REVIEW_MAX_DAYS), "Spätestens einen Monat nach der Prüfung (SAF06).");
    Object.assign(fieldErrors, errors);
    if (Object.keys(fieldErrors).length) return fail("Bitte prüfe die markierten Felder.", { fieldErrors, values });
    if (!isUuid(contactId)) throw new UserError("Dieser Hilfeweg ist nicht verfügbar.");
    const role = actingRole(viewer, EDITOR_ROLES);
    await db.transaction(async (tx) => {
      const res = await tx
        .update(safetyContacts)
        .set({ verifiedAt: vOn!, verifiedBy: values.verifiedBy, nextDueAt: due! })
        .where(eq(safetyContacts.id, contactId))
        .returning({ id: safetyContacts.id });
      if (!res.length) throw new UserError("Dieser Hilfeweg ist nicht verfügbar.");
      await tx.insert(verificationRecords).values({
        targetType: "safety_contact",
        targetId: contactId,
        verifierId: viewer.accountId,
        method: values.method,
        verifiedAt: vOn!,
        nextDueAt: due!,
        note: values.note || null,
      });
      await audit({ actorId: viewer.accountId, actorRole: role, action: "safety_contact.verified", objectType: "safety_contact", objectId: contactId }, tx);
    });
    updateTag("safety");
    redirect(`/verwaltung/verzeichnis/sicherheit/${contactId}?status=geprueft`);
  }, values);
}

export async function setSafetyActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contactId = str(formData, "contactId");
  const active = str(formData, "active") === "on";
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(contactId)) throw new UserError("Dieser Hilfeweg ist nicht verfügbar.");
    const [c] = await db.select({ verifiedAt: safetyContacts.verifiedAt, nextDueAt: safetyContacts.nextDueAt }).from(safetyContacts).where(eq(safetyContacts.id, contactId));
    if (!c) throw new UserError("Dieser Hilfeweg ist nicht verfügbar.");
    // SAF06: Nur fachlich verifizierte Kontaktdaten werden öffentlich.
    if (active && (!c.verifiedAt || !c.nextDueAt || c.nextDueAt.getTime() <= Date.now()))
      throw new UserError("Bitte erfasse zuerst eine gültige Verifikation.");
    await db.update(safetyContacts).set({ active }).where(eq(safetyContacts.id, contactId));
    await audit({
      actorId: viewer.accountId,
      actorRole: actingRole(viewer, EDITOR_ROLES),
      action: active ? "safety_contact.activated" : "safety_contact.deactivated",
      objectType: "safety_contact",
      objectId: contactId,
    });
    updateTag("safety");
    redirect(`/verwaltung/verzeichnis/sicherheit/${contactId}?status=${active ? "aktiviert" : "deaktiviert"}`);
  });
}

/* ───────────── Hinweise aus dem Kontaktformular ───────────── */

export async function closeContactMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const messageId = str(formData, "messageId");
  const back = str(formData, "back");
  return runAction(async () => {
    const viewer = await actionStaff(["editor", "admin", "privacy_officer"]);
    if (!isUuid(messageId)) throw new UserError("Dieser Hinweis ist nicht verfügbar.");
    const [m] = await db.select({ category: contactMessages.category }).from(contactMessages).where(eq(contactMessages.id, messageId));
    const privacy = viewer.roles.some((r) => r === "privacy_officer" || r === "admin");
    if (!m || (m.category === "datenschutz" && !privacy)) throw new UserError("Dieser Hinweis ist nicht verfügbar.");
    if (m.category !== "datenschutz" && !viewer.roles.some((r) => r === "editor" || r === "admin"))
      throw new UserError("Dieser Hinweis ist nicht verfügbar.");
    await db.update(contactMessages).set({ status: "done" }).where(eq(contactMessages.id, messageId));
    await audit({
      actorId: viewer.accountId,
      actorRole: actingRole(viewer, ["editor", "admin", "privacy_officer"]),
      action: "contact_message.closed",
      objectType: "contact_message",
      objectId: messageId,
    });
    redirect(back === "verzeichnis" ? "/verwaltung/verzeichnis?ansicht=hinweise&status=erledigt" : "/verwaltung/redaktion/hinweise?status=erledigt");
  });
}
