import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CommunityNav } from "@/components/community/community-nav";
import { Icon } from "@/components/ui/icon";
import { Badge, EmptyState, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { groupTypeHint, groupTypeLabel, listDiscoverableGroups, type GroupSummary } from "@/server/modules/community/groups";

export const metadata: Metadata = { title: "Gruppen entdecken" };

/**
 * S33 Gruppen entdecken (COM06): offene und auffindbare geschlossene Gruppen mit Thema,
 * Beschreibung, Zugangstyp und Regeln. Keine Inhalte, Mitglieder- oder Aktivitätszahlen.
 */
export default function GroupsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Groups />
    </Suspense>
  );
}

function MembershipBadge({ status }: { status: GroupSummary["membership"] }) {
  if (status === "active") return <Badge tone="success" icon="check">Du bist Mitglied</Badge>;
  if (status === "requested") return <Badge tone="info" icon="clock">Anfrage ausstehend</Badge>;
  return null;
}

async function Groups() {
  const viewer = await requireViewer();
  const groups = await listDiscoverableGroups(viewer);
  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Community"
        title="Gruppen entdecken"
        description="Betreute Gruppen zu Themen des Alltags. Jede Gruppe hat eigene Regeln und eine verantwortliche Moderation."
      />
      <CommunityNav active="gruppen" />
      {groups.length === 0 ? (
        <EmptyState icon="users" title="Im Moment gibt es keine offenen Gruppen">
          Neue Gruppen werden vom Moderationsteam eingerichtet. Schau später wieder vorbei.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id} className="flex">
              <article className="flex w-full flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="outline" icon={g.type === "closed" ? "lock" : "users"}>
                    {groupTypeLabel(g.type)}
                  </Badge>
                  {g.topic && <Badge>{g.topic}</Badge>}
                  <MembershipBadge status={g.membership} />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-ink">
                    <Link href={`/community/gruppen/${g.slug}`} className="underline-offset-4 hover:underline">
                      {g.title}
                    </Link>
                  </h2>
                  <p className="text-base text-ink-2">{g.description}</p>
                  <p className="text-sm text-ink-2">{groupTypeHint(g.type)}</p>
                </div>
                <details className="group rounded-[12px] bg-sunk px-4 py-3">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    Regeln der Gruppe
                    <Icon name="chevron-down" className="size-5 transition-transform duration-150 group-open:rotate-180" />
                  </summary>
                  <PlainText text={g.rules} className="mt-3 text-base text-ink-2" />
                </details>
                <div className="mt-auto">
                  <Link
                    href={`/community/gruppen/${g.slug}`}
                    className="inline-flex h-10 items-center gap-1.5 font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    {g.membership === "active" ? "Zum Gruppenraum" : "Details und Beitritt"}
                    <Icon name="arrow-right" className="size-4" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
