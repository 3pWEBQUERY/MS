"use server";

import { and, eq, inArray, isNull, ne, or, gt, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str } from "../../action";
import { audit } from "../../audit";
import { actionStaff, type Viewer } from "../../auth/viewer";
import { db } from "../../db";
import { groupMemberships, groups, roleAssignments, topics } from "../../db/schema";
import { notify } from "../messaging/notify";
import { isUuid, qcol } from "./queries";

/**
 * S55 Gruppenverwaltung (COM06–COM08). Gruppen werden im MVP ausschliesslich durch
 * Mitarbeitende geführt. Jede Entscheidung wird protokolliert (COM07), ohne Freitext.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function roleFor(viewer: Viewer, preferred: ("admin" | "moderation_lead")[]) {
  return preferred.find((r) => viewer.roles.includes(r)) ?? viewer.roles[0] ?? null;
}

const GROUP_FIELDS = ["title", "slug", "topicId", "description", "rules", "rulesVersion", "type", "discoverable", "moderatorAccountId"];

export async function saveGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values: Record<string, string> = {};
  for (const k of GROUP_FIELDS) values[k] = str(formData, k);
  values.description = cleanText(String(formData.get("description") ?? ""));
  values.rules = cleanText(String(formData.get("rules") ?? ""));
  values.discoverable = formData.get("discoverable") === "on" ? "on" : "";

  return runAction(async () => {
    const viewer = await actionStaff(["admin"]);
    const groupId = str(formData, "groupId");
    const isNew = !groupId;
    const fieldErrors: Record<string, string> = {};

    const title = cleanText(values.title).replace(/\n+/g, " ");
    if (title.length < 3 || title.length > 80) fieldErrors.title = "Der Titel braucht 3 bis 80 Zeichen.";
    if (!SLUG_RE.test(values.slug) || values.slug.length > 60)
      fieldErrors.slug = "Nur Kleinbuchstaben, Ziffern und Bindestriche, höchstens 60 Zeichen (z. B. «beruf-und-ms»).";
    if (values.description.length < 10 || values.description.length > 600)
      fieldErrors.description = "Die Beschreibung braucht 10 bis 600 Zeichen.";
    if (values.rules.length < 10 || values.rules.length > 3000) fieldErrors.rules = "Die Regeln brauchen 10 bis 3 000 Zeichen.";
    if (!/^[A-Za-z0-9._-]{1,40}$/.test(values.rulesVersion))
      fieldErrors.rulesVersion = "Bitte gib eine Fassung an, z. B. «1» oder «2026-11».";
    if (values.type !== "open" && values.type !== "closed") fieldErrors.type = "Bitte wähle einen Zugangstyp.";

    if (!isUuid(values.topicId)) fieldErrors.topicId = "Bitte wähle ein Thema.";
    else {
      const [t] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, values.topicId)).limit(1);
      if (!t) fieldErrors.topicId = "Bitte wähle ein Thema.";
    }

    if (!isUuid(values.moderatorAccountId)) fieldErrors.moderatorAccountId = "Bitte wähle die verantwortliche Moderation.";
    else {
      const now = new Date();
      const [m] = await db
        .select({ id: roleAssignments.id })
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.accountId, values.moderatorAccountId),
            inArray(roleAssignments.role, ["moderator", "moderation_lead"]),
            isNull(roleAssignments.revokedAt),
            or(isNull(roleAssignments.endsAt), gt(roleAssignments.endsAt, now)),
          ),
        )
        .limit(1);
      if (!m) fieldErrors.moderatorAccountId = "Diese Person hat keine aktive Moderationsrolle.";
    }

    const [slugTaken] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.slug, values.slug), isUuid(groupId) ? ne(groups.id, groupId) : undefined))
      .limit(1);
    if (slugTaken) fieldErrors.slug = "Diese Adresse ist bereits vergeben.";

    const type = values.type as "open" | "closed";
    // Auffindbarkeit gilt nur für geschlossene Gruppen; offene sind innerhalb der Plattform immer auffindbar.
    const discoverable = type === "open" ? true : values.discoverable === "on";

    let current: Awaited<ReturnType<typeof loadGroup>> = null;
    if (!isNew) {
      current = await loadGroup(groupId);
      if (!current) return fail("Diese Gruppe gibt es nicht mehr.", { values });
      // COM08: Zugangstypwechsel nur mit expliziter Prüfung.
      if (current.type !== type && formData.get("confirmTypeChange") !== "on")
        fieldErrors.confirmTypeChange =
          "Ein Wechsel des Zugangstyps ändert, wer Inhalte sehen kann. Bitte bestätige die Prüfung ausdrücklich.";
      // SAF07: Regeländerung nachvollziehbar – geänderter Text braucht neue Fassung.
      if (current.rules !== values.rules && current.rulesVersion === values.rulesVersion)
        fieldErrors.rulesVersion = "Die Regeln wurden geändert. Bitte gib eine neue Fassung an.";
    }

    if (Object.keys(fieldErrors).length > 0) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors, values });

    const data = {
      title,
      slug: values.slug,
      topicId: values.topicId,
      description: values.description,
      rules: values.rules,
      rulesVersion: values.rulesVersion,
      type,
      discoverable,
      moderatorAccountId: values.moderatorAccountId,
    };

    let id: string;
    if (isNew) {
      const created = await db.transaction(async (tx) => {
        const [g] = await tx.insert(groups).values({ ...data, createdBy: viewer.accountId }).returning({ id: groups.id });
        await audit(
          { actorId: viewer.accountId, actorRole: "admin", action: "group.created", objectType: "group", objectId: g.id },
          tx,
        );
        return g.id;
      });
      id = created;
    } else {
      const readVersion = Number(str(formData, "version"));
      const updated = await db.transaction(async (tx) => {
        const rows = await tx
          .update(groups)
          .set({ ...data, version: sql`${groups.version} + 1` })
          .where(and(eq(groups.id, groupId), eq(groups.version, Number.isInteger(readVersion) ? readVersion : -1)))
          .returning({ id: groups.id });
        if (rows.length === 0) return false;
        await audit(
          { actorId: viewer.accountId, actorRole: "admin", action: "group.updated", objectType: "group", objectId: groupId },
          tx,
        );
        if (current && current.type !== type)
          await audit(
            { actorId: viewer.accountId, actorRole: "admin", action: "group.type_changed", objectType: "group", objectId: groupId },
            tx,
          );
        if (current && current.rulesVersion !== data.rulesVersion)
          await audit(
            { actorId: viewer.accountId, actorRole: "admin", action: "group.rules_changed", objectType: "group", objectId: groupId },
            tx,
          );
        return true;
      });
      if (!updated)
        return fail("Die Gruppe wurde inzwischen von jemand anderem geändert. Bitte lade die Seite neu.", {
          values,
          data: { conflict: true },
        });
      id = groupId;
    }
    redirect(`/verwaltung/gruppen/${id}?status=gespeichert`);
  }, values);
}

async function loadGroup(id: string) {
  if (!isUuid(id)) return null;
  const [g] = await db
    .select({ id: groups.id, type: groups.type, rules: groups.rules, rulesVersion: groups.rulesVersion, status: groups.status })
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);
  return g ?? null;
}

/** COM07: Aufnahmeanfrage annehmen oder ablehnen – protokolliert, mit In-App-Hinweis (F04). */
export async function decideRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff(["admin", "moderation_lead"]);
    const membershipId = str(formData, "membershipId");
    const decision = str(formData, "decision");
    if (!isUuid(membershipId) || (decision !== "accept" && decision !== "reject")) return fail("Ungültige Entscheidung.");
    const result = await db.transaction(async (tx) => {
      const [m] = await tx
        .update(groupMemberships)
        .set({
          status: decision === "accept" ? "active" : "rejected",
          decidedBy: viewer.accountId,
          decidedAt: new Date(),
          version: sql`${groupMemberships.version} + 1`,
        })
        .where(
          and(
            eq(groupMemberships.id, membershipId),
            eq(groupMemberships.status, "requested"),
            // Archivierte Gruppen nehmen niemanden mehr auf (COM08).
            sql`exists (select 1 from community.groups g where g.id = ${qcol(groupMemberships.groupId)} and g.status = 'active')`,
          ),
        )
        .returning({ id: groupMemberships.id, accountId: groupMemberships.accountId, groupId: groupMemberships.groupId, version: groupMemberships.version });
      if (!m) return null;
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: roleFor(viewer, ["admin", "moderation_lead"]),
          action: decision === "accept" ? "group.membership.accepted" : "group.membership.rejected",
          objectType: "group_membership",
          objectId: m.id,
        },
        tx,
      );
      await notify(
        {
          accountId: m.accountId,
          type: "group_decision",
          targetType: "group",
          targetId: m.groupId,
          actorId: null,
          dedupeKey: `group-decision:${m.id}:${m.version}`,
        },
        tx,
      );
      return m;
    });
    if (!result) return fail("Diese Anfrage ist nicht mehr offen. Vielleicht wurde sie zurückgezogen oder bereits entschieden.");
    refresh();
    return ok(decision === "accept" ? "Aufnahme bestätigt. Das Mitglied erhält einen Hinweis." : "Anfrage abgelehnt. Das Mitglied erhält einen Hinweis.");
  });
}

