import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RequestStatusBadge } from "@/components/account/request-status";
import { Badge, EmptyState, PageHeader, PageSkeleton, SegmentNav, Table } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import {
  listRequestsForOfficer,
  REQUEST_TYPE_LABEL,
  type AdminFilter,
} from "@/server/modules/privacy/requests";

export const metadata: Metadata = { title: "Datenschutzaufträge" };

/** S58 Datenschutzaufträge (PRI06, PRI08): nur erforderliche Metadaten, keine Inhalte. */
export default function PrivacyRequestsPage({ searchParams }: PageProps<"/verwaltung/datenschutz">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Requests searchParams={searchParams} />
    </Suspense>
  );
}


const FILTERS: { key: AdminFilter; label: string }[] = [
  { key: "offen", label: "Offen" },
  { key: "faellig", label: "Frist in 7 Tagen" },
  { key: "fehler", label: "Fehler und Eskalationen" },
  { key: "alle", label: "Alle" },
];

async function Requests({ searchParams }: { searchParams: PageProps<"/verwaltung/datenschutz">["searchParams"] }) {
  await requireStaff(["privacy_officer"]);
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.key === sp.filter)?.key ?? "offen") as AdminFilter;
  const rows = await listRequestsForOfficer(filter);
  const now = Date.now();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Datenschutz"
        title="Datenschutzaufträge"
        description="Auskunft, Export und Löschung mit Fristen, Identitätsprüfung und Teilschritten. Inhalte der Personen sind hier nicht sichtbar."
        className="pb-0 sm:pb-0"
      />
      <SegmentNav
        label="Filter"
        items={FILTERS.map((f) => ({ href: `/verwaltung/datenschutz?filter=${f.key}`, label: f.label, active: f.key === filter }))}
      />
      {rows.length === 0 ? (
        <EmptyState icon="check-circle" title="Keine Aufträge in dieser Ansicht">
          Neue Aufträge erscheinen hier automatisch.
        </EmptyState>
      ) : (
        <Table>
          <caption className="sr-only">Datenschutzaufträge mit Beleg, Art, Status, Frist und Teilschritten</caption>
          <thead>
            <tr>
              <th scope="col">Beleg</th>
              <th scope="col">Art</th>
              <th scope="col">Status</th>
              <th scope="col">Frist</th>
              <th scope="col">Identitätsprüfung</th>
              <th scope="col">Teilschritte</th>
              <th scope="col">Ausnahme</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overdue = r.status !== "completed" && r.status !== "rejected" && r.dueAt.getTime() < now;
              const exceptionDue = r.exceptionUntil && r.exceptionUntil.getTime() < now;
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/verwaltung/datenschutz/${r.id}`} className="tabular font-mono font-semibold text-ink underline underline-offset-4">
                      {r.receiptNumber}
                    </Link>
                  </td>
                  <td>{REQUEST_TYPE_LABEL[r.type]}</td>
                  <td>
                    <RequestStatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDate(r.dueAt)}
                    {overdue && (
                      <span className="ml-2">
                        <Badge tone="danger" icon="alert">Überfällig</Badge>
                      </span>
                    )}
                  </td>
                  <td className="min-w-48 text-sm text-ink-2">{r.identityMethod}</td>
                  <td className="whitespace-nowrap">
                    {r.problemTasks > 0 ? (
                      <Badge tone="danger" icon="warning">{`${r.problemTasks} mit Fehler`}</Badge>
                    ) : r.openTasks > 0 ? (
                      <span className="text-sm text-ink-2">{r.openTasks} offen</span>
                    ) : (
                      <span className="text-sm text-ink-2">–</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {r.exceptionUntil ? (
                      exceptionDue ? (
                        <Badge tone="warning" icon="clock">Prüfung fällig</Badge>
                      ) : (
                        <span className="text-ink-2">bis {formatDate(r.exceptionUntil)}</span>
                      )
                    ) : (
                      <span className="text-ink-2">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
