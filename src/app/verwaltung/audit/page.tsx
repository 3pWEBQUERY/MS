import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditNav } from "@/components/admin/audit-nav";
import { ROLE_LABEL, type StaffRoleKey } from "@/components/admin/labels";
import { param, query } from "@/components/admin/params";
import { VerifyChainForm } from "@/components/admin/role-forms";
import { AdminSectionBlock, DateTime, FilterForm, MoreLink, PlainInput, PlainSelect, ShortId } from "@/components/admin/ui";
import { Badge, Card, EmptyState, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { audit } from "@/server/audit";
import { requireStaff } from "@/server/auth/viewer";
import { AUDIT_READ_ROLES, auditActionPrefixes, listAuditEvents, securityEventSummary } from "@/server/modules/admin/audit-chain";
import { actorRoleFor } from "@/server/modules/admin/common";

export const metadata: Metadata = { title: "Rollen und Audit" };

/** S59 Zugriffsprotokoll (PRI07): eingeschränkt lesbar, Zugriff wird selbst protokolliert. */
export default function AuditPage({ searchParams }: PageProps<"/verwaltung/audit">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

const RESULT_TONE = { ok: "success", denied: "warning", failed: "danger" } as const;
const RESULT_LABEL = { ok: "OK", denied: "Verweigert", failed: "Fehlgeschlagen" } as const;

async function Content({ searchParams }: { searchParams: PageProps<"/verwaltung/audit">["searchParams"] }) {
  const viewer = await requireStaff([...AUDIT_READ_ROLES]);
  const sp = await searchParams;
  const filter = {
    action: param(sp.aktion).slice(0, 60),
    actorId: param(sp.akteur).slice(0, 36),
    from: param(sp.von).slice(0, 10),
    to: param(sp.bis).slice(0, 10),
    cursor: param(sp.cursor).slice(0, 20),
  };

  // PRI07: Zugriff auf das Audit ist selbst protokolliert.
  await audit({
    actorId: viewer.accountId,
    actorRole: actorRoleFor(viewer, [...AUDIT_READ_ROLES]),
    action: "audit.viewed",
    objectType: "audit_log",
  });

  const [events, prefixes, security] = await Promise.all([listAuditEvents(filter), auditActionPrefixes(), securityEventSummary(30)]);
  const base = "/verwaltung/audit";

  return (
    <div>
      <PageHeader
        eyebrow="Rollen und Audit"
        title="Zugriffsprotokoll"
        description="Handelnde Person, Rolle, Aktion, Objekt, Zeit und Ergebnis – ohne Nachrichtentexte, Tagebuchwerte oder Freitexte."
      />
      <div className="flex flex-col gap-10">
        <AuditNav roles={viewer.roles} active="protokoll" />

        <AdminSectionBlock
          id="kette"
          title="Manipulationsschutz"
          description="Jeder Eintrag enthält die Prüfsumme des vorherigen. Die Prüfung rechnet die gesamte Kette nach."
        >
          <Card>
            <VerifyChainForm />
          </Card>
        </AdminSectionBlock>

        <AdminSectionBlock id="eintraege" title="Einträge">
          <FilterForm action={base}>
            <PlainSelect
              id="f-aktion"
              name="aktion"
              label="Aktion"
              defaultValue={filter.action}
              options={[{ value: "", label: "Alle Aktionen" }, ...prefixes.map((p) => ({ value: p, label: p }))]}
            />
            <PlainInput id="f-akteur" name="akteur" label="Akteur (Konto-ID)" defaultValue={filter.actorId} />
            <PlainInput id="f-von" name="von" type="date" label="Von" defaultValue={filter.from} />
            <PlainInput id="f-bis" name="bis" type="date" label="Bis" defaultValue={filter.to} />
          </FilterForm>
          {events.rows.length === 0 ? (
            <EmptyState icon="audit" title="Keine passenden Einträge" />
          ) : (
            <Table>
              <caption className="sr-only">Auditeinträge, neueste zuerst</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Zeit</th>
                  <th scope="col">Akteur</th>
                  <th scope="col">Aktion</th>
                  <th scope="col">Objekt</th>
                  <th scope="col">Anlass</th>
                  <th scope="col">Ergebnis</th>
                </tr>
              </thead>
              <tbody>
                {events.rows.map((e) => (
                  <tr key={e.id}>
                    <td className="tabular font-mono text-sm text-ink-2">{e.id}</td>
                    <td className="text-sm">
                      <DateTime date={e.occurredAt} />
                    </td>
                    <td className="text-sm">
                      {e.actorId ? (
                        <div className="flex flex-col">
                          <span>{e.actor ?? <ShortId id={e.actorId} />}</span>
                          {e.actorRole && <span className="text-ink-2">{ROLE_LABEL[e.actorRole as StaffRoleKey] ?? e.actorRole}</span>}
                        </div>
                      ) : (
                        <span className="text-ink-2">System</span>
                      )}
                    </td>
                    <td className="font-mono text-sm">{e.action}</td>
                    <td className="text-sm">
                      {e.objectType ?? "–"}
                      {e.objectId && (
                        <span className="block">
                          <ShortId id={e.objectId} />
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-ink-2">{e.ticket ?? "–"}</td>
                    <td>
                      <Badge tone={RESULT_TONE[e.result as keyof typeof RESULT_TONE] ?? "neutral"}>
                        {RESULT_LABEL[e.result as keyof typeof RESULT_LABEL] ?? e.result}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <MoreLink href={events.nextCursor ? query(base, { aktion: filter.action, akteur: filter.actorId, von: filter.from, bis: filter.to, cursor: events.nextCursor }) : null} />
        </AdminSectionBlock>

        <AdminSectionBlock
          id="verweigert"
          title="Verweigerte Zugriffe"
          description="Technisch erfasst ohne Werte (AT03). Zählung der letzten 30 Tage und die jüngsten Ereignisse."
        >
          {security.byKind.length === 0 ? (
            <EmptyState icon="shield-check" title="Keine verweigerten Zugriffe in den letzten 30 Tagen" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Table>
                <caption className="sr-only">Verweigerte Zugriffe nach Art</caption>
                <thead>
                  <tr>
                    <th scope="col">Art</th>
                    <th scope="col">Objekttyp</th>
                    <th scope="col">Anzahl</th>
                  </tr>
                </thead>
                <tbody>
                  {security.byKind.map((k) => (
                    <tr key={`${k.kind}-${k.objectType}`}>
                      <td className="font-mono text-sm">{k.kind}</td>
                      <td className="text-sm">{k.objectType ?? "–"}</td>
                      <td className="tabular">{k.total}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Table>
                <caption className="sr-only">Jüngste verweigerte Zugriffe</caption>
                <thead>
                  <tr>
                    <th scope="col">Zeit</th>
                    <th scope="col">Art</th>
                    <th scope="col">Route</th>
                    <th scope="col">Konto</th>
                  </tr>
                </thead>
                <tbody>
                  {security.latest.map((e) => (
                    <tr key={e.id}>
                      <td className="text-sm">
                        <DateTime date={e.occurredAt} />
                      </td>
                      <td className="font-mono text-sm">{e.kind}</td>
                      <td className="break-all font-mono text-xs">{e.route ?? "–"}</td>
                      <td>{e.actorId ? <ShortId id={e.actorId} /> : <span className="text-sm text-ink-2">ohne Sitzung</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </AdminSectionBlock>
      </div>
    </div>
  );
}