/** Mitglied entfernen: Zugriff endet sofort (COM08), protokolliert (COM07). */
export async function removeMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff(["admin"]);
    const membershipId = str(formData, "membershipId");
    if (!isUuid(membershipId)) return fail("Ungültige Mitgliedschaft.");
    const result = await db.transaction(async (tx) => {
      const [m] = await tx
        .update(groupMemberships)
        .set({ status: "removed", decidedBy: viewer.accountId, decidedAt: new Date(), version: sql`${groupMemberships.version} + 1` })
        .where(and(eq(groupMemberships.id, membershipId), eq(groupMemberships.status, "active")))
        .returning({ id: groupMemberships.id, accountId: groupMemberships.accountId, groupId: groupMemberships.groupId, version: groupMemberships.version });
      if (!m) return null;
      await audit(
        { actorId: viewer.accountId, actorRole: "admin", action: "group.membership.removed", objectType: "group_membership", objectId: m.id },
        tx,
      );
      await notify(
        {
          accountId: m.accountId,
          type: "group_decision",
          targetType: "group",
          targetId: m.groupId,
          actorId: null,
          dedupeKey: `group-decision:${m.id}:${m.version}`,
        },
        tx,
      );
      return m;
    });
    if (!result) return fail("Diese Mitgliedschaft ist nicht mehr aktiv.");
    refresh();
    return ok("Das Mitglied wurde entfernt. Der Zugang zur Gruppe endet sofort.");
  });
}

