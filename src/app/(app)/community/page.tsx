import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BoundaryNotice } from "@/components/community/boundary-notice";
import { CommunityNav } from "@/components/community/community-nav";
import { LoadMore, withParams } from "@/components/community/load-more";
import { PostCard } from "@/components/community/post-card";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Notice, PageHeader, PageSkeleton, SegmentNav } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { getFeed, listTopics } from "@/server/modules/community/queries";

export const metadata: Metadata = { title: "Community" };

/** S29 Community-Feed (COM01): chronologisch, Themenfilter, endliche Seiten mit «Mehr laden». */
export default function CommunityFeedPage({ searchParams }: PageProps<"/community">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Feed searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);

async function Feed({ searchParams }: { searchParams: PageProps<"/community">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const topics = await listTopics();
  const topicParam = one(sp.thema);
  const topic = topics.find((t) => t.slug === topicParam) ?? null;
  const cursor = one(sp.cursor);
  const [feed, writeEnabled] = await Promise.all([
    getFeed(viewer, { topic: topic?.slug ?? null, cursor }),
    isEnabled("community_write"),
  ]);
  const status = one(sp.status);

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Community"
        title="Austausch unter Mitgliedern"
        description="Neueste Beiträge zuerst – für alle Mitglieder und aus deinen Gruppen. Nur angemeldete Mitglieder sehen diese Inhalte."
        actions={
          writeEnabled && !viewer.writeSuspended ? (
            <ButtonLink href="/community/neu" icon={<Icon name="plus" className="size-5" />}>
              Beitrag schreiben
            </ButtonLink>
          ) : undefined
        }
      />
      <CommunityNav active="feed" />

      <div className="flex flex-col gap-6">
        {status === "geloescht" && (
          <Notice tone="success" role="status" title="Dein Beitrag wurde gelöscht.">
            Der Text ist entfernt. Antworten anderer bleiben bestehen und zeigen einen neutralen Platzhalter.
          </Notice>
        )}
        {!writeEnabled && (
          <Notice tone="warning" title="Schreiben ist vorübergehend pausiert">
            Neue Beiträge und Antworten sind im Moment nicht möglich. Lesen bleibt möglich, bestehende Inhalte bleiben erhalten.
          </Notice>
        )}

        <SegmentNav
          label="Nach Thema filtern"
          items={[
            { href: "/community", label: "Alle Themen", active: !topic },
            ...topics.map((t) => ({ href: withParams("/community", { thema: t.slug }), label: t.name, active: topic?.slug === t.slug })),
          ]}
        />

        <BoundaryNotice compact />

        <section aria-labelledby="feed-heading" className="flex flex-col gap-3">
          <h2 id="feed-heading" className="sr-only">
            {topic ? `Beiträge zum Thema ${topic.name}` : "Beiträge"}
          </h2>
          {cursor && (
            <p className="text-base text-ink-2">
              Ältere Beiträge.{" "}
              <Link href={withParams("/community", { thema: topic?.slug })} className="font-medium text-ink underline underline-offset-4">
                Zu den neuesten Beiträgen
              </Link>
            </p>
          )}
          {feed.items.length === 0 ? (
            <EmptyState
              icon="message"
              title={cursor ? "Keine weiteren Beiträge" : topic ? `Zum Thema «${topic.name}» gibt es noch keine Beiträge` : "Hier ist es noch ruhig"}
              action={
                <div className="flex flex-wrap gap-2">
                  {writeEnabled && !viewer.writeSuspended && (
                    <ButtonLink href="/community/neu" variant="secondary">
                      Beitrag schreiben
                    </ButtonLink>
                  )}
                  <ButtonLink href="/community/gruppen" variant="secondary">
                    Gruppen entdecken
                  </ButtonLink>
                </div>
              }
            >
              Du kannst selbst eine Frage stellen oder in einer betreuten Gruppe vorbeischauen. Es gibt keine Pflicht,
              etwas zu schreiben.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {feed.items.map((p) => (
                <li key={p.id}>
                  <PostCard post={p} timeZone={viewer.prefs.timezone} headingLevel="h3" />
                </li>
              ))}
            </ul>
          )}
          <LoadMore href={feed.nextCursor ? withParams("/community", { thema: topic?.slug, cursor: feed.nextCursor }) : null} />
        </section>
      </div>
    </div>
  );
}
