import type { Metadata } from "next";
import { Suspense } from "react";
import { PRIORITY_LABEL, ROLE_LABEL, type Priority } from "@/components/admin/labels";
import { AdminSectionBlock, formatSpan, StatGrid, StatTile } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireStaff, type StaffRole, type Viewer } from "@/server/auth/viewer";
import { deliveryProblems, outboxSummary } from "@/server/modules/admin/ops";
import { disabledFlagCount, editorialCounts, privacyCounts } from "@/server/modules/admin/overview";
import { countActiveSpecialAccess, countStaffWithoutMfa, currentQuarter, listAccessReviews } from "@/server/modules/admin/roles";
import { caseCounts, moderationQuality } from "@/server/modules/moderation/cases";

export const metadata: Metadata = { title: "Übersicht" };

const ALL_ROLES: StaffRole[] = ["moderator", "moderation_lead", "editor", "medical_reviewer", "admin", "ops", "privacy_officer"];

/** Verwaltungsübersicht je Rolle – nur Anzahlen, keine Inhalte (S52–S60). */
export default function AdminHome() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Content />
    </Suspense>
  );
}

function SectionLink({ href, children }: { href: string; children: string }) {
  return (
    <ButtonLink href={href} variant="secondary" size="sm" iconRight={<Icon name="arrow-right" className="size-4" />}>
      {children}
    </ButtonLink>
  );
}

async function Content() {
  const viewer = await requireStaff(ALL_ROLES);
  const has = (...r: StaffRole[]) => r.some((x) => viewer.roles.includes(x));
  return (
    <div>
      <PageHeader
        eyebrow="Verwaltung"
        title="Übersicht"
        description={`Angemeldet als ${viewer.pseudonym ?? "Mitarbeitende Person"} · ${viewer.roles.map((r) => ROLE_LABEL[r]).join(", ")}. Du siehst nur deine Aufgabenbereiche.`}
      />
      <div className="flex flex-col gap-12">
        {has("moderator", "moderation_lead") && <ModerationOverview viewer={viewer} />}
        {has("editor", "medical_reviewer") && <EditorialOverview />}
        {has("privacy_officer") && <PrivacyOverview />}
        {has("ops", "admin") && <OpsOverview />}
        {has("admin", "ops", "privacy_officer") && <AccessOverview admin={has("admin")} />}
      </div>
    </div>
  );
}

async function ModerationOverview({ viewer }: { viewer: Viewer }) {
  const [c, q] = await Promise.all([caseCounts(viewer), viewer.roles.includes("moderation_lead") ? moderationQuality() : Promise.resolve(null)]);
  const share = q && q.decided > 0 ? Math.round((q.inTarget / q.decided) * 100) : null;
  return (
    <AdminSectionBlock
      id="moderation"
      title={c.lead ? "Moderation – alle offenen Fälle" : "Moderation – dir zugewiesen"}
      description="Betriebszeit täglich 09–18 Uhr. Fristen gelten als Serviceziele, nicht als Rund-um-die-Uhr-Zusage."
      action={<SectionLink href="/verwaltung/moderation">Zur Moderation</SectionLink>}
    >
      <StatGrid>
        {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => (
          <StatTile
            key={p}
            label={PRIORITY_LABEL[p]}
            value={c.byPriority[p].total}
            tone={c.byPriority[p].overdue > 0 ? "danger" : "neutral"}
            hint={c.byPriority[p].overdue > 0 ? `${c.byPriority[p].overdue} mit Fristverletzung` : "keine Fristverletzung"}
            href={`/verwaltung/moderation?ansicht=${c.lead ? "all" : "mine"}&prioritaet=${p}`}
          />
        ))}
      </StatGrid>
      <StatGrid>
        <StatTile label="Eskaliert" value={c.escalated} icon="warning" tone={c.escalated > 0 ? "warning" : "neutral"} href={c.lead ? "/verwaltung/moderation?ansicht=escalated" : undefined} />
        {c.lead && <StatTile label="Nicht zugewiesen" value={c.unassigned} icon="user" tone={c.unassigned > 0 ? "warning" : "neutral"} href="/verwaltung/moderation?ansicht=unassigned" />}
        {c.lead && (
          <StatTile
            label="Zweite Freigaben offen"
            value={c.approvalsPending}
            icon="gavel"
            tone={c.approvalsOverdue > 0 ? "danger" : c.approvalsPending > 0 ? "warning" : "neutral"}
            hint={c.approvalsOverdue > 0 ? `${c.approvalsOverdue} länger als 24 Stunden offen` : undefined}
            href="/verwaltung/moderation?ansicht=approvals"
          />
        )}
        <StatTile
          label={c.lead ? "Offene Einsprüche" : "Einsprüche zur Prüfung"}
          value={c.appealsOpen}
          icon="scale"
          tone={c.appealsOverdue > 0 ? "danger" : "neutral"}
          hint={c.appealsOverdue > 0 ? `${c.appealsOverdue} über dem Antwortziel` : "Antwortziel 5 Betriebstage"}
          href="/verwaltung/moderation/einsprueche"
        />
      </StatGrid>
      {q && (
        <p className="text-sm text-ink-2">
          Moderationsqualität der letzten 30 Tage:{" "}
          {share === null ? (
            "noch keine entschiedenen Fälle."
          ) : (
            <>
              <span className="tabular font-semibold text-ink">{share} %</span> von {q.decided} Entscheiden innerhalb der Frist (Ziel ≥ 95 %)
              {q.appealsDecided > 0 && (
                <>
                  , <span className="tabular font-semibold text-ink">{q.overturned}</span> von {q.appealsDecided} Einsprüchen gutgeheissen
                </>
              )}
              . Eine niedrige Meldezahl allein ist kein Erfolg.
            </>
          )}
        </p>
      )}
    </AdminSectionBlock>
  );
}

