import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { AuditNav } from "@/components/admin/audit-nav";
import { GRANT_STATUS_LABEL, GRANT_STATUS_TONE, SPECIAL_ACCESS_SCOPES } from "@/components/admin/labels";
import { SpecialAccessRequestForm, SpecialAccessReviewForm } from "@/components/admin/role-forms";
import { AdminEmpty, AdminSectionBlock, DateTime, Deadline, LedgerItem, LedgerList } from "@/components/admin/ui";
import { Badge, Card, Notice, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { revokeSpecialAccessAction } from "@/server/modules/admin/role-actions";
import {
  listSpecialAccess,
  SPECIAL_ACCESS_APPROVE_ROLES,
  SPECIAL_ACCESS_MAX_MINUTES,
  SPECIAL_ACCESS_REQUEST_ROLES,
} from "@/server/modules/admin/roles";

export const metadata: Metadata = { title: "Sonderzugriff" };

/** Sonderzugriff (PRD 03, PRI07): Ticket, Zweck, Umfang, zweite Freigabe, Ablauf ≤ 60 Minuten. */
export default function SpecialAccessPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Content />
    </Suspense>
  );
}

const scopeLabel = (scope: string) => {
  const [code, object] = scope.split(" · ");
  const label = SPECIAL_ACCESS_SCOPES.find((s) => s.value === code)?.label ?? code;
  return object ? `${label} · ${object}` : label;
};

async function Content() {
  const viewer = await requireStaff(SPECIAL_ACCESS_REQUEST_ROLES);
  const grants = await listSpecialAccess();
  const canApprove = viewer.roles.some((r) => SPECIAL_ACCESS_APPROVE_ROLES.includes(r));
  const now = new Date();
  const active = grants.filter((g) => g.status === "approved" || g.status === "requested");
  const past = grants.filter((g) => g.status !== "approved" && g.status !== "requested");

  return (
    <div>
      <PageHeader
        eyebrow="Rollen und Audit"
        title="Sonderzugriff"
        description={`Begründeter, zeitlich begrenzter Zugriff auf Produktionsdaten: Ticket, Zweck, Umfang, zweite Freigabe und automatischer Ablauf nach höchstens ${SPECIAL_ACCESS_MAX_MINUTES} Minuten.`}
      />
      <div className="flex flex-col gap-10">
        <AuditNav roles={viewer.roles} active="sonderzugriff" />

        <Notice tone="neutral" icon="lock" title="Keine stille Sitzungsimitation">
          Ein Sonderzugriff erfolgt über persönliche, protokollierte technische Zugänge – nie durch Anmelden als Mitglied. Gesundheits- und
          Chatdaten sind auch mit allgemeinen Administrationsrechten nicht lesbar.
        </Notice>

        <AdminSectionBlock id="offen" title="Offene und aktive Sonderzugriffe">
          {active.length === 0 ? (
            <AdminEmpty icon="check-circle" title="Kein offener oder aktiver Sonderzugriff" />
          ) : (
            <LedgerList as="ul" className="border-t-ink">
              {active.map((g) => {
                const own = g.requesterId === viewer.accountId;
                const mayRevoke = own || g.approverId === viewer.accountId || viewer.roles.includes("admin");
                return (
                  <LedgerItem key={g.id} tone={g.status === "requested" ? "attention" : "plain"} className="py-6 [&>div]:gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                          <Badge tone={GRANT_STATUS_TONE[g.status]}>{GRANT_STATUS_LABEL[g.status]}</Badge>
                          <span className="font-mono">{g.ticket}</span>
                        </p>
                        {g.status === "approved" && g.expiresAt && (
                          <span className="flex items-center gap-2 text-sm">
                            Ablauf: <Deadline dueAt={g.expiresAt} now={now} total={SPECIAL_ACCESS_MAX_MINUTES * 60_000} />
                          </span>
                        )}
                      </div>
                      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="font-semibold text-ink-2">Umfang</dt>
                          <dd className="text-ink">{scopeLabel(g.scope)}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-ink-2">Beantragt</dt>
                          <dd className="text-ink">
                            {own ? "Du" : g.requester} · <DateTime date={g.createdAt} />
                          </dd>
                        </div>
                        {g.approver && (
                          <div>
                            <dt className="font-semibold text-ink-2">Freigegeben</dt>
                            <dd className="text-ink">
                              {g.approver} · <DateTime date={g.approvedAt} />
                            </dd>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <dt className="font-semibold text-ink-2">Zweck</dt>
                          <dd className="text-ink">
                            <PlainText text={g.purpose} />
                          </dd>
                        </div>
                      </dl>
                      <div className="flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
                        {g.status === "requested" &&
                          (canApprove && !own ? (
                            <SpecialAccessReviewForm grantId={g.id} />
                          ) : (
                            <p className="text-sm text-ink-2">Wartet auf die Freigabe durch eine zweite berechtigte Person.</p>
                          ))}
                        {mayRevoke && (
                          <ActionButton
                            action={revokeSpecialAccessAction}
                            fields={{ grantId: g.id }}
                            label={g.status === "requested" ? "Antrag zurückziehen" : "Sofort widerrufen"}
                            variant="quiet-danger"
                          />
                        )}
                      </div>
                  </LedgerItem>
                );
              })}
            </LedgerList>
          )}
        </AdminSectionBlock>

        <AdminSectionBlock id="antrag" title="Sonderzugriff beantragen">
          <Card className="max-w-2xl">
            <SpecialAccessRequestForm />
          </Card>
        </AdminSectionBlock>

        {past.length > 0 && (
          <AdminSectionBlock id="verlauf" title="Verlauf">
            <ul className="border-t border-line">
              {past.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-3 text-sm">
                  <Badge tone={GRANT_STATUS_TONE[g.status]}>{GRANT_STATUS_LABEL[g.status]}</Badge>
                  <span className="font-mono">{g.ticket}</span>
                  <span className="text-ink-2">{scopeLabel(g.scope)}</span>
                  <span className="text-ink-2">
                    {g.requester}
                    {g.approver && ` · ${g.approver}`} · <DateTime date={g.createdAt} />
                  </span>
                </li>
              ))}
            </ul>
          </AdminSectionBlock>
        )}
      </div>
    </div>
  );
}
