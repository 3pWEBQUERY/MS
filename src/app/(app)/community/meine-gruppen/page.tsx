import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/community/action-form";
import { CommunityNav } from "@/components/community/community-nav";
import { ConfirmForm } from "@/components/community/confirm-form";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import {
  deleteCommentAction,
  deletePostAction,
  leaveGroupAction,
  withdrawRequestAction,
} from "@/server/modules/community/actions";
import { groupTypeLabel, listOwnMemberships } from "@/server/modules/community/groups";
import { getOwnLeftoversInLeftGroups } from "@/server/modules/community/queries";

export const metadata: Metadata = { title: "Meine Gruppen" };

/**
 * S36 Meine Gruppen und Anfragen (COM08, AT04): Mitgliedschaften, ausstehende Anfragen,
 * Rücknahme und Austritt wirken sofort; eigene Texte aus verlassenen Gruppen isoliert löschen.
 */
export default function MyGroupsPage({ searchParams }: PageProps<"/community/meine-gruppen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <MyGroups searchParams={searchParams} />
    </Suspense>
  );
}

async function MyGroups({ searchParams }: { searchParams: PageProps<"/community/meine-gruppen">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const [memberships, leftovers] = await Promise.all([listOwnMemberships(viewer), getOwnLeftoversInLeftGroups(viewer)]);
  const active = memberships.filter((m) => m.status === "active");
  const pending = memberships.filter((m) => m.status === "requested");
  const tz = viewer.prefs.timezone;

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Community" title="Meine Gruppen" description="Deine Mitgliedschaften und offenen Anfragen. Nur du siehst diese Übersicht." />
      <CommunityNav active="meine-gruppen" />

      <div className="flex flex-col gap-10">
        {sp.status === "verlassen" && (
          <Notice tone="success" role="status" title="Du hast die Gruppe verlassen.">
            Der Zugang zu den Beiträgen der Gruppe ist beendet. Deine eigenen Texte findest du weiter unten, falls du sie löschen möchtest.
          </Notice>
        )}

        <section aria-labelledby="active-groups">
          <SectionHeader id="active-groups" title="Mitgliedschaften" />
          {active.length === 0 ? (
            <EmptyState
              icon="users"
              title="Du bist noch in keiner Gruppe"
              action={
                <ButtonLink href="/community/gruppen" variant="secondary">
                  Gruppen entdecken
                </ButtonLink>
              }
            >
              In betreuten Gruppen tauschst du dich zu einem Thema aus. Beitreten ist freiwillig und jederzeit umkehrbar.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {active.map((m) => (
                <li key={m.groupId} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="text-lg font-semibold text-ink">
                      <Link href={`/community/gruppen/${m.slug}`} className="break-words underline-offset-4 hover:underline">
                        {m.title}
                      </Link>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="outline" icon={m.type === "closed" ? "lock" : "users"}>
                        {groupTypeLabel(m.type)}
                      </Badge>
                      {m.groupStatus === "archived" && (
                        <Badge tone="warning" icon="archive">
                          Archiviert
                        </Badge>
                      )}
                      {!m.rulesCurrent && m.groupStatus === "active" && (
                        <Badge tone="info" icon="info">
                          Neue Regeln bestätigen
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ConfirmForm
                      action={leaveGroupAction}
                      hidden={{ groupId: m.groupId }}
                      triggerLabel="Verlassen"
                      triggerVariant="secondary"
                      triggerIcon="logout"
                      title={`«${m.title}» verlassen?`}
                      description="Du siehst die Beiträge der Gruppe sofort nicht mehr. Deine eigenen Beiträge bleiben bestehen, bis du sie löschst."
                      confirmLabel="Gruppe verlassen"
                      confirmVariant="primary"
                      pendingText="Wird verlassen …"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="pending-groups">
          <SectionHeader
            id="pending-groups"
            title="Ausstehende Anfragen"
            description="Die Moderation entscheidet über die Aufnahme. Bis dahin siehst du keine Inhalte."
          />
          {pending.length === 0 ? (
            <p className="text-base text-ink-2">Du hast keine offenen Anfragen.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pending.map((m) => (
                <li key={m.groupId} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-lg font-semibold text-ink">
                      <Link href={`/community/gruppen/${m.slug}`} className="break-words underline-offset-4 hover:underline">
                        {m.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-ink-2">Angefragt am {formatDate(m.since, tz)} · ausstehend</p>
                  </div>
                  <ActionForm
                    action={withdrawRequestAction}
                    hidden={{ groupId: m.groupId }}
                    submitLabel="Anfrage zurückziehen"
                    pendingText="Wird zurückgezogen …"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {(leftovers.posts.length > 0 || leftovers.comments.length > 0) && (
          <section aria-labelledby="leftovers">
            <SectionHeader
              id="leftovers"
              title="Meine Beiträge in Gruppen, die ich verlassen habe"
              description="Hier siehst du nur deine eigenen Texte – keine Beiträge oder Antworten anderer. Du kannst sie einzeln löschen."
            />
            <ul className="flex flex-col gap-3">
              {leftovers.posts.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
                  <p className="text-sm text-ink-2">
                    Beitrag in «{p.groupTitle}» · {formatDateTime(p.publishedAt, tz)}
                  </p>
                  {p.title && <h3 className="break-words text-lg font-semibold text-ink">{p.title}</h3>}
                  <p className="break-words text-base text-ink-2">{p.excerpt}</p>
                  <div>
                    <ConfirmForm
                      action={deletePostAction}
                      hidden={{ postId: p.id, from: "meine-gruppen" }}
                      triggerLabel="Beitrag löschen"
                      title="Beitrag löschen?"
                      description="Der Text wird sofort entfernt. Gibt es Antworten, bleibt ein neutraler Platzhalter ohne Text und ohne deinen Namen."
                      confirmLabel="Endgültig löschen"
                      pendingText="Wird gelöscht …"
                    />
                  </div>
                </li>
              ))}
              {leftovers.comments.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
                  <p className="text-sm text-ink-2">
                    Antwort in «{c.groupTitle}» · {formatDateTime(c.createdAt, tz)}
                  </p>
                  <p className="break-words text-base text-ink-2">{c.excerpt}</p>
                  <div>
                    <ConfirmForm
                      action={deleteCommentAction}
                      hidden={{ commentId: c.id }}
                      triggerLabel="Antwort löschen"
                      title="Antwort löschen?"
                      description="Der Text deiner Antwort wird sofort entfernt und kann nicht wiederhergestellt werden."
                      confirmLabel="Endgültig löschen"
                      pendingText="Wird gelöscht …"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