async function EditorialOverview() {
  const e = await editorialCounts();
  return (
    <AdminSectionBlock id="redaktion" title="Redaktion und Verzeichnis" action={<SectionLink href="/verwaltung/redaktion">Zur Redaktion</SectionLink>}>
      <StatGrid>
        <StatTile label="Artikel in Prüfung" value={e.inReview} icon="book" />
        <StatTile label="Zur Überarbeitung zurück" value={e.changesRequested} icon="pencil" />
        <StatTile label="Artikel mit überfälliger Prüfung" value={e.overdueArticles} icon="clock" tone={e.overdueArticles > 0 ? "danger" : "neutral"} />
        <StatTile
          label="Angebote überfällig oder markiert"
          value={e.overdueOffers + e.flaggedOffers}
          icon="pin"
          tone={e.overdueOffers > 0 ? "danger" : e.flaggedOffers > 0 ? "warning" : "neutral"}
          hint={`${e.overdueOffers} überfällig, ${e.flaggedOffers} mit Änderungshinweis`}
        />
      </StatGrid>
    </AdminSectionBlock>
  );
}

async function PrivacyOverview() {
  const p = await privacyCounts();
  return (
    <AdminSectionBlock id="datenschutz" title="Datenschutzaufträge" action={<SectionLink href="/verwaltung/datenschutz">Zum Datenschutz</SectionLink>}>
      <StatGrid>
        <StatTile label="Offene Aufträge" value={p.open} icon="shield" />
        <StatTile label="Frist überschritten" value={p.overdue} icon="clock" tone={p.overdue > 0 ? "danger" : "neutral"} />
        <StatTile label="Fehlgeschlagen" value={p.failed} icon="alert" tone={p.failed > 0 ? "danger" : "neutral"} />
      </StatGrid>
    </AdminSectionBlock>
  );
}

async function OpsOverview() {
  const [o, d, flagsOff] = await Promise.all([outboxSummary(), deliveryProblems(), disabledFlagCount()]);
  const age = o.oldestOpen ? Date.now() - o.oldestOpen.getTime() : 0;
  return (
    <AdminSectionBlock id="betrieb" title="Betrieb" action={<SectionLink href="/verwaltung/betrieb">Zum Betrieb</SectionLink>}>
      <StatGrid>
        <StatTile label="Wartende Ereignisse" value={o.totals.pending} icon="hourglass" hint={o.oldestOpen ? `Queuealter ${formatSpan(age)}` : "Warteschlange leer"} />
        <StatTile label="Fehlerwarteschlange" value={o.totals.dead} icon="alert" tone={o.totals.dead > 0 ? "danger" : "neutral"} hint={`${o.totals.failed} werden wiederholt`} />
        <StatTile label="Zustellprobleme" value={d.failed + d.dead} icon="mail" tone={d.dead > 0 ? "danger" : "neutral"} />
        <StatTile label="Abgeschaltete Bereiche" value={flagsOff} icon="toggle" tone={flagsOff > 0 ? "warning" : "neutral"} />
      </StatGrid>
    </AdminSectionBlock>
  );
}

async function AccessOverview({ admin }: { admin: boolean }) {
  const [sa, noMfa, reviews] = await Promise.all([
    countActiveSpecialAccess(),
    admin ? countStaffWithoutMfa() : Promise.resolve(0),
    admin ? listAccessReviews(4) : Promise.resolve([]),
  ]);
  const quarter = currentQuarter();
  const reviewed = reviews.some((r) => r.period === quarter);
  return (
    <AdminSectionBlock
      id="zugriffe"
      title="Zugriffe und Rollen"
      action={<SectionLink href={admin ? "/verwaltung/audit/rollen" : "/verwaltung/audit/sonderzugriff"}>{admin ? "Zu Rollen und Audit" : "Zum Sonderzugriff"}</SectionLink>}
    >
      <StatGrid>
        <StatTile label="Laufende Sonderzugriffe" value={sa.active} icon="key" tone={sa.active > 0 ? "warning" : "neutral"} href="/verwaltung/audit/sonderzugriff" />
        <StatTile label="Anträge auf Sonderzugriff" value={sa.requested} icon="clipboard" href="/verwaltung/audit/sonderzugriff" />
        {admin && <StatTile label="Rollen ohne MFA" value={noMfa} icon="lock" tone={noMfa > 0 ? "warning" : "neutral"} hint="Rollen sind bis zur Einrichtung nicht nutzbar" href="/verwaltung/audit/rollen" />}
      </StatGrid>
      {admin && !reviewed && (
        <Notice tone="warning" title={`Rechteprüfung ${quarter} ausstehend`}>
          Die quartalsweise Rechteprüfung ist für das laufende Quartal noch nicht dokumentiert.
        </Notice>
      )}
    </AdminSectionBlock>
  );
}
