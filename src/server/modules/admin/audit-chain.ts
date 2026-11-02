import "server-only";
import { and, asc, count, desc, eq, gt, gte, like, lt, lte, sql as dsql } from "drizzle-orm";
import { sha256 } from "../../crypto";
import { db } from "../../db";
import { auditEvents, securityEvents } from "../../db/schema";
import { isUuid, pseudonymsFor } from "./common";

/**
 * Auditprotokoll lesen und Hash-Kette prüfen (PRI07). Zugriff ist eingeschränkt
 * (Administration, Datenschutzstelle) und wird selbst protokolliert (Aufrufer).
 */

export const AUDIT_READ_ROLES = ["admin", "privacy_officer"] as const;
const PAGE = 50;

export type AuditFilter = { action?: string; actorId?: string; from?: string; to?: string; cursor?: string };

function dayStart(d: string): Date | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`) : null;
}

export async function listAuditEvents(filter: AuditFilter) {
  const conds = [];
  if (filter.action) {
    const prefix = filter.action.replace(/[^a-z0-9_.:-]/gi, "").slice(0, 60);
    if (prefix) conds.push(like(auditEvents.action, `${prefix.replace(/[%_]/g, (m) => `\\${m}`)}%`));
  }
  if (filter.actorId && isUuid(filter.actorId)) conds.push(eq(auditEvents.actorId, filter.actorId.toLowerCase()));
  const from = filter.from ? dayStart(filter.from) : null;
  const to = filter.to ? dayStart(filter.to) : null;
  if (from) conds.push(gte(auditEvents.occurredAt, from));
  if (to) conds.push(lte(auditEvents.occurredAt, new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)));
  const cursor = Number(filter.cursor);
  if (Number.isInteger(cursor) && cursor > 0) conds.push(lt(auditEvents.id, cursor));

  const rows = await db
    .select({
      id: auditEvents.id,
      occurredAt: auditEvents.occurredAt,
      actorId: auditEvents.actorId,
      actorRole: auditEvents.actorRole,
      action: auditEvents.action,
      objectType: auditEvents.objectType,
      objectId: auditEvents.objectId,
      ticket: auditEvents.ticket,
      result: auditEvents.result,
    })
    .from(auditEvents)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditEvents.id))
    .limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  const names = await pseudonymsFor(page.map((r) => r.actorId));
  return {
    rows: page.map((r) => ({ ...r, actor: r.actorId ? (names.get(r.actorId) ?? null) : null })),
    nextCursor: rows.length > PAGE ? String(page[page.length - 1].id) : null,
  };
}

/** Die häufigsten Aktionspräfixe für die Filterauswahl. */
export async function auditActionPrefixes(): Promise<string[]> {
  const rows = await db
    .select({ prefix: dsql<string>`split_part(${auditEvents.action}, '.', 1)` })
    .from(auditEvents)
    .groupBy(dsql`split_part(${auditEvents.action}, '.', 1)`)
    .orderBy(dsql`split_part(${auditEvents.action}, '.', 1)`)
    .limit(40);
  return rows.map((r) => r.prefix).filter(Boolean);
}

/**
 * Prüft die gesamte Hash-Kette. Gleiches Format wie src/server/audit.ts. Der erste erhaltene
 * Eintrag darf nach Aufbewahrungslöschung (180 Tage) auf einen nicht mehr vorhandenen Vorgänger zeigen.
 */
export async function verifyAuditChain(): Promise<
  { ok: true; checked: number; anchored: boolean } | { ok: false; checked: number; brokenAt: number; reason: "hash" | "link" }
> {
  let lastId = 0;
  let prevHash: string | null = null;
  let checked = 0;
  let anchored = false;
  for (;;) {
    const batch = await db
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        actorId: auditEvents.actorId,
        actorRole: auditEvents.actorRole,
        action: auditEvents.action,
        objectType: auditEvents.objectType,
        objectId: auditEvents.objectId,
        ticket: auditEvents.ticket,
        result: auditEvents.result,
        prevHash: auditEvents.prevHash,
        hash: auditEvents.hash,
      })
      .from(auditEvents)
      .where(gt(auditEvents.id, lastId))
      .orderBy(asc(auditEvents.id))
      .limit(1000);
    if (batch.length === 0) break;
    for (const e of batch) {
      if (prevHash === null) {
        anchored = e.prevHash !== "genesis";
      } else if (e.prevHash !== prevHash) {
        return { ok: false, checked, brokenAt: e.id, reason: "link" };
      }
      const payload = JSON.stringify([
        e.prevHash,
        e.occurredAt.toISOString(),
        e.actorId,
        e.actorRole ?? null,
        e.action,
        e.objectType ?? null,
        e.objectId ?? null,
        e.ticket ?? null,
        e.result ?? "ok",
      ]);
      if (sha256(payload) !== e.hash) return { ok: false, checked, brokenAt: e.id, reason: "hash" };
      prevHash = e.hash;
      checked += 1;
      lastId = e.id;
    }
  }
  return { ok: true, checked, anchored };
}

/** Verweigerte Zugriffe (AT03): Zählung und Liste ohne Werte. */
export async function securityEventSummary(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const byKind = await db
    .select({ kind: securityEvents.kind, objectType: securityEvents.objectType, total: count() })
    .from(securityEvents)
    .where(gte(securityEvents.occurredAt, since))
    .groupBy(securityEvents.kind, securityEvents.objectType)
    .orderBy(desc(count()));
  const latest = await db
    .select({
      id: securityEvents.id,
      kind: securityEvents.kind,
      objectType: securityEvents.objectType,
      route: securityEvents.route,
      actorId: securityEvents.actorId,
      occurredAt: securityEvents.occurredAt,
    })
    .from(securityEvents)
    .orderBy(desc(securityEvents.occurredAt))
    .limit(25);
  return {
    byKind: byKind.map((r) => ({ ...r, total: Number(r.total) })),
    // Routen ohne Abfrageparameter, damit keine Werte erscheinen
    latest: latest.map((r) => ({ ...r, route: r.route ? r.route.split("?")[0] : null })),
  };
}
