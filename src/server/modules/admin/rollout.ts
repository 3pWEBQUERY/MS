import "server-only";
import { sql as dsql } from "drizzle-orm";
import { HELP_TOPICS } from "@/lib/catalog";
import { db } from "../../db";

/**
 * Einführung und Stoppkriterien (PRD 17) sowie Startbestand (CON08) – nur Zähler, keine Inhalte.
 * Die Ampeln sind Entscheidungshilfen; die Freigabe jedes Rollout-Schritts bleibt eine
 * verantwortete Entscheidung (D06) und wird über Feature-Schalter umgesetzt (HOM08).
 */

/** CON08: Mindestbestand vor Pilotstart. */
export const START_INVENTORY_MIN = { articles: 20, offers: 30, groups: 6 } as const;

export type StartInventory = {
  articles: number;
  medicalWithoutReview: number;
  offers: number;
  groups: number;
  groupsWithoutModerator: number;
  topicsWithoutOffer: string[];
  editors: number;
  reviewers: number;
  safetyActive: number;
  safetyDemoVerified: number;
};

export async function startInventory(): Promise<StartInventory> {
  const [row] = (await db.execute(dsql`
    select
      (select count(*)::int from content.articles a join content.article_versions v on v.id = a.published_version_id
        where v.status = 'published' and v.review_due_at > now()) as articles,
      (select count(*)::int from content.articles a join content.article_versions v on v.id = a.published_version_id
        where v.status = 'published' and v.is_medical
          and not exists (select 1 from content.editorial_reviews r where r.version_id = v.id and r.decision = 'approved')) as medical_without_review,
      (select count(*)::int from content.support_offers where status = 'published' and next_review_at > now()) as offers,
      (select count(*)::int from community.groups where status = 'active') as groups,
      (select count(*)::int from community.groups where status = 'active' and moderator_account_id is null) as groups_without_moderator,
      (select count(distinct account_id)::int from identity.role_assignments
        where role = 'editor' and revoked_at is null and (ends_at is null or ends_at > now())) as editors,
      (select count(distinct account_id)::int from identity.role_assignments
        where role = 'medical_reviewer' and revoked_at is null and (ends_at is null or ends_at > now())) as reviewers,
      (select count(*)::int from content.safety_contacts where active) as safety_active,
      (select count(*)::int from content.safety_contacts where active and verified_by ilike 'demo%') as safety_demo`)) as unknown as {
    articles: number;
    medical_without_review: number;
    offers: number;
    groups: number;
    groups_without_moderator: number;
    editors: number;
    reviewers: number;
    safety_active: number;
    safety_demo: number;
  }[];

  const covered = (await db.execute(dsql`
    select distinct unnest(topic_slugs) as slug from content.support_offers
    where status = 'published' and next_review_at > now()`)) as unknown as { slug: string }[];
  const coveredSet = new Set(covered.map((c) => c.slug));

  return {
    articles: row?.articles ?? 0,
    medicalWithoutReview: row?.medical_without_review ?? 0,
    offers: row?.offers ?? 0,
    groups: row?.groups ?? 0,
    groupsWithoutModerator: row?.groups_without_moderator ?? 0,
    topicsWithoutOffer: HELP_TOPICS.filter(([slug]) => !coveredSet.has(slug)).map(([, name]) => name),
    editors: row?.editors ?? 0,
    reviewers: row?.reviewers ?? 0,
    safetyActive: row?.safety_active ?? 0,
    safetyDemoVerified: row?.safety_demo ?? 0,
  };
}

export type StopSignal = { key: string; label: string; value: number; tripped: boolean; href: string; hint: string };

/**
 * PRD 17: Neue Einladungen pausieren bei unberechtigtem Datenzugriff, unzuverlässiger
 * Kontaktfreigabe, nicht funktionierender Löschung, überlasteter Moderation oder falschem
 * kritischem Hilfeweg. Die Signale zeigen technische Hinweise darauf.
 */
export async function stopSignals(): Promise<StopSignal[]> {
  const [r] = (await db.execute(dsql`
    select
      (select count(*)::int from ops.audit_events where action like 'incident.%' and occurred_at > now() - interval '30 days') as incidents,
      (select count(*)::int from privacy.erasure_tasks where status in ('failed', 'escalated')) as erasure_failed,
      (select count(*)::int from privacy.requests where status = 'failed') as requests_failed,
      (select count(*)::int from moderation.cases where status not in ('decided', 'closed') and due_at < now() - interval '1 day') as cases_overdue,
      (select count(*)::int from content.safety_contacts where active and (next_due_at is null or next_due_at < now())) as safety_overdue`)) as unknown as Record<string, number>[];
  const v = (k: string) => Number(r?.[k] ?? 0);
  return [
    {
      key: "data_access",
      label: "Unberechtigter Datenzugriff",
      value: v("incidents"),
      tripped: v("incidents") > 0,
      href: "/verwaltung/betrieb#vorfall",
      hint: "Protokollierte Sicherheitsvorfall-Schritte in den letzten 30 Tagen. Jeder bestätigte Fehlzugriff stoppt den Rollout (R01).",
    },
    {
      key: "erasure",
      label: "Löschung funktioniert nicht",
      value: v("erasure_failed") + v("requests_failed"),
      tripped: v("erasure_failed") + v("requests_failed") > 0,
      href: "/verwaltung/datenschutz",
      hint: "Fehlgeschlagene oder eskalierte Lösch-Teilschritte und Datenschutzaufträge.",
    },
    {
      key: "moderation",
      label: "Moderation überlastet",
      value: v("cases_overdue"),
      tripped: v("cases_overdue") > 0,
      href: "/verwaltung/moderation",
      hint: "Offene Fälle, deren Frist seit mehr als einem Betriebstag abgelaufen ist (R05).",
    },
    {
      key: "help_path",
      label: "Kritischer Hilfeweg nicht verifiziert",
      value: v("safety_overdue"),
      tripped: v("safety_overdue") > 0,
      href: "/verwaltung/verzeichnis/sicherheit",
      hint: "Aktive Hilfewege mit überfälliger monatlicher Verifikation (SAF06). Hinweise auf falsche Nummern kommen über das Kontaktformular.",
    },
  ];
}