/** Archivieren macht die Gruppe schreibgeschützt (COM08); Wiederherstellen ist möglich. */
export async function setGroupArchivedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionStaff(["admin"]);
    const groupId = str(formData, "groupId");
    const archive = str(formData, "archive") === "1";
    if (!isUuid(groupId)) return fail("Diese Gruppe gibt es nicht mehr.");
    const done = await db.transaction(async (tx) => {
      const rows = await tx
        .update(groups)
        .set({ status: archive ? "archived" : "active", version: sql`${groups.version} + 1` })
        .where(and(eq(groups.id, groupId), eq(groups.status, archive ? "active" : "archived")))
        .returning({ id: groups.id });
      if (rows.length === 0) return false;
      if (archive) {
        // Offene Anfragen einer archivierten Gruppe werden geschlossen – kein späterer Zugriff.
        await tx
          .update(groupMemberships)
          .set({ status: "rejected", decidedBy: viewer.accountId, decidedAt: new Date(), version: sql`${groupMemberships.version} + 1` })
          .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.status, "requested")));
      }
      await audit(
        { actorId: viewer.accountId, actorRole: "admin", action: archive ? "group.archived" : "group.restored", objectType: "group", objectId: groupId },
        tx,
      );
      return true;
    });
    if (!done) return fail("Der Status der Gruppe hat sich inzwischen geändert. Bitte lade die Seite neu.");
    refresh();
    return ok(archive ? "Die Gruppe ist archiviert und schreibgeschützt." : "Die Gruppe ist wieder aktiv.");
  });
}
