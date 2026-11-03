import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DueBadge, VerzeichnisNav } from "@/components/content/admin/common";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AdminEmpty } from "@/components/admin/ui";
import { Badge, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { listSafetyContactsForStaff, safetyDueState } from "@/server/modules/content/directory-queries";
import { EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Sicherheitskontakte" };

/** Pflege der Hilfewege auf S49 (SAF06): vor Publikation und danach monatlich verifizieren. */
export default function SafetyAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <SafetyAdmin />
    </Suspense>
  );
}

async function SafetyAdmin() {
  await requireStaff(EDITOR_ROLES);
  await connection();
  const contacts = await listSafetyContactsForStaff();
  const now = new Date();
  const rows = contacts.map((c) => ({ ...c, due: safetyDueState(c, now) }));
  const overdue = rows.filter((r) => r.active && (r.due === "overdue" || r.due === "unverified"));
  return (
    <>
      <PageHeader
        eyebrow="Verzeichnis"
        title="Sicherheitskontakte"
        description="Hilfewege auf der öffentlichen Sicherheitsseite. Nur fachlich verifizierte Kontakte werden angezeigt."
        actions={
          <ButtonLink href="/verwaltung/verzeichnis/sicherheit/neu" icon={<Icon name="plus" className="size-5" />}>
            Hilfeweg anlegen
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-8">
        <VerzeichnisNav active="sicherheit" />
        {overdue.length > 0 && (
          <Notice tone="danger" title={`${overdue.length} aktive Hilfewege mit überfälliger Verifikation`}>
            Sie bleiben sichtbar, damit keine Notrufnummer fehlt, müssen aber umgehend erneut verifiziert werden (SAF06).
          </Notice>
        )}
        {rows.length === 0 ? (
          <AdminEmpty icon="lifebuoy" title="Noch keine Hilfewege erfasst">
            Solange hier nichts aktiv ist, zeigt die Sicherheitsseite die allgemein bekannten Schweizer Notrufnummern.
          </AdminEmpty>
        ) : (
          <Table>
            <caption className="sr-only">Hilfewege mit Verifikationsstand</caption>
            <thead>
              <tr>
                <th scope="col">Hilfeweg</th>
                <th scope="col">Öffentlich</th>
                <th scope="col">Verifikation</th>
                <th scope="col">Prüfende Stelle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="min-w-56">
                    <Link href={`/verwaltung/verzeichnis/sicherheit/${c.id}`} className="link-quiet font-semibold text-ink">
                      {c.name}
                    </Link>
                    <span className="block text-sm text-ink-2">
                      {c.phone ?? c.url} · {c.region}
                    </span>
                  </td>
                  <td>{c.active ? <Badge tone="success">Aktiv</Badge> : <Badge tone="outline">Inaktiv</Badge>}</td>
                  <td className="whitespace-nowrap">
                    <span className="flex flex-col items-start gap-1">
                      <DueBadge state={c.due} />
                      {c.nextDueAt && <span className="tabular text-sm text-ink-2">bis {formatDate(c.nextDueAt)}</span>}
                    </span>
                  </td>
                  <td className="text-sm">{c.verifiedBy ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
