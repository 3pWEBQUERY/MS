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
  offersWithoutExpert: number;
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
      (select count(*)::int from content.safety_contacts where active and verified_by ilike 'demo%') as safety_demo,
      (select count(*)::int from content.support_offers o
        where o.status = 'published' and o.next_review_at > now()
          and ((o.topic_slugs && array['recht', 'finanzen'] and not exists (select 1 from content.verification_records r
                 where r.target_type = 'offer' and r.target_id = o.id and r.method = 'expert_social' and r.next_due_at > now()))
            or ('therapie' = any(o.topic_slugs) and not exists (select 1 from content.verification_records r
                 where r.target_type = 'offer' and r.target_id = o.id and r.method = 'expert_medical' and r.next_due_at > now())))) as offers_without_expert`)) as unknown as {
    articles: number;
    medical_without_review: number;
    offers: number;
    groups: number;
    groups_without_moderator: number;
    editors: number;
    reviewers: number;
    safety_active: number;
    safety_demo: number;
    offers_without_expert: number;
  }[];

  const covered = (await db.execute(dsql`
    select distinct unnest(topic_slugs) as slug from content.support_offers
    where status = 'published' and next_review_at > now()`)) as unknown as { slug: string }[];
  const coveredSet = new Set(covered.map((c) => c.slug));

  return {
    articles: row?.articles ?? 0,
    medicalWithoutReview: row?.medical_without_review ?? 0,
    offers: row?.offers ?? 0,
    offersWithoutExpert: row?.offers_without_expert ?? 0,
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
      (select count(*)::int from content.safety_contacts where active and (next_due_at is null or next_due_at < now())) as safety_overdue,
      (select count(*)::int from privacy.requests
        where type in ('erasure_account', 'erasure_health') and status not in ('completed', 'rejected') and due_at < now()) as erasure_overdue,
      (select count(*)::int from messaging.contact_relationships
        where (status = 'active' and (low_consent_at is null or high_consent_at is null))
           or (status in ('ended', 'declined', 'withdrawn', 'expired') and (low_consent_at is not null or high_consent_at is not null))
           or (status = 'pending' and low_consent_at is not null and high_consent_at is not null)) as contact_inconsistent,
      (select count(*)::int from messaging.messages m
        join messaging.conversations c on c.id = m.conversation_id
        join messaging.contact_relationships r on r.id = c.relationship_id
        where m.created_at > now() - interval '30 days'
          and ((r.status <> 'active' and m.created_at > coalesce(r.ended_at, r.requested_at, r.created_at))
            or (r.status = 'active' and r.requested_at is not null and m.created_at > r.requested_at
                and m.created_at < greatest(r.low_consent_at, r.high_consent_at)))) as messages_without_release`)) as unknown as Record<string, number>[];
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
      key: "erasure_overdue",
      label: "Löschaufträge überfällig",
      value: v("erasure_overdue"),
      tripped: v("erasure_overdue") > 0,
      href: "/verwaltung/datenschutz",
      hint: "Offene Löschaufträge (Konto oder Gesundheitsbereich), deren Frist abgelaufen ist (PRI05, R3).",
    },
    {
      key: "contact_release",
      label: "Kontaktfreigabe unzuverlässig",
      value: v("contact_inconsistent") + v("messages_without_release"),
      tripped: v("contact_inconsistent") + v("messages_without_release") > 0,
      href: "/verwaltung/betrieb/einfuehrung#stopp",
      hint: "Prüfabfrage (MSG02, MSG04): Kontaktbeziehungen mit widersprüchlichem Zustand (aktiv ohne beide Zustimmungen, beendet mit Zustimmung) und Nachrichten der letzten 30 Tage, die nach Ende oder vor Annahme der Freigabe gespeichert wurden. Muss 0 sein.",
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
