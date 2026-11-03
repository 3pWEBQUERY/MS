import "server-only";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import type { Viewer } from "../../auth/viewer";
import { db } from "../../db";
import { communityProfiles, groupMemberships, groups, topics } from "../../db/schema";
import { isUuid } from "./queries";

/**
 * Gruppen lesen (COM06–COM08). Aussenstehende erhalten nur Beschreibung, Zugangstyp und Regeln –
 * keine Inhalte, Mitgliederlisten, Aktivitäts- oder Mitgliederzahlen. Verborgene Gruppen fehlen.
 */

type ViewerRef = Pick<Viewer, "accountId">;

export type MembershipStatus = "requested" | "active" | "rejected" | "left" | "removed" | "withdrawn";

export type GroupSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "open" | "closed";
  topic: string | null;
  rules: string;
  /** Eigener Status des Viewers – keine Angaben über andere */
  membership: MembershipStatus | null;
};

export const groupTypeLabel = (type: "open" | "closed") => (type === "open" ? "Offene Gruppe" : "Geschlossene Gruppe");

/** Zugang und Auffindbarkeit für die Verwaltung (S55). */
export function groupAccessLabel(type: "open" | "closed", discoverable: boolean) {
  if (type === "open") return "Offen";
  return discoverable ? "Geschlossen · auffindbar" : "Geschlossen · verborgen";
}

export const groupTypeHint = (type: "open" | "closed") =>
  type === "open"
    ? "Beitritt nach Annahme der Regeln. Beiträge sehen nur Mitglieder dieser Gruppe."
    : "Aufnahme auf Anfrage. Die Moderation entscheidet. Inhalte sind erst nach Aufnahme sichtbar.";

/** S33: offene und auffindbare geschlossene, aktive Gruppen. Verborgene fehlen (COM06). */
export async function listDiscoverableGroups(viewer: ViewerRef): Promise<GroupSummary[]> {
  const rows = await db
    .select({
      id: groups.id,
      slug: groups.slug,
      title: groups.title,
      description: groups.description,
      type: groups.type,
      topic: topics.name,
      rules: groups.rules,
      membership: groupMemberships.status,
    })
    .from(groups)
    .leftJoin(topics, eq(topics.id, groups.topicId))
    .leftJoin(
      groupMemberships,
      and(eq(groupMemberships.groupId, groups.id), eq(groupMemberships.accountId, viewer.accountId)),
    )
    .where(
      and(
        eq(groups.status, "active"),
        // Verborgene geschlossene Gruppen erscheinen hier nie – Mitglieder finden sie unter «Meine Gruppen».
        or(eq(groups.type, "open"), eq(groups.discoverable, true)),
      ),
    )
    .orderBy(asc(topics.sort), asc(groups.title));
  return rows;
}

export type GroupDetail = GroupSummary & {
  archived: boolean;
  discoverable: boolean;
  rulesVersion: string;
  /** Zusammenfassung der letzten Regeländerung (SAF07) */
  rulesChangeNote: string | null;
  memberRulesVersion: string | null;
  /** Verantwortliche Moderation (Mitarbeitende, Pseudonym) */
  moderator: string | null;
};

/**
 * S34/S35: Gruppendetail. Verborgene Gruppen nur für aktive oder anfragende Mitglieder,
 * sonst null (neutrale 404, COM06).
 */
export async function getGroupForViewer(viewer: ViewerRef, slug: string): Promise<GroupDetail | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [row] = await db
    .select({
      id: groups.id,
      slug: groups.slug,
      title: groups.title,
      description: groups.description,
      type: groups.type,
      discoverable: groups.discoverable,
      status: groups.status,
      topic: topics.name,
      rules: groups.rules,
      rulesVersion: groups.rulesVersion,
      rulesChangeNote: groups.rulesChangeNote,
      membership: groupMemberships.status,
      memberRulesVersion: groupMemberships.rulesVersionAccepted,
      moderator: communityProfiles.pseudonym,
    })
    .from(groups)
    .leftJoin(topics, eq(topics.id, groups.topicId))
    .leftJoin(
      groupMemberships,
      and(eq(groupMemberships.groupId, groups.id), eq(groupMemberships.accountId, viewer.accountId)),
    )
    .leftJoin(communityProfiles, eq(communityProfiles.accountId, groups.moderatorAccountId))
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!row) return null;
  const hidden = row.type === "closed" && !row.discoverable;
  const insider = row.membership === "active" || row.membership === "requested";
  if (hidden && !insider) return null;
  // Archivierte Gruppen bleiben für Mitglieder lesbar (schreibgeschützt, COM08), für andere nicht auffindbar.
  if (row.status === "archived" && row.membership !== "active") return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    type: row.type,
    topic: row.topic,
    rules: row.rules,
    membership: row.membership,
    archived: row.status === "archived",
    discoverable: row.discoverable,
    rulesVersion: row.rulesVersion,
    rulesChangeNote: row.rulesChangeNote,
    memberRulesVersion: row.memberRulesVersion,
    moderator: row.moderator,
  };
}

/** S36: eigene aktive Mitgliedschaften und ausstehende Anfragen. */
export async function listOwnMemberships(viewer: ViewerRef) {
  return db
    .select({
      groupId: groups.id,
      slug: groups.slug,
      title: groups.title,
      type: groups.type,
      groupStatus: groups.status,
      status: groupMemberships.status,
      since: groupMemberships.updatedAt,
      rulesCurrent: sql<boolean>`${groupMemberships.rulesVersionAccepted} is not distinct from ${groups.rulesVersion}`,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(
      and(eq(groupMemberships.accountId, viewer.accountId), inArray(groupMemberships.status, ["active", "requested"])),
    )
    .orderBy(asc(groups.title));
}

/** Gruppe nach id für Server Actions (ohne Sichtbarkeitsfilter – Prüfung erfolgt im Aufrufer). */
export async function loadGroupForAction(groupId: string, viewer: ViewerRef) {
  if (!isUuid(groupId)) return null;
  const [row] = await db
    .select({
      id: groups.id,
      slug: groups.slug,
      type: groups.type,
      discoverable: groups.discoverable,
      status: groups.status,
      rulesVersion: groups.rulesVersion,
      membershipId: groupMemberships.id,
      membership: groupMemberships.status,
      membershipVersion: groupMemberships.version,
    })
    .from(groups)
    .leftJoin(
      groupMemberships,
      and(eq(groupMemberships.groupId, groups.id), eq(groupMemberships.accountId, viewer.accountId)),
    )
    .where(eq(groups.id, groupId))
    .limit(1);
  return row ?? null;
}
