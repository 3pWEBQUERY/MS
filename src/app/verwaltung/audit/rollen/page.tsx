import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { AuditNav } from "@/components/admin/audit-nav";
import { ROLE_LABEL } from "@/components/admin/labels";
import { AccessReviewForm, GrantRoleForm, OffboardForm } from "@/components/admin/role-forms";
import { AdminEmpty, AdminSectionBlock, DateTime } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, Notice, PageHeader, PageSkeleton, PlainText, Table } from "@/components/ui/primitives";
import { localDateString } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { revokeRoleAction } from "@/server/modules/admin/role-actions";
import { currentQuarter, listAccessReviews, listStaff, recentQuarters } from "@/server/modules/admin/roles";

export const metadata: Metadata = { title: "Rollen" };

/** S59 Rollen und Rechteprüfung (ACC05, ACC08, PRI08) – nur Administration. */
export default function RolesPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const viewer = await requireStaff(["admin"]);
  const [staff, reviews] = await Promise.all([listStaff(), listAccessReviews()]);
  const quarter = currentQuarter();
  const reviewedThisQuarter = reviews.some((r) => r.period === quarter);
  const now = new Date();

  return (
    <div>
      <PageHeader
        eyebrow="Rollen und Audit"
        title="Rollen und Rechteprüfung"
        description="Rollen vergeben, befristen und entziehen. Jede Änderung erfordert eine MFA-bestätigte Sitzung und wird protokolliert."
      />
      <div className="flex flex-col gap-10">
        <AuditNav roles={viewer.roles} active="rollen" />

        <Notice tone="info" title="Regeln für Rollen">
          <ul className="ml-5 flex list-disc flex-col gap-1">
            <li>Niemand vergibt oder entzieht sich selbst Rollen. Es gibt keinen gemeinsamen Administrationszugang.</li>
            <li>Ohne eingerichtete MFA ist eine Rolle nicht nutzbar – der Verwaltungsbereich verlangt den zweiten Faktor.</li>
            <li>Änderungen gelten ab der nächsten Anfrage der Person. Beim Austritt werden zusätzlich alle Sitzungen widerrufen.</li>
          </ul>
        </Notice>

        {!reviewedThisQuarter && (
          <Notice tone="warning" title={`Rechteprüfung ${quarter} noch nicht dokumentiert`}>
            Prüfe alle aktiven Rollen, Befristungen und den MFA-Status und dokumentiere das Ergebnis unten.
          </Notice>
        )}

        <AdminSectionBlock id="mitarbeitende" title="Mitarbeitende mit Rollen">
          {staff.length === 0 ? (
            <AdminEmpty icon="users" title="Keine Rollen vergeben" />
          ) : (
            <ul className="border-t border-ink">
              {staff.map((m) => {
                const self = m.id === viewer.accountId;
                return (
                  <li key={m.id} className="grid gap-4 border-b border-line py-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-10">
                      <div className="flex flex-col items-start gap-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-semibold text-ink">
                            {m.pseudonym}
                            {self && <span className="font-normal text-ink-2"> (du)</span>}
                          </p>
                          <p className="break-all font-mono text-xs text-ink-2">{m.id}</p>
                        </div>
                        {m.mfaEnabled ? (
                          <Badge tone="success" icon="shield-check">
                            MFA aktiv
                          </Badge>
                        ) : (
                          <Badge tone="warning" icon="warning">
                            MFA fehlt – Rollen nicht nutzbar
                          </Badge>
                        )}
                      {m.status !== "active" && (
                        <p className="text-sm text-ink-2">Konto nicht aktiv – Rollen sind wirkungslos.</p>
                      )}
                      </div>
                      <div className="flex min-w-0 flex-col gap-3">
                      <ul className="flex flex-col divide-y divide-line [&>li:first-child]:pt-0">
                        {m.assignments.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-ink">{ROLE_LABEL[a.role]}</span>
                              <span className="text-sm text-ink-2">
                                {a.startsAt > now ? (
                                  <>
                                    ab <DateTime date={a.startsAt} />
                                  </>
                                ) : a.endsAt ? (
                                  <>
                                    befristet bis <DateTime date={a.endsAt} />
                                  </>
                                ) : (
                                  "unbefristet"
                                )}
                                {a.grantedBy && <> · vergeben von {a.grantedBy}</>}
                              </span>
                            </div>
                            {!self && (
                              <ActionButton
                                action={revokeRoleAction}
                                fields={{ assignmentId: a.id }}
                                label="Entziehen"
                                variant="quiet-danger"
                                confirm={{
                                  title: `Rolle «${ROLE_LABEL[a.role]}» entziehen?`,
                                  body: `${m.pseudonym} verliert den Zugriff ab der nächsten Anfrage. Die Änderung wird protokolliert.`,
                                  confirmLabel: "Rolle entziehen",
                                  variant: "danger",
                                }}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                      {!self && (
                        <details className="group">
                          <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-[10px] pr-2 text-sm font-semibold text-ink">
                            <Icon name="chevron-right" className="size-4 transition-transform group-open:rotate-90" />
                            Austritt: alle Rollen entziehen
                          </summary>
                          <div className="mt-2 rounded-[16px] bg-sunk p-4">
                            <OffboardForm accountId={m.id} pseudonym={m.pseudonym} />
                          </div>
                        </details>
                      )}
                      </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSectionBlock>

        <AdminSectionBlock
          id="vergeben"
          title="Rolle vergeben"
          description="Die Konto-ID findest du in der Mitgliederverwaltung. Vergib nur die Rollen, die für die Aufgabe nötig sind."
        >
          <Card className="max-w-2xl">
            <GrantRoleForm minDate={localDateString()} />
          </Card>
        </AdminSectionBlock>

        <AdminSectionBlock id="pruefung" title="Quartalsweise Rechteprüfung" description="PRI08: Ergebnis je Quartal dokumentieren.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <AccessReviewForm quarters={recentQuarters(4)} />
            </Card>
            {reviews.length === 0 ? (
              <AdminEmpty icon="list-checks" title="Noch keine Rechteprüfung dokumentiert" />
            ) : (
              <Table>
                <caption className="sr-only">Dokumentierte Rechteprüfungen</caption>
                <thead>
                  <tr>
                    <th scope="col">Quartal</th>
                    <th scope="col">Geprüft</th>
                    <th scope="col">Ergebnis</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular font-mono">{r.period}</td>
                      <td className="text-sm">
                        <DateTime date={r.createdAt} />
                        {r.reviewer && <span className="block text-ink-2">{r.reviewer}</span>}
                      </td>
                      <td className="text-sm">{r.note ? <PlainText text={r.note} /> : <span className="text-ink-2">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </AdminSectionBlock>
      </div>
    </div>
  );
}
