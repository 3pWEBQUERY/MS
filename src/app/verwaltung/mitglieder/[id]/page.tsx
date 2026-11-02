import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_STATUS_TONE,
  APPEAL_STATUS_LABEL,
  APPEAL_STATUS_TONE,
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
  PRIORITY_TONE,
  ROLE_LABEL,
  SANCTION_LABEL,
} from "@/components/admin/labels";
import { AccountStatusForm, LiftSanctionForm } from "@/components/admin/member-forms";
import { AdminSectionBlock, DateTime } from "@/components/admin/ui";
import { Badge, Card, EmptyState, KeyValue, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { getMemberForStaff } from "@/server/modules/admin/members";

export const metadata: Metadata = { title: "Mitglied" };

/** S54 Mitgliedsdetail (ACC08, SAF04): nur Konto-Metadaten, keine privaten Inhalte (AT03). */
export default function MemberPage({ params }: PageProps<"/verwaltung/mitglieder/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/verwaltung/mitglieder/[id]">["params"] }) {
  const viewer = await requireStaff(["moderation_lead", "admin"]);
  const { id } = await params;
  const m = await getMemberForStaff(viewer, id);
  if (!m) notFound();
  const canOpenCases = viewer.roles.includes("moderation_lead");
  const manageable = ["active", "restricted", "suspended"].includes(m.status);

  return (
    <div>
      <PageHeader
        back={{ href: "/verwaltung/mitglieder", label: "Mitgliedersuche" }}
        eyebrow="Mitglied"
        title={m.pseudonym}
        description={<Badge tone={ACCOUNT_STATUS_TONE[m.status]}>{ACCOUNT_STATUS_LABEL[m.status]}</Badge>}
      />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <AdminSectionBlock id="konto" title="Konto">
            <Card>
              <KeyValue
                items={[
                  ["Konto-ID", <span key="id" className="break-all font-mono text-sm">{m.id}</span>],
                  ["Kontostatus", ACCOUNT_STATUS_LABEL[m.status]],
                  ["Registriert", <DateTime key="r" date={m.createdAt} />],
                  ["Zweiter Faktor", m.mfaEnabled ? "Aktiviert" : "Nicht aktiviert"],
                  ...(m.roles.length > 0 ? ([["Rollen", m.roles.map((r) => ROLE_LABEL[r]).join(", ")]] as [string, string][]) : []),
                  ...(m.deletionScheduledAt ? ([["Löschung geplant", <DateTime key="d" date={m.deletionScheduledAt} />]] as [string, ReactNode][]) : []),
                  ...(m.maskedEmail ? ([["E-Mail (maskiert)", <span key="e" className="font-mono">{m.maskedEmail}</span>]] as [string, ReactNode][]) : []),
                ]}
              />
            </Card>
            <Notice tone="neutral" icon="lock">
              Tagebuch, Nachrichten und Gesundheitsdaten sind nicht Teil der Mitgliederverwaltung.
            </Notice>
          </AdminSectionBlock>

          <AdminSectionBlock id="sanktionen" title="Sanktionen" description="Community-Sanktionen entziehen keine Datenschutzrechte.">
            {m.sanctions.length === 0 ? (
              <EmptyState icon="check-circle" title="Keine Sanktionen" />
            ) : (
              <Table>
                <caption className="sr-only">Sanktionen</caption>
                <thead>
                  <tr>
                    <th scope="col">Art</th>
                    <th scope="col">Zeitraum</th>
                    <th scope="col">Fall</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Aktion</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {m.sanctions.map((s) => (
                    <tr key={s.id}>
                      <td>{SANCTION_LABEL[s.kind] ?? s.kind}</td>
                      <td className="text-sm">
                        <DateTime date={s.startsAt} /> bis {s.endsAt ? <DateTime date={s.endsAt} /> : "unbefristet"}
                      </td>
                      <td className="tabular font-mono text-sm">{s.caseNumber ?? "–"}</td>
                      <td>
                        {s.active ? (
                          <Badge tone="warning">Aktiv</Badge>
                        ) : s.liftedAt ? (
                          <Badge tone="outline">Aufgehoben</Badge>
                        ) : (
                          <Badge tone="outline">Beendet</Badge>
                        )}
                      </td>
                      <td>{s.active && !m.isSelf && <LiftSanctionForm sanctionId={s.id} />}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </AdminSectionBlock>

          <AdminSectionBlock id="faelle" title="Fälle als betroffene Person" description="Nur Metadaten. Belege sind ausschliesslich im zugewiesenen Fall sichtbar.">
            {m.cases.length === 0 ? (
              <p className="text-ink-2">Keine Fälle.</p>
            ) : (
              <Table>
                <caption className="sr-only">Fälle</caption>
                <thead>
                  <tr>
                    <th scope="col">Fall</th>
                    <th scope="col">Priorität</th>
                    <th scope="col">Status</th>
                    <th scope="col">Eingang</th>
                    <th scope="col">Entscheid</th>
                  </tr>
                </thead>
                <tbody>
                  {m.cases.map((c) => (
                    <tr key={c.id}>
                      <td className="tabular font-mono text-sm">
                        {canOpenCases ? (
                          <Link href={`/verwaltung/moderation/${c.id}`} className="font-semibold text-ink underline underline-offset-4">
                            {c.caseNumber}
                          </Link>
                        ) : (
                          c.caseNumber
                        )}
                      </td>
                      <td>
                        <Badge tone={PRIORITY_TONE[c.priority]}>{c.priority}</Badge>
                      </td>
                      <td>
                        <Badge tone={CASE_STATUS_TONE[c.status]}>{CASE_STATUS_LABEL[c.status]}</Badge>
                      </td>
                      <td className="text-sm">
                        <DateTime date={c.createdAt} />
                      </td>
                      <td className="text-sm">
                        <DateTime date={c.decidedAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </AdminSectionBlock>

          <AdminSectionBlock id="einsprueche" title="Einsprüche">
            {m.appeals.length === 0 ? (
              <p className="text-ink-2">Keine Einsprüche.</p>
            ) : (
              <Table>
                <caption className="sr-only">Einsprüche</caption>
                <thead>
                  <tr>
                    <th scope="col">Fall</th>
                    <th scope="col">Status</th>
                    <th scope="col">Eingang</th>
                  </tr>
                </thead>
                <tbody>
                  {m.appeals.map((a) => (
                    <tr key={a.id}>
                      <td className="tabular font-mono text-sm">
                        {canOpenCases ? (
                          <Link href={`/verwaltung/moderation/einsprueche/${a.id}`} className="font-semibold text-ink underline underline-offset-4">
                            {a.caseNumber}
                          </Link>
                        ) : (
                          a.caseNumber
                        )}
                      </td>
                      <td>
                        <Badge tone={APPEAL_STATUS_TONE[a.status]}>{APPEAL_STATUS_LABEL[a.status]}</Badge>
                      </td>
                      <td className="text-sm">
                        <DateTime date={a.createdAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </AdminSectionBlock>
        </div>

        <aside className="flex flex-col gap-6" aria-label="Kontostatus ändern">
          {m.viewerIsAdmin && !m.isSelf && manageable && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-lg font-[650] text-ink">Kontostatus ändern</h2>
              <p className="text-sm text-ink-2">
                «Eingeschränkt» sperrt das Schreiben in der Community, «Gesperrt» den Zugang zu sozialen Funktionen. Löschung läuft über die
                Datenschutzstelle.
              </p>
              <AccountStatusForm accountId={m.id} version={m.version} current={m.status} />
            </Card>
          )}
          {m.isSelf && (
            <Notice tone="info" title="Eigenes Konto">
              Änderungen am eigenen Konto nimmt eine andere berechtigte Person vor.
            </Notice>
          )}
          {!manageable && (
            <Notice tone="neutral" title="Status über eigenen Ablauf">
              {ACCOUNT_STATUS_LABEL[m.status]}: Dieser Status wird über Bestätigung bzw. Löschauftrag gesteuert.
            </Notice>
          )}
        </aside>
      </div>
    </div>
  );
}
