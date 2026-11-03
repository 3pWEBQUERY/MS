import "server-only";
import { sql as dsql } from "drizzle-orm";
import { ANALYTICS_CONSENT_VERSION } from "@/lib/catalog";
import { ANALYTICS_EVENTS, ANALYTICS_RETENTION_DAYS, suppressedShare, suppressSmall, type AnalyticsEventName } from "@/lib/analytics";
import { db } from "../../db";

/**
 * Aggregatansicht für den Betrieb (PRD 15): nur Personenzahlen, jede Zelle erst ab zehn
 * Personen, kleinere Gruppen und Kombinationen werden unterdrückt (null = «unter 10»).
 * Keine Bezüge, keine Einzelzeilen, keine Verknüpfung mit Tagebuch oder Moderation.
 */

/** Je Ereignis nur die eine erlaubte Dimension (siehe SQL unten) – keine Kombinationen mehrerer Merkmale. */
export const ANALYTICS_DIMENSION: Record<AnalyticsEventName, string> = {
  onboarding_completed: "Variante",
  moment_path_selected: "Weg",
  useful_action_completed: "Aktionstyp",
  core_flow_failed: "Ablauf",
  preference_changed: "Typ",
};

export type EventAggregate = {
  name: AnalyticsEventName;
  persons: number | null;
  breakdown: { value: string; persons: number | null }[];
};

export type CohortAggregate = {
  /** Montag der Kalenderwoche des Einstiegs */
  week: string;
  entered: number | null;
  activated7d: number | null;
  activatedShare: number | null;
  byType: { action: string; persons: number | null }[];
  activeWeek4: number | null;
  week4Share: number | null;
};

export type AnalyticsOverview = {
  windowDays: number;
  consenting: number | null;
  events: EventAggregate[];
  cohorts: CohortAggregate[];
};

export async function analyticsOverview(): Promise<AnalyticsOverview> {
  // Personen mit aktuell gültiger Einwilligung (Basis für die Einwilligungsquote im Pilotbericht).
  const [consent] = (await db.execute(dsql`
    select count(*)::int as n from (
      select distinct on (account_id) account_id, decision, text_version
      from identity.consent_records where purpose = 'analytics'
      order by account_id, decided_at desc
    ) latest where decision = 'granted' and text_version = ${ANALYTICS_CONSENT_VERSION}`)) as unknown as { n: number }[];

  const totals = (await db.execute(dsql`
    select name::text as name, count(distinct ref)::int as persons
    from analytics.events
    where day >= current_date - ${ANALYTICS_RETENTION_DAYS}::int
    group by name`)) as unknown as { name: AnalyticsEventName; persons: number }[];

  const dims = (await db.execute(dsql`
    select name::text as name, coalesce(params->>(
      case name::text
        when 'onboarding_completed' then 'variant'
        when 'moment_path_selected' then 'path'
        when 'useful_action_completed' then 'action'
        when 'core_flow_failed' then 'flow'
        else 'type' end), '') as value,
      count(distinct ref)::int as persons
    from analytics.events
    where day >= current_date - ${ANALYTICS_RETENTION_DAYS}::int
    group by 1, 2`)) as unknown as { name: AnalyticsEventName; value: string; persons: number }[];

  const events: EventAggregate[] = ANALYTICS_EVENTS.map((name) => ({
    name,
    persons: suppressSmall(totals.find((t) => t.name === name)?.persons ?? 0),
    breakdown: dims
      .filter((d) => d.name === name && d.value)
      .sort((a, b) => a.value.localeCompare(b.value))
      .map((d) => ({ value: d.value, persons: suppressSmall(d.persons) })),
  }));

  const weeks = (await db.execute(dsql`
    select to_char(date_trunc('week', day::timestamp), 'YYYY-MM-DD') as week,
      sum(entered)::int as entered, sum(activated_7d)::int as activated, sum(active_week4)::int as week4,
      jsonb_agg(activated_by_type) as by_type
    from analytics.cohort_days
    group by 1 order by 1 desc limit 26`)) as unknown as { week: string; entered: number; activated: number; week4: number; by_type: Record<string, number>[] }[];

  const cohorts: CohortAggregate[] = weeks.map((w) => {
    const byType = new Map<string, number>();
    for (const obj of w.by_type ?? []) for (const [k, v] of Object.entries(obj ?? {})) byType.set(k, (byType.get(k) ?? 0) + Number(v));
    return {
      week: w.week,
      entered: suppressSmall(w.entered),
      activated7d: w.entered >= 10 ? suppressSmall(w.activated) : null,
      activatedShare: suppressedShare(w.activated, w.entered),
      byType: [...byType.entries()].sort().map(([action, n]) => ({ action, persons: w.entered >= 10 ? suppressSmall(n) : null })),
      activeWeek4: w.entered >= 10 ? suppressSmall(w.week4) : null,
      week4Share: suppressedShare(w.week4, w.entered),
    };
  });

  return { windowDays: ANALYTICS_RETENTION_DAYS, consenting: suppressSmall(consent?.n ?? 0), events, cohorts };
}
