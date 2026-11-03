import { sql as dsql } from "drizzle-orm";
import { ANALYTICS_RETENTION_DAYS } from "@/lib/analytics";
import { ANALYTICS_CONSENT_VERSION } from "@/lib/catalog";
import { db } from "@/server/db";
import type { PeriodicTask } from "../types";

/**
 * Optionale Analytics (PRD 15): Kohorten vor Ablauf der Rohdaten aggregieren, danach löschen.
 * – Bezug und Rohdaten höchstens 30 Tage (Kaskade subjects → events)
 * – Widerruf, Kontolöschung oder neue Einwilligungsfassung entfernen rückführbare Rohdaten
 * – Kohortenzähler enthalten keinen Bezug; Ausgabe erst ab zehn Personen (Aggregatansicht)
 */

/** Tag d gilt als vollständig, wenn Woche 4 (Tag 21–27) vorbei ist; vor Tag 30 sind die Rohdaten noch da. */
const COHORT_MIN_AGE = 28;
const COHORT_MAX_AGE = ANALYTICS_RETENTION_DAYS - 1;

export async function computeCohortDays(): Promise<number> {
  const rows = (await db.execute(dsql`
    with days as (
      select (current_date - g)::date as day
      from generate_series(${COHORT_MIN_AGE}::int, ${COHORT_MAX_AGE}::int) g
      where not exists (select 1 from analytics.cohort_days c where c.day = current_date - g)
    ),
    base as (
      select d.day, e.ref from days d
      join analytics.events e on e.name = 'onboarding_completed' and e.day = d.day
    ),
    useful as (
      select b.day as cohort, e.ref, e.day, e.params->>'action' as action
      from base b
      join analytics.events e on e.ref = b.ref and e.name = 'useful_action_completed' and (e.params->>'success') = 'true'
    ),
    by_type as (
      select cohort, jsonb_object_agg(action, n) as obj from (
        select cohort, action, count(distinct ref)::int as n from useful
        where day between cohort and cohort + 6 group by cohort, action
      ) x group by cohort
    )
    insert into analytics.cohort_days (day, entered, activated_7d, activated_by_type, active_week4)
    select d.day,
      (select count(distinct ref) from base b where b.day = d.day)::int,
      (select count(distinct ref) from useful u where u.cohort = d.day and u.day between d.day and d.day + 6)::int,
      coalesce((select obj from by_type t where t.cohort = d.day), '{}'::jsonb),
      (select count(distinct ref) from useful u where u.cohort = d.day and u.day between d.day + 21 and d.day + 27)::int
    from days d
    on conflict (day) do nothing
    returning day`)) as unknown as { day: string }[];
  return rows.length;
}

export const analyticsTasks: PeriodicTask[] = [
  {
    name: "analytics-cohorts",
    everyMs: 60 * 60 * 1000,
    run: async () => {
      const n = await computeCohortDays();
      if (n) console.log(`[worker] analytics: ${n} Kohortentage aggregiert`);
    },
  },
  {
    name: "analytics-retention",
    everyMs: 10 * 60 * 1000,
    run: async () => {
      // Abgelaufener Bezug (≤ 30 Tage) – Ereignisse folgen per Kaskade.
      await db.execute(dsql`delete from analytics.subjects where expires_at <= now()`);
      await db.execute(dsql`delete from analytics.events where day < current_date - ${ANALYTICS_RETENTION_DAYS}::int`);
      // Widerruf, abgelehnte oder veraltete Einwilligung, Konto in Löschung: rückführbare Rohdaten entfernen.
      await db.execute(dsql`
        delete from analytics.subjects s
        where not exists (
          select 1 from (
            select decision, text_version from identity.consent_records c
            where c.account_id = s.account_id and c.purpose = 'analytics'
            order by c.decided_at desc limit 1
          ) latest
          where latest.decision = 'granted' and latest.text_version = ${ANALYTICS_CONSENT_VERSION}
        )
        or exists (select 1 from identity.accounts a where a.id = s.account_id and a.status in ('deletion_pending', 'deleted'))`);
      // Kohortenzähler sind anonym; vorläufige Aufbewahrung 24 Monate bis zur Freigabe D05.
      await db.execute(dsql`delete from analytics.cohort_days where day < current_date - 730`);
    },
  },
];
