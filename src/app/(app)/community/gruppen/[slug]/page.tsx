import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/community/action-form";
import { BoundaryNotice } from "@/components/community/boundary-notice";
import { CardHeading } from "@/components/community/card-heading";
import { ConfirmForm } from "@/components/community/confirm-form";
import { LoadMore, withParams } from "@/components/community/load-more";
import { PostStrand } from "@/components/community/post-card";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Badge, Card, EmptyState, Notice, PageHeader, PageSkeleton, PlainText, SectionHeader } from "@/components/ui/primitives";
import { requireViewer, type Viewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import {
  acceptGroupRulesAction,
  joinGroupAction,
  leaveGroupAction,
  withdrawRequestAction,
} from "@/server/modules/community/actions";
import { getGroupForViewer, groupTypeHint, groupTypeLabel, type GroupDetail } from "@/server/modules/community/groups";
import { getGroupPosts } from "@/server/modules/community/queries";

export const metadata: Metadata = { title: "Gruppe" };

/**
 * S34 Gruppendetail (Nicht-Mitglied) und S35 Gruppenraum (aktives Mitglied), COM06–COM08.
 * Mitgliedschaft wird bei jedem Abruf geprüft; verborgene Gruppen → neutrale 404.
 * Beiträge als Haarlinien-Strang, Seitenleiste mit Regeln und Austritt ohne Kartenwand.
 */
export default function GroupPage({ params, searchParams }: PageProps<"/community/gruppen/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Group params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Group({
  params,
  searchParams,
}: {
  params: PageProps<"/community/gruppen/[slug]">["params"];
  searchParams: PageProps<"/community/gruppen/[slug]">["searchParams"];
}) {
  const viewer = await requireViewer();
  const { slug } = await params;
  const group = await getGroupForViewer(viewer, slug);
  if (!group) notFound();
  const sp = await searchParams;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : null;

  return (
    <div className="flex flex-col">
      <PageHeader
        back={{ href: group.membership === "active" ? "/community/meine-gruppen" : "/community/gruppen", label: group.membership === "active" ? "Meine Gruppen" : "Alle Gruppen" }}
        eyebrow={group.membership === "active" ? "Gruppenraum" : "Gruppe"}
        title={group.title}
        description={group.description}
      />
      {/* Steckbrief der Gruppe als ruhige Meta-Zeile (Zugang immer mit Text und Symbol) */}
      <div className="-mt-2 mb-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm sm:-mt-4">
        <span className="inline-flex items-center gap-2 font-medium text-ink">
          <Icon name={group.type === "closed" ? "lock" : "users"} className="size-4 text-ink-2" />
          {groupTypeLabel(group.type)}
        </span>
        {group.topic && <span className="font-mono text-[0.8125rem] uppercase tracking-[0.12em] text-ink-2">{group.topic}</span>}
        {group.archived && (
          <Badge tone="warning" icon="archive">
            Archiviert
          </Badge>
        )}
        {group.moderator && <span className="text-ink-2">Betreut von {group.moderator}</span>}
        {/* SAF02: Gruppen sind meldbar – der Server prüft, dass die Gruppe für dich sichtbar ist. */}
        <Link
          href={`/melden?typ=group&id=${group.id}`}
          className="-mx-2 inline-flex h-11 items-center gap-1.5 rounded-[11px] px-2 font-medium text-ink-2 transition-colors duration-150 hover:bg-sunk hover:text-ink sm:ml-auto"
        >
          <Icon name="flag" className="size-4" />
          Gruppe melden
        </Link>
      </div>
      {group.membership === "active" ? (
        <GroupRoom group={group} viewer={viewer} cursor={cursor} />
      ) : (
        <GroupOutside group={group} />
      )}
    </div>
  );
}

