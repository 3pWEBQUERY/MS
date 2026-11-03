import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AdminEmpty } from "@/components/admin/ui";
import { Badge, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { listGroupsForAdmin } from "@/server/modules/community/admin-queries";
import { groupAccessLabel } from "@/server/modules/community/groups";

export const metadata: Metadata = { title: "Gruppen" };

/** S55 Gruppenverwaltung – Übersicht (COM06–COM08). Gruppen werden nur von Mitarbeitenden geführt. */
export default function AdminGroupsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const viewer = await requireStaff(["admin", "moderation_lead"]);
  const isAdmin = viewer.roles.includes("admin");
  const groups = await listGroupsForAdmin();
  const pendingTotal = groups.reduce((n, g) => n + g.pending, 0);

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Community"
        title="Gruppen"
        description="Zugangstyp, Auffindbarkeit, Regeln und Aufnahmeanfragen. Jede Entscheidung wird protokolliert."
        actions={
          isAdmin ? (
            <ButtonLink href="/verwaltung/gruppen/neu" icon={<Icon name="plus" className="size-5" />}>
              Neue Gruppe
            </ButtonLink>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-6">
        {pendingTotal > 0 && (
          <Notice tone="info" icon="clock" title={`${pendingTotal} ${pendingTotal === 1 ? "offene Aufnahmeanfrage" : "offene Aufnahmeanfragen"}`}>
            Öffne die Gruppe, um über Anfragen zu entscheiden.
          </Notice>
        )}
        {groups.length === 0 ? (
          <AdminEmpty icon="users" title="Noch keine Gruppen">
            {isAdmin ? "Lege die erste betreute Gruppe an." : "Die Administration legt Gruppen an."}
          </AdminEmpty>
        ) : (
          <Table>
            <caption className="sr-only">Alle Gruppen</caption>
            <thead>
              <tr>
                <th scope="col">Gruppe</th>
                <th scope="col">Zugang</th>
                <th scope="col">Status</th>
                <th scope="col">Moderation</th>
                <th scope="col">Offene Anfragen</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link href={`/verwaltung/gruppen/${g.id}`} className="link-quiet font-semibold text-ink">
                      {g.title}
                    </Link>
                    {g.topic && <span className="block text-sm text-ink-2">{g.topic}</span>}
                  </td>
                  <td className="whitespace-nowrap">{groupAccessLabel(g.type, g.discoverable)}</td>
                  <td>
                    {g.status === "archived" ? (
                      <Badge tone="warning" icon="archive">
                        Archiviert
                      </Badge>
                    ) : (
                      <Badge tone="success" icon="check">
                        Aktiv
                      </Badge>
                    )}
                  </td>
                  <td>{g.moderator ?? "–"}</td>
                  <td className="tabular font-mono">{g.pending}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
