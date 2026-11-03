import "server-only";
import { and, count, eq, gt, like, max } from "drizzle-orm";
import { recordDenied } from "../../audit";
import { db } from "../../db";
import { securityEvents } from "../../db/schema";
import { consume } from "../../rate-limit";

/**
 * SAF08 Missbrauchsschutz: Überschreitungen der serverseitigen Limits werden ohne Inhalte als
 * technisches Ereignis festgehalten, damit falsche Treffer überprüfbar sind (S54). Pro Konto,
 * Limit und Zeitfenster wird höchstens ein Ereignis gespeichert.
 */

export type LimitKind = "post" | "comment" | "message" | "contact_request" | "report";

export const LIMIT_KIND_LABELS: Record<LimitKind, string> = {
  post: "Beiträge (5 pro Stunde)",
  comment: "Antworten (20 pro Stunde)",
  message: "Chatnachrichten (30 pro Minute)",
  contact_request: "Kontaktanfragen (5 pro Tag)",
  report: "Meldungen (20 pro Stunde)",
};

const PREFIX = "rate_limit.";

/** Hinweis für die betroffene Person: klare Rückmeldung plus Weg zur Überprüfung. */
export const LIMIT_REVIEW_HINT = "Hältst du das für einen Fehler? Schreib uns über das Kontaktformular – wir prüfen es.";

export async function recordLimitHit(kind: LimitKind, accountId: string, windowSeconds: number): Promise<void> {
  try {
    if (await consume(`limit-hit:${kind}:${accountId}`, 1, windowSeconds)) await recordDenied(`${PREFIX}${kind}`, accountId, kind);
  } catch {
    // Protokollierung darf die Rückmeldung an die Person nie verändern.
  }
}

/** Für S54: Limit-Treffer eines Kontos in den letzten Tagen (nur Art, Anzahl, letzter Zeitpunkt). */
export async function limitHitsFor(accountId: string, days = 30): Promise<{ kind: LimitKind; label: string; count: number; last: Date | null }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ kind: securityEvents.kind, n: count(), last: max(securityEvents.occurredAt) })
    .from(securityEvents)
    .where(and(eq(securityEvents.actorId, accountId), like(securityEvents.kind, `${PREFIX}%`), gt(securityEvents.occurredAt, since)))
    .groupBy(securityEvents.kind);
  return rows
    .map((r) => ({ kind: r.kind.slice(PREFIX.length) as LimitKind, count: Number(r.n), last: r.last ? new Date(r.last) : null }))
    .filter((r) => r.kind in LIMIT_KIND_LABELS)
    .map((r) => ({ ...r, label: LIMIT_KIND_LABELS[r.kind] }));
}