function RulesCard({ group, collapsed }: { group: GroupDetail; collapsed?: boolean }) {
  if (collapsed)
    return (
      <details className="group border-b border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
          Regeln der Gruppe
          <Icon name="chevron-down" className="size-5 text-ink-2 transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <PlainText text={group.rules} className="pb-1 text-base text-ink-2" />
        <p className="mb-4 mt-2 font-mono text-[0.8125rem] text-ink-2">Fassung {group.rulesVersion}</p>
      </details>
    );
  return (
    <section className="border-t border-ink pt-6">
      <SectionHeader title="Regeln der Gruppe" description={`Fassung ${group.rulesVersion}`} />
      <PlainText text={group.rules} className="max-w-[68ch] text-base leading-relaxed text-ink" />
    </section>
  );
}

/** S34: Aussenstehende sehen nur Beschreibung, Zugangstyp und Regeln (COM06, AT04). */
function GroupOutside({ group }: { group: GroupDetail }) {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Notice tone="info" icon={group.type === "closed" ? "lock" : "users"} title={groupTypeLabel(group.type)}>
        {groupTypeHint(group.type)}
      </Notice>
      <RulesCard group={group} />
      {group.membership === "requested" ? (
        <Card className="flex flex-col gap-4">
          <CardHeading title="Deine Anfrage ist ausstehend" description="Die Moderation entscheidet. Du erhältst einen Hinweis in deinen Mitteilungen." />
          <ActionForm
            action={withdrawRequestAction}
            hidden={{ groupId: group.id }}
            submitLabel="Anfrage zurückziehen"
            pendingText="Wird zurückgezogen …"
            variant="secondary"
          />
        </Card>
      ) : group.membership === "removed" ? (
        <Notice tone="neutral" title="Ein Beitritt ist nicht möglich">
          Bei Fragen hilft dir das Moderationsteam über das Kontaktformular weiter.
        </Notice>
      ) : (
        <Card className="flex flex-col gap-4">
          <CardHeading
            title={group.type === "open" ? "Beitreten" : "Aufnahme anfragen"}
            description={
              group.type === "open"
                ? "Nach dem Beitritt siehst du die Beiträge der Gruppe und kannst selbst schreiben. Du kannst jederzeit austreten."
                : "Deine Anfrage enthält keinen Text – nur dein Pseudonym. Bis zur Aufnahme siehst du keine Inhalte der Gruppe."
            }
          />
          <ActionForm
            action={joinGroupAction}
            hidden={{ groupId: group.id }}
            checkbox={{ name: "accept", label: "Ich habe die Regeln der Gruppe gelesen und akzeptiere sie." }}
            submitLabel={group.type === "open" ? "Regeln akzeptieren und beitreten" : "Aufnahme anfragen"}
            pendingText={group.type === "open" ? "Wird beigetreten …" : "Wird gesendet …"}
            icon={group.type === "open" ? "user-plus" : "send"}
          />
        </Card>
      )}
    </div>
  );
}

