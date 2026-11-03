import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/community/action-form";
import { ConfirmForm } from "@/components/community/confirm-form";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AdminHeading } from "@/components/admin/ui";
import { KeyValue, Notice, PageHeader, PageSkeleton, PlainText, Table } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { decideRequestAction, removeMemberAction, setGroupArchivedAction } from "@/server/modules/community/admin-actions";
import { getGroupForAdmin, listActiveMembers, listPendingRequests } from "@/server/modules/community/admin-queries";
import { groupAccessLabel } from "@/server/modules/community/groups";

export const metadata: Metadata = { title: "Gruppe verwalten" };

/**
 * S55 Gruppendetail in der Verwaltung: Aufnahmeanfragen (Administration, Moderationsleitung),
 * Mitglieder entfernen und Archivierung (Administration). Keine Beitragsinhalte (PRD 03).
 */
export default function AdminGroupPage({ params, searchParams }: PageProps<"/verwaltung/gruppen/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/verwaltung/gruppen/[id]">["params"];
  searchParams: PageProps<"/verwaltung/gruppen/[id]">["searchParams"];
}) {
  const viewer = await requireStaff(["admin", "moderation_lead"]);
  const isAdmin = viewer.roles.includes("admin");
  const { id } = await params;
  const group = await getGroupForAdmin(id);
  if (!group) notFound();
  const sp = await searchParams;
  const after = typeof sp.nach === "string" ? sp.nach.slice(0, 80) : null;
  const tz = viewer.prefs.timezone;
  const [requests, members] = await Promise.all([
    listPendingRequests(group.id),
    isAdmin ? listActiveMembers(group.id, after) : Promise.resolve(null),
  ]);
  const archived = group.status === "archived";

  return (
    <div className="flex flex-col">
      <PageHeader
        back={{ href: "/verwaltung/gruppen", label: "Alle Gruppen" }}
        eyebrow="Gruppe"
        title={group.title}
        description={group.description}
        actions={
          isAdmin ? (
            <ButtonLink href={`/verwaltung/gruppen/${group.id}/bearbeiten`} variant="secondary" icon={<Icon name="pencil" className="size-5" />}>
              Bearbeiten
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-10">
        {sp.status === "gespeichert" && (
          <Notice tone="success" role="status" title="Die Gruppe ist gespeichert.">
            Die Änderung ist protokolliert.
          </Notice>
        )}
        {archived && (
          <Notice tone="neutral" icon="archive" title="Diese Gruppe ist archiviert">
            Mitglieder können Inhalte lesen, aber nicht mehr schreiben. Neue Aufnahmen sind nicht möglich.
          </Notice>
        )}

        <div>
          <KeyValue
            className="border-y border-line"
            items={[
              ["Adresse", <Link key="a" href={`/community/gruppen/${group.slug}`} className="font-medium underline underline-offset-4">/community/gruppen/{group.slug}</Link>],
              ["Thema", group.topic ?? "–"],
              ["Zugang", groupAccessLabel(group.type, group.discoverable)],
              ["Verantwortliche Moderation", group.moderator ?? "–"],
              ["Regelfassung", group.rulesVersion],
              ["Zuletzt geändert", formatDateTime(group.updatedAt, tz)],
            ]}
          />
          <details className="group mt-4 rounded-[16px] bg-sunk px-4 py-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              Regeln anzeigen
              <Icon name="chevron-down" className="size-5 transition-transform duration-150 group-open:rotate-180" />
            </summary>
            <PlainText text={group.rules} className="mb-2 mt-1 text-base text-ink-2" />
          </details>
        </div>

        <section aria-labelledby="requests" className="flex flex-col gap-5">
          <AdminHeading
            id="requests"
            title="Aufnahmeanfragen"
            description="Anfragen enthalten keinen Text. Das Mitglied erhält nach der Entscheidung einen neutralen Hinweis."
          />
          {requests.length === 0 ? (
            <p className="text-base text-ink-2">Keine offenen Anfragen.</p>
          ) : (
            <ul className="border-t border-ink">
              {requests.map((r) => (
                <li key={r.membershipId} className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-ink">{r.pseudonym}</p>
                    <p className="text-sm text-ink-2">Angefragt am {formatDate(r.requestedAt, tz)}</p>
                  </div>
                  {archived ? (
                    <p className="text-sm text-ink-2">Archiviert – keine Aufnahme möglich.</p>
                  ) : (
                    <div className="flex flex-wrap items-start gap-2">
                      <ActionForm
                        action={decideRequestAction}
                        hidden={{ membershipId: r.membershipId, decision: "accept" }}
                        submitLabel={`${r.pseudonym} aufnehmen`}
                        pendingText="Wird aufgenommen …"
                        size="sm"
                        icon="check"
                      />
                      <ActionForm
                        action={decideRequestAction}
                        hidden={{ membershipId: r.membershipId, decision: "reject" }}
                        submitLabel="Ablehnen"
                        pendingText="Wird abgelehnt …"
                        variant="secondary"
                        size="sm"
                        icon="x"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {members && (
          <section aria-labelledby="members" className="flex flex-col gap-5">
            <AdminHeading id="members" title="Mitglieder" description="Nur Pseudonyme. Entfernen beendet den Zugang sofort und wird protokolliert." />
            {members.items.length === 0 ? (
              <p className="text-base text-ink-2">{after ? "Keine weiteren Mitglieder." : "Noch keine Mitglieder."}</p>
            ) : (
              <Table>
                <caption className="sr-only">Aktive Mitglieder von {group.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Pseudonym</th>
                    <th scope="col">Mitglied seit</th>
                    <th scope="col">
                      <span className="sr-only">Aktion</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.items.map((m) => (
                    <tr key={m.membershipId}>
                      <td className="font-semibold">{m.pseudonym}</td>
                      <td>{m.since ? formatDate(m.since, tz) : "–"}</td>
                      <td className="text-right">
                        <ConfirmForm
                          action={removeMemberAction}
                          hidden={{ membershipId: m.membershipId }}
                          triggerLabel="Entfernen"
                          triggerIcon="user"
                          title={`${m.pseudonym} aus der Gruppe entfernen?`}
                          description="Der Zugang zu Beiträgen der Gruppe endet sofort. Eigene Beiträge der Person bleiben bestehen; sie kann sie selbst löschen. Die Person erhält einen neutralen Hinweis."
                          confirmLabel="Mitglied entfernen"
                          pendingText="Wird entfernt …"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {members.next && (
              <div>
                <ButtonLink href={`/verwaltung/gruppen/${group.id}?nach=${encodeURIComponent(members.next)}`} variant="secondary">
                  Weitere Mitglieder
                </ButtonLink>
              </div>
            )}
          </section>
        )}

        {isAdmin && (
          <section aria-labelledby="archive" className="flex flex-col items-start gap-3 border-t border-ink pt-5">
            <h2 id="archive" className="text-xl font-[650] text-ink">
              {archived ? "Gruppe wieder aktivieren" : "Gruppe archivieren"}
            </h2>
            <p className="text-base text-ink-2">
              {archived
                ? "Mitglieder können danach wieder schreiben, und die Gruppe erscheint wieder in der Übersicht."
                : "Archivierte Gruppen sind schreibgeschützt und erscheinen nicht mehr in der Übersicht. Offene Anfragen werden geschlossen. Mitglieder können Inhalte weiter lesen und eigene Beiträge löschen."}
            </p>
            <div>
              <ConfirmForm
                action={setGroupArchivedAction}
                hidden={{ groupId: group.id, archive: archived ? "0" : "1" }}
                triggerLabel={archived ? "Wieder aktivieren" : "Archivieren"}
                triggerVariant="secondary"
                triggerSize="md"
                triggerIcon="archive"
                title={archived ? "Gruppe wieder aktivieren?" : "Gruppe archivieren?"}
                description={
                  archived
                    ? "Mitglieder können wieder Beiträge und Antworten schreiben."
                    : "Neue Beiträge, Antworten und Aufnahmen sind danach nicht mehr möglich. Offene Anfragen werden geschlossen."
                }
                confirmLabel={archived ? "Wieder aktivieren" : "Archivieren"}
                confirmVariant="primary"
                pendingText="Wird gespeichert …"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
