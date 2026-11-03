import "server-only";
import { and, Column, eq, is, isNull, or, sql, type SQL } from "drizzle-orm";
import { getTableConfig, type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core";
import { ROLE_LABELS } from "@/lib/catalog";
import type { Viewer } from "../../auth/viewer";
import { posts } from "../../db/schema";

/**
 * Lesende Community-Abfragen mit Rechteprüfung bei jedem Abruf (PRD 03, COM01–COM08).
 * Jede Abfrage filtert selbst nach Gruppenmitgliedschaft, Blockierung und Status.
 * Nie E-Mail oder Kontodaten ausser Pseudonym und Rolle.
 */

export type ViewerRef = Pick<Viewer, "accountId">;

export const PAGE_SIZE = 20;
export const POST_MAX = 5000;
export const POST_TITLE_MAX = 120;
export const COMMENT_MAX = 2000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/* ───────────────────────── Rechte-Bausteine (SQL) ───────────────────────── */

/**
 * Voll qualifizierte Spaltenreferenz für korrelierte Unterabfragen. Drizzle lässt den
 * Tabellennamen bei Abfragen ohne Join weg – in einer Unterabfrage würde «account_id»
 * sonst auf die innere Tabelle zeigen.
 */
export function qcol(c: AnyPgColumn): SQL {
  const t = getTableConfig(c.table as PgTable);
  return sql.raw(`"${t.schema ?? "public"}"."${t.name}"."${c.name}"`);
}

const ref = (v: string | AnyPgColumn | SQL): string | SQL =>
  typeof v === "string" ? v : is(v, Column) ? qcol(v as AnyPgColumn) : (v as SQL);

/** SAF01: aktive Blockierung in beide Richtungen zwischen Viewer und einem Konto. */
export function blockedWith(viewerId: string, otherRef: AnyPgColumn | SQL): SQL<boolean> {
  const other = ref(otherRef);
  return sql<boolean>`exists (
    select 1 from messaging.blocks b
    where b.lifted_at is null
      and ((b.blocker_id = ${viewerId} and b.blocked_id = ${other})
        or (b.blocker_id = ${other} and b.blocked_id = ${viewerId}))
  )`;
}

export function notBlockedWith(viewerId: string, other: AnyPgColumn | SQL): SQL {
  return sql`not ${blockedWith(viewerId, other)}`;
}

/** COM07: Rechte an Gruppeninhalten entstehen nur aus aktiver Mitgliedschaft. */
export function activeMemberOf(accountRef: string | AnyPgColumn, groupRef: AnyPgColumn | SQL): SQL<boolean> {
  const accountId = ref(accountRef);
  const groupCol = ref(groupRef);
  return sql<boolean>`exists (
    select 1 from community.group_memberships gm
    where gm.group_id = ${groupCol} and gm.account_id = ${accountId} and gm.status = 'active'
  )`;
}

/** Konten in Löschung oder gelöscht erscheinen nicht mehr als Autor (PRI05). */
export function authorPresent(authorRef: AnyPgColumn): SQL<boolean> {
  const authorCol = qcol(authorRef);
  return sql<boolean>`exists (
    select 1 from identity.accounts a
    where a.id = ${authorCol} and a.status not in ('deleted', 'deletion_pending')
  )`;
}

/** Aktive Rollen eines Kontos, damit Mitarbeitende als «Team» erkennbar sind (PRD 10 «Kalte Startphase»). */
export function rolesOf(accountRef: AnyPgColumn): SQL<string[] | null> {
  const accountCol = qcol(accountRef);
  return sql<string[] | null>`(
    select array_agg(distinct ra.role::text) from identity.role_assignments ra
    where ra.account_id = ${accountCol} and ra.revoked_at is null and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
  )`;
}

const TEAM_ORDER = ["moderation_lead", "moderator", "editor", "medical_reviewer", "admin", "privacy_officer", "ops"];

/** «Moderation», «Redaktion» … oder null für Mitglieder. */
export function teamRole(roles: string[] | null | undefined): string | null {
  const r = TEAM_ORDER.find((o) => roles?.includes(o));
  return r ? (ROLE_LABELS[r] ?? null) : null;
}

/** Sichtbarkeit eines Beitrags für den Viewer (COM01, COM07, SAF01). */
export function postVisibleTo(viewerId: string): SQL {
  return and(
    eq(posts.status, "published"),
    or(isNull(posts.groupId), activeMemberOf(viewerId, posts.groupId)),
    notBlockedWith(viewerId, posts.authorId),
    authorPresent(posts.authorId),
  )!;
}

/* ───────────────────────── Cursor (COM01: stabiler Tie-Breaker) ───────────────────────── */

const TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?)?$/;

export function encodeCursor(ts: string, id: string): string {
  return Buffer.from(`${ts}|${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): { ts: string; id: string } | null {
  if (!cursor || cursor.length > 200) return null;
  try {
    const [ts, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (!ts || !TS_RE.test(ts) || !isUuid(id)) return null;
    return { ts, id };
  } catch {
    return null;
  }
}

/** (Zeitpunkt, id) < Cursor bei absteigender Sortierung; Text-Zeitstempel behält Mikrosekunden. */
export function beforeCursor(tsCol: AnyPgColumn, idCol: AnyPgColumn, cursor: { ts: string; id: string } | null): SQL | undefined {
  if (!cursor) return undefined;
  return sql`(${tsCol}, ${idCol}) < (${cursor.ts}::timestamptz, ${cursor.id}::uuid)`;
}

/* ───────────────────────── Typen ───────────────────────── */

export type AuthorView = { id: string; pseudonym: string; team: string | null };

export type PostListItem = {
  id: string;
  title: string | null;
  excerpt: string;
  topic: { slug: string; name: string };
  group: { slug: string; title: string; type: "open" | "closed" } | null;
  author: AuthorView;
  publishedAt: Date;
  edited: boolean;
};

export type Paged<T> = { items: T[]; nextCursor: string | null };

export function excerptOf(body: string, max = 280): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()} …`;
}

/* ───────────────────────── Themen ───────────────────────── */
