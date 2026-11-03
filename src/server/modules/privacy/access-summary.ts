import "server-only";
import { sql as dsql } from "drizzle-orm";
import { db } from "../../db";

/**
 * Auskunft (PRI03, PRD 11 Rechteprozess, PRD 15): Angaben zur optionalen Nutzungsstatistik eines
 * Kontos für die Datenschutzstelle – Einwilligungsstand, ob ein Analysebezug besteht, bis wann er
 * gilt und wie viele Rohereignisse vorliegen. Keine Ereignisinhalte; die Person erhält diese mit
 * dem Datenexport («nutzungsstatistik»).
 */
export type AnalyticsAccess = {
  decision: "granted" | "denied" | "withdrawn" | null;
  textVersion: string | null;
  decidedAt: Date | null;
  subjectExpiresAt: Date | null;
  events: number;
  firstDay: string | null;
  lastDay: string | null;
};

export async function analyticsAccessSummary(accountId: string): Promise<AnalyticsAccess> {
  const [r] = (await db.execute(dsql`
    select
      (select decision::text from identity.consent_records where account_id = ${accountId} and purpose = 'analytics' order by decided_at desc limit 1) as decision,
      (select text_version from identity.consent_records where account_id = ${accountId} and purpose = 'analytics' order by decided_at desc limit 1) as text_version,
      (select decided_at from identity.consent_records where account_id = ${accountId} and purpose = 'analytics' order by decided_at desc limit 1) as decided_at,
      s.expires_at as subject_expires_at,
      (select count(*)::int from analytics.events e where e.ref = s.ref) as events,
      (select min(day)::text from analytics.events e where e.ref = s.ref) as first_day,
      (select max(day)::text from analytics.events e where e.ref = s.ref) as last_day
    from (select 1) one
    left join analytics.subjects s on s.account_id = ${accountId}`)) as unknown as {
    decision: AnalyticsAccess["decision"];
    text_version: string | null;
    decided_at: Date | string | null;
    subject_expires_at: Date | string | null;
    events: number | null;
    first_day: string | null;
    last_day: string | null;
  }[];
  const asDate = (v: Date | string | null | undefined) => (v ? new Date(v) : null);
  return {
    decision: r?.decision ?? null,
    textVersion: r?.text_version ?? null,
    decidedAt: asDate(r?.decided_at),
    subjectExpiresAt: asDate(r?.subject_expires_at),
    events: Number(r?.events ?? 0),
    firstDay: r?.first_day ?? null,
    lastDay: r?.last_day ?? null,
  };
}