/** S35: nur berechtigte Inhalte, Beitrag erstellen, Gruppe verlassen (COM07, COM08). */
async function GroupRoom({ group, viewer, cursor }: { group: GroupDetail; viewer: Viewer; cursor: string | null }) {
  const [page, writeEnabled] = await Promise.all([getGroupPosts(viewer, group.id, cursor), isEnabled("community_write")]);
  const rulesCurrent = group.memberRulesVersion === group.rulesVersion;
  const canWrite = !group.archived && writeEnabled && !viewer.writeSuspended && rulesCurrent;
  const base = `/community/gruppen/${group.slug}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {group.archived && (
          <Notice tone="neutral" icon="archive" title="Diese Gruppe ist archiviert">
            Inhalte bleiben für Mitglieder lesbar. Neue Beiträge und Antworten sind nicht mehr möglich.
          </Notice>
        )}
        {!rulesCurrent && !group.archived && (
          <Card className="flex flex-col gap-4">
            <CardHeading
              title="Die Gruppenregeln wurden aktualisiert"
              description={`Bitte lies die neue Fassung ${group.rulesVersion} und bestätige sie, bevor du weiter schreibst.`} />
            {/* SAF07: Regeländerung nachvollziehbar – bisherige Fassung und Zusammenfassung der Änderung. */}
            <div className="flex flex-col gap-1 rounded-[12px] bg-sunk p-4">
              <p className="text-sm text-ink-2">
                Zuletzt bestätigt: {group.memberRulesVersion ? `Fassung ${group.memberRulesVersion}` : "keine Fassung"} · Neu: Fassung{" "}
                {group.rulesVersion}
              </p>
              {group.rulesChangeNote && (
                <>
                  <p className="text-base font-semibold text-ink">Was sich geändert hat</p>
                  <PlainText text={group.rulesChangeNote} className="text-base text-ink" />
                </>
              )}
            </div>
            <PlainText text={group.rules} className="text-base text-ink" />
            <ActionForm
              action={acceptGroupRulesAction}
              hidden={{ groupId: group.id }}
              checkbox={{ name: "accept", label: "Ich habe die aktualisierten Regeln gelesen und akzeptiere sie." }}
              submitLabel="Regeln bestätigen"
              pendingText="Wird bestätigt …"
            />
          </Card>
        )}
        {!writeEnabled && (
          <Notice tone="warning" title="Schreiben ist vorübergehend pausiert">
            Lesen bleibt möglich, bestehende Inhalte bleiben erhalten.
          </Notice>
        )}

        <section aria-labelledby="group-posts" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="group-posts" className="display-sm">
              Beiträge in dieser Gruppe
            </h2>
            {canWrite && (
              <ButtonLink href={withParams("/community/neu", { gruppe: group.slug })} icon={<Icon name="plus" className="size-5" />}>
                Beitrag schreiben
              </ButtonLink>
            )}
          </div>
          {page.items.length === 0 ? (
            <EmptyState icon="message" title={cursor ? "Keine weiteren Beiträge" : "Noch keine Beiträge"}>
              {canWrite ? "Magst du dich kurz vorstellen oder eine Frage stellen? Es gibt keine Pflicht dazu." : undefined}
            </EmptyState>
          ) : (
            <PostStrand posts={page.items} timeZone={viewer.prefs.timezone} showGroup={false} headingLevel="h3" />
          )}
          <LoadMore href={page.nextCursor ? withParams(base, { cursor: page.nextCursor }) : null} />
        </section>
      </div>

      <aside aria-label="Über diese Gruppe" className="flex flex-col gap-6 lg:pt-1">
        <BoundaryNotice compact />
        {rulesCurrent && (
          <div className="border-t border-ink">
            <RulesCard group={group} collapsed />
          </div>
        )}
        <section className={cn("flex flex-col gap-4 pt-6", !rulesCurrent && "border-t border-ink")}>
          <CardHeading
            title="Gruppe verlassen"
            description="Du verlierst sofort den Zugang. Deine Beiträge bleiben bestehen und lassen sich unter «Meine Gruppen» löschen." />
          <div>
            <ConfirmForm
              action={leaveGroupAction}
              hidden={{ groupId: group.id, from: "gruppe" }}
              triggerLabel="Gruppe verlassen"
              triggerVariant="secondary"
              triggerIcon="logout"
              title={`«${group.title}» verlassen?`}
              description={
                group.type === "closed"
                  ? "Du siehst die Beiträge der Gruppe sofort nicht mehr. Für eine Rückkehr brauchst du eine neue Aufnahme. Deine eigenen Beiträge bleiben, bis du sie löschst."
                  : "Du siehst die Beiträge der Gruppe sofort nicht mehr. Du kannst jederzeit wieder beitreten. Deine eigenen Beiträge bleiben, bis du sie löschst."
              }
              confirmLabel="Gruppe verlassen"
              confirmVariant="primary"
              pendingText="Wird verlassen …"
            />
          </div>
        </section>
      </aside>
    </div>
  );
}
