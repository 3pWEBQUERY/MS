import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
  OPERATING_HOURS_NOTE,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  REPORT_REASON_LABEL,
  TARGET_LABEL,
  type CaseStatus,
  type Priority,
} from "@/components/admin/labels";
import { param, query } from "@/components/admin/params";
import { AdminSectionBlock, DateTime, Deadline, FilterForm, MoreLink, PlainSelect, StatGrid, StatTile } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, EmptyState, Notice, PageHeader, PageSkeleton, SegmentNav, Table } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { reactionDone } from "@/server/modules/moderation/operating-hours";
import {
  caseCounts,
  listCases,
  pendingApprovals,
  secondApprovalDueAt,
  type CaseScope,
} from "@/server/modules/moderation/cases";

export const metadata: Metadata = { title: "Moderation" };

/** S52 Moderationsübersicht (SAF03): zugewiesene Fälle, Priorität, Frist, unbearbeitete Eskalationen. */
export default function ModerationPage({ searchParams }: PageProps<"/verwaltung/moderation">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

const SCOPES: { value: CaseScope; label: string; leadOnly: boolean }[] = [
  { value: "mine", label: "Mir zugewiesen", leadOnly: false },
  { value: "all", label: "Alle", leadOnly: true },
  { value: "unassigned", label: "Nicht zugewiesen", leadOnly: true },
  { value: "escalated", label: "Eskaliert", leadOnly: true },
  { value: "approvals", label: "Zweite Freigaben", leadOnly: true },
];

const STATUS_FILTER = [
  { value: "open", label: "Offen (neu bis eskaliert)" },
  ...(Object.keys(CASE_STATUS_LABEL) as CaseStatus[]).map((s) => ({ value: s, label: CASE_STATUS_LABEL[s] })),
  { value: "any", label: "Alle Status" },
];

async function Content({ searchParams }: { searchParams: PageProps<"/verwaltung/moderation">["searchParams"] }) {
  const viewer = await requireStaff(["moderator", "moderation_lead"]);
  const sp = await searchParams;
  const lead = viewer.roles.includes("moderation_lead");
  const scopeParam = param(sp.ansicht) as CaseScope;
  const scope: CaseScope = SCOPES.some((s) => s.value === scopeParam && (lead || !s.leadOnly)) ? scopeParam : "mine";
  const statusParam = param(sp.status);
  const status = STATUS_FILTER.some((s) => s.value === statusParam) ? (statusParam as CaseStatus | "open" | "any") : scope === "approvals" ? "any" : "open";
  const prioParam = param(sp.prioritaet) as Priority;
  const priority = prioParam in PRIORITY_LABEL ? prioParam : undefined;
  const cursor = param(sp.cursor) || null;

  const [list, counts, approvals] = await Promise.all([
    listCases(viewer, { scope, status, priority, cursor }),
    caseCounts(viewer),
    scope === "approvals" ? pendingApprovals(viewer) : Promise.resolve([]),
  ]);
  const now = new Date();
  const base = "/verwaltung/moderation";

  return (
    <div>
      <PageHeader
        eyebrow="Moderation"
        title="Moderationsübersicht"
        description={lead ? "Alle Fälle, Zuweisung und Eskalationen." : "Fälle, die dir zugewiesen sind."}
        actions={
          <ButtonLink href="/verwaltung/moderation/einsprueche" variant="secondary" icon={<Icon name="scale" className="size-5" />}>
            Einsprüche
            {counts.appealsOpen > 0 && <span className="tabular rounded-[6px] bg-sunk px-1.5 text-sm">{counts.appealsOpen}</span>}
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-10">

      <section aria-labelledby="kennzahlen" className="flex flex-col gap-4">
        <h2 id="kennzahlen" className="sr-only">
          Offene Fälle nach Priorität
        </h2>
        <StatGrid>
          {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => {
            const c = counts.byPriority[p];
            return (
              <StatTile
                key={p}
                label={PRIORITY_LABEL[p]}
                value={c.total}
                tone={c.overdue > 0 ? "danger" : "neutral"}
                hint={c.overdue > 0 ? `${c.overdue} überfällig` : "keine überfällig"}
                href={query(base, { ansicht: scope, prioritaet: p })}
              />
            );
          })}
        </StatGrid>
        <p className="text-sm text-ink-2">{OPERATING_HOURS_NOTE}</p>
      </section>

      {counts.byPriority.P0.total > 0 && (
        <Notice
          tone="danger"
          icon="shield-alert"
          role="status"
          title={counts.byPriority.P0.total === 1 ? "Ein offener Fall mit akuter Gefahr (P0)" : `${counts.byPriority.P0.total} offene Fälle mit akuter Gefahr (P0)`}
          action={
            <Link href={query(base, { ansicht: lead ? "all" : "mine", prioritaet: "P0" })} className="font-semibold text-ink underline underline-offset-4">
              P0-Fälle ansehen
            </Link>
          }
        >
          Prüfung binnen 30 Minuten während der Betriebszeit. Krisenablauf K01 beachten; die Moderationsleitung wird automatisch alarmiert.
        </Notice>
      )}

      {lead && counts.escalated > 0 && (
        <Notice
          tone="warning"
          title={counts.escalated === 1 ? "Eine Eskalation wartet auf die Leitung" : `${counts.escalated} Eskalationen warten auf die Leitung`}
          action={
            <Link href={query(base, { ansicht: "escalated" })} className="font-semibold text-ink underline underline-offset-4">
              Eskalationen ansehen
            </Link>
          }
        />
      )}
      {lead && counts.approvalsOverdue > 0 && (
        <Notice tone="danger" title="Zweite Freigabe überfällig">
          {counts.approvalsOverdue === 1 ? "Eine schwere Massnahme wurde" : `${counts.approvalsOverdue} schwere Massnahmen wurden`} nicht
          binnen 24 Betriebsstunden durch eine zweite Person geprüft.
        </Notice>
      )}

      <div className="flex flex-col gap-4">
        <SegmentNav
          label="Ansicht"
          items={SCOPES.filter((s) => lead || !s.leadOnly).map((s) => ({
            href: query(base, { ansicht: s.value }),
            label: s.label,
            active: s.value === list.scope,
            count:
              s.value === "unassigned"
                ? counts.unassigned
                : s.value === "escalated"
                  ? counts.escalated
                  : s.value === "approvals"
                    ? counts.approvalsPending
                    : undefined,
          }))}
        />
        <FilterForm action={base}>
          <input type="hidden" name="ansicht" value={list.scope} />
          <PlainSelect id="f-status" name="status" label="Status" defaultValue={status} options={STATUS_FILTER} />
          <PlainSelect
            id="f-prio"
            name="prioritaet"
            label="Priorität"
            defaultValue={priority ?? ""}
            options={[{ value: "", label: "Alle Prioritäten" }, ...(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))]}
          />
        </FilterForm>
      </div>

      {list.scope === "approvals" && (
        <AdminSectionBlock
          id="freigaben"
          title="Offene zweite Freigaben"
          description="Schwere Massnahmen werden binnen 24 Betriebsstunden durch eine andere zuständige Person geprüft (SAF04)."
        >
          {approvals.length === 0 ? (
            <EmptyState icon="check-circle" title="Keine offenen Freigaben">
              Alle schweren Massnahmen sind geprüft.
            </EmptyState>
          ) : (
            <Table>
              <caption className="sr-only">Offene zweite Freigaben</caption>
              <thead>
                <tr>
                  <th scope="col">Fall</th>
                  <th scope="col">Massnahme</th>
                  <th scope="col">Festgehalten von</th>
                  <th scope="col">Frist Zweitprüfung</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.actionId}>
                    <td>
                      <Link href={`/verwaltung/moderation/${a.caseId}#freigabe`} className="tabular font-mono font-semibold text-ink underline underline-offset-4">
                        {a.caseNumber}
                      </Link>
                    </td>
                    <td>{a.kind === "account_suspend" ? "Kontosperre" : a.kind === "write_suspend" ? "Schreibsperre" : "Inhalt ausgeblendet"}</td>
                    <td>{a.actorId === viewer.accountId ? "Du (Freigabe durch andere Person nötig)" : a.actor}</td>
                    <td>
                      <Deadline
                        dueAt={secondApprovalDueAt(a.createdAt)}
                        now={now}
                        total={secondApprovalDueAt(a.createdAt).getTime() - a.createdAt.getTime()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AdminSectionBlock>
      )}

      <AdminSectionBlock id="faelle" title="Fälle" description="Sortiert nach Frist. Frist und Ampel gelten bis zum Entscheid.">
        {list.rows.length === 0 ? (
          <EmptyState icon="check-circle" title={list.scope === "mine" ? "Dir sind keine passenden Fälle zugewiesen" : "Keine passenden Fälle"}>
            {lead ? "Passe Ansicht oder Filter an, um weitere Fälle zu sehen." : "Neue Fälle weist dir die Moderationsleitung zu."}
          </EmptyState>
        ) : (
          <Table>
            <caption className="sr-only">Moderationsfälle</caption>
            <thead>
              <tr>
                <th scope="col">Fall</th>
                <th scope="col">Priorität</th>
                <th scope="col">Status</th>
                <th scope="col">Frist</th>
                <th scope="col">Gründe</th>
                <th scope="col">Zuständig</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((c) => {
                // Kapitel 10: Reaktionsziel – P0–P2 mit der Triage, P3 mit dem Entscheid erreicht.
                const done = reactionDone(c.priority, c.status);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <Link href={`/verwaltung/moderation/${c.id}`} className="tabular font-mono font-semibold text-ink underline underline-offset-4">
                          {c.caseNumber}
                        </Link>
                        <span className="text-sm text-ink-2">
                          {TARGET_LABEL[c.targetType] ?? c.targetType} · <DateTime date={c.createdAt} />
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge tone={PRIORITY_TONE[c.priority]}>{c.priority}</Badge>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={CASE_STATUS_TONE[c.status]}>{CASE_STATUS_LABEL[c.status]}</Badge>
                        {c.pendingApprovals > 0 && <Badge tone="warning">Freigabe offen</Badge>}
                      </div>
                    </td>
                    <td>
                      <Deadline dueAt={c.dueAt} now={now} total={c.dueAt.getTime() - c.createdAt.getTime()} done={done} />
                    </td>
                    <td className="text-sm text-ink-2">
                      {c.reasons.map((r) => REPORT_REASON_LABEL[r] ?? r).join(", ") || "–"}
                      <span className="block tabular">
                        {c.reportCount === 1 ? "1 Meldung" : `${c.reportCount} Meldungen`}
                      </span>
                    </td>
                    <td className="text-sm">{c.assigneeId === viewer.accountId ? "Du" : (c.assignee ?? <span className="text-ink-2">Nicht zugewiesen</span>)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <MoreLink
          href={
            list.nextCursor
              ? query(base, { ansicht: list.scope, status, prioritaet: priority ?? null, cursor: list.nextCursor })
              : null
          }
        />
      </AdminSectionBlock>
      </div>
    </div>
  );
}
