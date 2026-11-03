"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { INCIDENT_STEPS } from "@/components/admin/labels";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { deliveryJobs, featureFlags, outboxEvents } from "../../db/schema";
import { FLAGS, RESTRICTION_FLAGS, type FlagKey } from "../../flags";
import { actorRoleFor, isUuid } from "./common";
import { OPS_ROLES } from "./ops";

/**
 * Betrieb (HOM08, NFR16, NFR19, US26): Feature-Schalter einzeln mit Begründung, Wiedereinreihen
 * aus der Fehlerwarteschlange, Vorfallschritte. Alles wird protokolliert, ohne Freitexte im Audit.
 */

const TICKET_RE = /^[\p{L}\p{N}#\-_.:/]{3,40}$/u;

export async function setFlagAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { reason: str(formData, "reason") };
  return runAction(async () => {
    const viewer = await actionStaff([...OPS_ROLES]);
    const key = str(formData, "key") as FlagKey;
    if (!(key in FLAGS)) return fail("Unbekannter Schalter.");
    const enabled = str(formData, "enabled") === "on";
    const reason = cleanText(values.reason);
    if (reason.length < 10)
      return fail("Bitte begründe die Änderung (mindestens 10 Zeichen).", { fieldErrors: { reason: "Bitte begründe die Änderung." }, values });
    if (reason.length > 300) return fail("Höchstens 300 Zeichen.", { fieldErrors: { reason: "Höchstens 300 Zeichen." }, values });
    const version = Number(str(formData, "version"));
    const restriction = RESTRICTION_FLAGS.includes(key);

    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ enabled: featureFlags.enabled, version: featureFlags.version })
        .from(featureFlags)
        .where(eq(featureFlags.key, key));
      if (current) {
        if (current.version !== version)
          throw new UserError("Dieser Schalter wurde inzwischen geändert. Bitte lade die Seite neu.");
        if (current.enabled === enabled)
          throw new UserError(
            restriction
              ? enabled
                ? "Der Schalter ist bereits eingeschaltet."
                : "Der Schalter ist bereits ausgeschaltet."
              : enabled
                ? "Der Bereich ist bereits aktiv."
                : "Der Bereich ist bereits abgeschaltet.",
          );
        await tx
          .update(featureFlags)
          .set({ enabled, reason, updatedBy: viewer.accountId, updatedAt: new Date(), version: current.version + 1 })
          .where(and(eq(featureFlags.key, key), eq(featureFlags.version, current.version)));
      } else {
        await tx.insert(featureFlags).values({ key, enabled, description: FLAGS[key], reason, updatedBy: viewer.accountId });
      }
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: actorRoleFor(viewer, ["ops", "admin"]),
          action: enabled ? "flag.enabled" : "flag.disabled",
          objectType: "feature_flag",
          objectId: key,
        },
        tx,
      );
    });
    refresh();
    if (restriction)
      return ok(
        enabled
          ? `«${FLAGS[key]}» ist eingeschaltet. Die Bedingung gilt serverseitig sofort.`
          : `«${FLAGS[key]}» ist ausgeschaltet.`,
      );
    return ok(
      enabled
        ? `«${FLAGS[key]}» ist wieder aktiv.`
        : `«${FLAGS[key]}» ist abgeschaltet. Die Sperre gilt serverseitig sofort; bestehende Daten bleiben erhalten.`,
    );
  }, values);
}

/** Ereignisse aus der Fehlerwarteschlange erneut einreihen (NFR19). */
export async function requeueOutboxAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff([...OPS_ROLES]);
    const eventId = str(formData, "eventId");
    const type = str(formData, "type");
    const now = new Date();
    const reset = { status: "pending" as const, attempts: 0, availableAt: now, lockedAt: null, lastError: null, updatedAt: now };
    let n = 0;
    await db.transaction(async (tx) => {
      if (isUuid(eventId)) {
        const rows = await tx
          .update(outboxEvents)
          .set(reset)
          .where(and(eq(outboxEvents.id, eventId), inArray(outboxEvents.status, ["dead", "failed"])))
          .returning({ id: outboxEvents.id });
        n = rows.length;
      } else if (/^[a-z_.]{3,60}$/.test(type)) {
        const rows = await tx
          .update(outboxEvents)
          .set(reset)
          .where(and(eq(outboxEvents.type, type), eq(outboxEvents.status, "dead")))
          .returning({ id: outboxEvents.id });
        n = rows.length;
      } else {
        throw new UserError("Bitte wähle ein Ereignis oder einen Typ.");
      }
      if (n > 0)
        await audit(
          {
            actorId: viewer.accountId,
            actorRole: actorRoleFor(viewer, ["ops", "admin"]),
            action: "outbox.requeued",
            objectType: isUuid(eventId) ? "outbox_event" : "outbox_type",
            objectId: isUuid(eventId) ? eventId : type,
            ticket: String(n),
          },
          tx,
        );
    });
    if (n === 0) return fail("Es gab nichts erneut einzureihen. Der Eintrag wurde möglicherweise bereits verarbeitet.");
    refresh();
    return ok(n === 1 ? "Ein Ereignis wurde erneut eingereiht." : `${n} Ereignisse wurden erneut eingereiht.`);
  });
}

export async function requeueDeliveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff([...OPS_ROLES]);
    const jobId = str(formData, "jobId");
    if (!isUuid(jobId)) return fail("Dieser Zustellauftrag ist nicht verfügbar.");
    const now = new Date();
    const done = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deliveryJobs)
        .set({ status: "pending", attempts: 0, nextRunAt: now, lastErrorCode: null, updatedAt: now })
        .where(and(eq(deliveryJobs.id, jobId), inArray(deliveryJobs.status, ["dead", "failed"])))
        .returning({ id: deliveryJobs.id });
      if (rows.length === 0) return false;
      await audit(
        { actorId: viewer.accountId, actorRole: actorRoleFor(viewer, ["ops", "admin"]), action: "delivery.requeued", objectType: "delivery_job", objectId: jobId },
        tx,
      );
      return true;
    });
    if (!done) return fail("Dieser Zustellauftrag ist nicht mehr fehlgeschlagen.");
    refresh();
    // Der Zustell-Handler prüft Empfänger, Blockierungen und Präferenzen vor dem Versand erneut (AT06).
    return ok("Zustellauftrag erneut eingereiht.");
  });
}

/** Vorfallablauf I01–I04 (Kapitel 10): Schritt mit Ticket und Zeitpunkt protokollieren. */
export async function recordIncidentStepAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { step: str(formData, "step"), ticket: str(formData, "ticket") };
  return runAction(async () => {
    const viewer = await actionStaff([...OPS_ROLES]);
    const fe: Record<string, string> = {};
    if (!INCIDENT_STEPS.some((s) => s.value === values.step)) fe.step = "Bitte wähle den Schritt.";
    if (!TICKET_RE.test(values.ticket)) fe.ticket = "Ticket-Referenz: 3–40 Zeichen, ohne Leerzeichen (z. B. INC-42).";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });
    await audit({
      actorId: viewer.accountId,
      actorRole: actorRoleFor(viewer, ["ops", "admin"]),
      action: `incident.${values.step}`,
      objectType: "incident",
      objectId: values.ticket,
      ticket: values.ticket,
    });
    refresh();
    return ok(`Schritt ${values.step} für ${values.ticket} protokolliert.`);
  }, values);
}
