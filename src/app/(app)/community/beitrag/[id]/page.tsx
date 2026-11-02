import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthorLine, PostedAt } from "@/components/community/author-line";
import { BookmarkButton } from "@/components/community/bookmark-button";
import { BoundaryNotice } from "@/components/community/boundary-notice";
import { OwnComment } from "@/components/community/own-comment";
import { ReplyForm } from "@/components/community/reply-form";
import { RulesGate } from "@/components/community/rules-gate";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, Notice, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { COMMUNITY_RULES_VERSION } from "@/lib/catalog";
import { formatDateTime } from "@/lib/time";
import { requireViewer, type Viewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { COMMENT_MAX, getPostForViewer, type PostDetail } from "@/server/modules/community/queries";

export const metadata: Metadata = { title: "Beitrag" };

/** S31 Beitrag und Antworten (COM02–COM04). Rechte werden bei jedem Abruf geprüft. */
export default function PostPage({ params, searchParams }: PageProps<"/community/beitrag/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <PostView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function reportHref(type: "post" | "comment", id: string) {
  return `/melden?typ=${type}&id=${id}`;
}

function SmallLink({ href, icon, children }: { href: string; icon: "flag" | "ban"; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2 text-sm font-medium text-ink-2 underline-offset-4 hover:bg-sunk hover:text-ink hover:underline"
    >
      <Icon name={icon} className="size-4" />
      {children}
    </Link>
  );
}

async function PostView({
  params,
  searchParams,
}: {
  params: PageProps<"/community/beitrag/[id]">["params"];
  searchParams: PageProps<"/community/beitrag/[id]">["searchParams"];
}) {
  const viewer = await requireViewer();
  const { id } = await params;
  const sp = await searchParams;
  const limit = Math.min(Math.max(Number(typeof sp.antworten === "string" ? sp.antworten : 50) || 50, 50), 500);
  const post = await getPostForViewer(viewer, id, { commentLimit: limit });
  if (!post) notFound();
  const writeEnabled = await isEnabled("community_write");
  const status = typeof sp.status === "string" ? sp.status : null;
  const tz = viewer.prefs.timezone;
  const back = post.group
    ? { href: `/community/gruppen/${post.group.slug}`, label: `Zur Gruppe ${post.group.title}` }
    : { href: "/community", label: "Zur Community" };

  return (
    <div className="flex max-w-3xl flex-col">
      <PageHeader
        back={back}
        eyebrow={post.available ? post.topic.name : "Beitrag"}
        title={post.available ? (post.title ?? `Beitrag von ${post.author?.pseudonym ?? "einem Mitglied"}`) : "Beitrag nicht mehr verfügbar"}
      />

      <div className="flex flex-col gap-8">
        {status === "veroeffentlicht" && (
          <Notice tone="success" role="status" title="Dein Beitrag ist veröffentlicht.">
            {post.group ? `Sichtbar für Mitglieder der Gruppe ${post.group.title}.` : "Sichtbar für Mitglieder der Plattform."}
          </Notice>
        )}
        {status === "bearbeitet" && (
          <Notice tone="success" role="status" title="Deine Änderung ist gespeichert.">
            Der Beitrag ist als «bearbeitet» gekennzeichnet. Die Zielgruppe bleibt unverändert.
          </Notice>
        )}

        {post.available && post.author ? (
          <article aria-label="Beitrag" className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {/* COM04: nie als «geprüft» gekennzeichnet – Erfahrung, kein Fachinhalt */}
              {post.author.team ? (
                <Badge tone="neutral" icon="shield">
                  Beitrag des Teams
                </Badge>
              ) : (
                <Badge tone="neutral" icon="message">
                  Persönliche Erfahrung
                </Badge>
              )}
              {post.group && (
                <Badge tone="outline" icon={post.group.type === "closed" ? "lock" : "users"}>
                  <span className="max-w-[11rem] truncate sm:max-w-[16rem]">Gruppe {post.group.title}</span>
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <AuthorLine author={post.author} size="md" />
              <PostedAt date={post.publishedAt} label={formatDateTime(post.publishedAt, tz)} edited={post.edited} />
            </div>
            <PlainText text={post.body} className="text-[1.0625rem] leading-relaxed text-ink" />
            <p className="text-sm text-ink-2">
              Sichtbar für: {post.group ? `Mitglieder der Gruppe ${post.group.title}` : "Mitglieder der Plattform"}
            </p>
            <div className="flex flex-wrap items-start gap-2 border-t border-line pt-4">
              <BookmarkButton
                targetType="post"
                targetId={post.id}
                initialSaved={post.bookmarked}
                loggedIn
                returnTo={`/community/beitrag/${post.id}`}
              />
              {post.own ? (
                !post.group?.archived && (
                  <ButtonLink
                    href={`/community/beitrag/${post.id}/bearbeiten`}
                    variant="secondary"
                    size="sm"
                    icon={<Icon name="pencil" className="size-4" />}
                  >
                    Bearbeiten oder löschen
                  </ButtonLink>
                )
              ) : (
                <>
                  <SmallLink href={reportHref("post", post.id)} icon="flag">
                    Melden
                  </SmallLink>
                  <SmallLink href={`/community/blockiert/neu?mitglied=${post.author.id}`} icon="ban">
                    {post.author.pseudonym} blockieren
                  </SmallLink>
                </>
              )}
            </div>
          </article>
        ) : (
          // COM03: gelöschter Beitrag mit Antworten – neutraler Platzhalter ohne Text und Autor.
          <div className="rounded-[20px] border border-dashed border-line-2 bg-sunk p-5 text-base text-ink-2 sm:p-6">
            Dieser Beitrag wurde entfernt. Die Antworten bleiben sichtbar.
          </div>
        )}

        {post.group?.archived && (
          <Notice tone="neutral" icon="archive" title="Diese Gruppe ist archiviert">
            Inhalte bleiben lesbar, neue Antworten sind nicht mehr möglich.
          </Notice>
        )}

        <BoundaryNotice />

        <Comments post={post} viewer={viewer} />

        {post.available && <ReplyArea post={post} viewer={viewer} writeEnabled={writeEnabled} />}
      </div>
    </div>
  );
}

function Comments({ post, viewer }: { post: PostDetail; viewer: Viewer }) {
  const tz = viewer.prefs.timezone;
  const canEditOwn = !post.group?.archived && !viewer.writeSuspended;
  return (
    <section aria-labelledby="answers" className="flex flex-col gap-3">
      <h2 id="answers" className="text-xl font-[650] text-ink">
        Antworten
      </h2>
      {post.comments.length === 0 ? (
        <p className="text-base text-ink-2">Noch keine Antworten.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {post.comments.map((c) =>
            c.kind === "placeholder" ? (
              <li key={c.id} className="rounded-[16px] border border-dashed border-line-2 bg-sunk px-4 py-3 text-sm text-ink-2">
                {c.reason === "blocked" ? "Diese Antwort ist für dich ausgeblendet." : "Diese Antwort ist nicht mehr verfügbar."}
              </li>
            ) : (
              <li key={c.id}>
                <article
                  aria-label={`Antwort von ${c.author.pseudonym}`}
                  className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <AuthorLine author={c.author} />
                    <PostedAt date={c.createdAt} label={formatDateTime(c.createdAt, tz)} edited={c.edited} />
                  </div>
                  {c.own ? (
                    <OwnComment comment={{ id: c.id, body: c.body, version: c.version }} maxLength={COMMENT_MAX} canEdit={canEditOwn} />
                  ) : (
                    <>
                      <PlainText text={c.body} className="text-base text-ink" />
                      <div className="-ml-2 flex flex-wrap gap-1">
                        <SmallLink href={reportHref("comment", c.id)} icon="flag">
                          Melden
                        </SmallLink>
                        <SmallLink href={`/community/blockiert/neu?mitglied=${c.author.id}`} icon="ban">
                          Blockieren
                        </SmallLink>
                      </div>
                    </>
                  )}
                </article>
              </li>
            ),
          )}
        </ol>
      )}
      {post.moreComments && (
        <div>
          <ButtonLink href={`/community/beitrag/${post.id}?antworten=${Math.min(post.comments.length + 100, 500)}`} variant="secondary">
            Weitere Antworten anzeigen
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

function ReplyArea({ post, viewer, writeEnabled }: { post: PostDetail; viewer: Viewer; writeEnabled: boolean }) {
  let content: React.ReactNode;
  if (post.group?.archived) return null;
  if (!writeEnabled)
    content = (
      <Notice tone="warning" title="Antworten ist vorübergehend pausiert">
        Lesen bleibt möglich, bestehende Inhalte bleiben erhalten.
      </Notice>
    );
  else if (viewer.writeSuspended)
    content = (
      <Notice tone="neutral" title="Antworten ist für dein Konto im Moment nicht möglich">
        Du kannst weiterhin lesen. Hinweise zur Entscheidung findest du in deinen Mitteilungen.
      </Notice>
    );
  else if (viewer.rulesAcceptedVersion !== COMMUNITY_RULES_VERSION)
    return <RulesGate version={COMMUNITY_RULES_VERSION} updated={viewer.rulesAcceptedVersion !== null} />;
  else if (!post.groupRulesAccepted && post.group)
    content = (
      <Notice tone="info" title="Die Gruppenregeln wurden aktualisiert">
        Bitte bestätige die neue Fassung im <Link href={`/community/gruppen/${post.group.slug}`}>Gruppenraum</Link>, bevor du
        antwortest.
      </Notice>
    );
  else content = <ReplyForm postId={post.id} maxLength={COMMENT_MAX} />;

  return (
    <section aria-labelledby="reply" className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
      <h2 id="reply" className="text-xl font-[650] text-ink">
        Antwort schreiben
      </h2>
      {content}
    </section>
  );
}
