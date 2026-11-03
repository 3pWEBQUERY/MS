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
 * S33 Gruppen entdecken (COM06): offene und auffindbare geschlossene Gruppen als nummerierter
 * Index (Editorial-Raster statt Kartenwand) mit Thema, Beschreibung, Zugangstyp und Regeln.
 * Die Ziffer ist reine Aufzählung, keine Rangfolge. Keine Inhalte, Mitglieder- oder Aktivitätszahlen.
 */
export default function GroupsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Groups />
    </Suspense>
  );
}

function MembershipBadge({ status }: { status: GroupSummary["membership"] }) {
  if (status === "active")
    return (
      <Badge tone="success" icon="check" className="w-fit">
        Du bist Mitglied
      </Badge>
    );
  if (status === "requested")
    return (
      <Badge tone="info" icon="clock" className="w-fit">
        Anfrage ausstehend
      </Badge>
    );
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
        <ol className="border-t border-ink">
          {groups.map((g, i) => {
            const href = `/community/gruppen/${g.slug}`;
            return (
              <li key={g.id} className="border-b border-line">
                <article className="grid gap-x-8 gap-y-4 py-7 sm:grid-cols-[3rem_minmax(0,1fr)] sm:py-9 lg:grid-cols-[3rem_minmax(0,1fr)_15rem] lg:gap-x-10">
                  <span aria-hidden="true" className="pt-2 font-mono text-sm font-medium tracking-[0.08em] text-accent-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex min-w-0 flex-col gap-3">
                    <h2 className="font-display text-[1.625rem] leading-[1.12] tracking-[-0.015em] text-ink sm:text-[2rem]">
                      <Link
                        href={href}
                        className="break-words underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 hover:decoration-current focus-visible:decoration-current"
                      >
                        {g.title}
                      </Link>
                    </h2>
                    <p className="max-w-[60ch] text-base leading-relaxed text-ink-2">{g.description}</p>
                    <p className="max-w-[60ch] text-sm text-ink-2">{groupTypeHint(g.type)}</p>
                    <details className="group/rules mt-1 max-w-[60ch] border-t border-line">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[0.9375rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                        Regeln der Gruppe
                        <Icon name="chevron-down" className="size-4 text-ink-2 transition-transform duration-150 group-open/rules:rotate-180" />
                      </summary>
                      <PlainText text={g.rules} className="pb-2 text-base text-ink-2" />
                    </details>
                  </div>
                  {/* Zugang, Thema und eigener Stand – Text und Symbol, nie nur Farbe */}
                  <div className="flex flex-col gap-4 sm:col-start-2 lg:col-start-auto lg:pt-2">
                    <div className="flex flex-col gap-2 text-sm">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        <Icon name={g.type === "closed" ? "lock" : "users"} className="size-4 shrink-0 text-ink-2" />
                        {groupTypeLabel(g.type)}
                      </p>
                      {g.topic && (
                        <p className="font-mono text-[0.8125rem] uppercase tracking-[0.12em] text-ink-2">{g.topic}</p>
                      )}
                    </div>
                    <MembershipBadge status={g.membership} />
                    <Link
                      href={href}
                      className="group inline-flex h-11 w-fit items-center gap-2 border-b border-ink font-semibold text-ink"
                    >
                      {g.membership === "active" ? "Zum Gruppenraum" : "Details und Beitritt"}
                      <Icon name="arrow-right" className="nudge size-4" />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
