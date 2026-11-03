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
import { Notice, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { COMMUNITY_RULES_VERSION } from "@/lib/catalog";
import { formatDateTime } from "@/lib/time";
import { requireViewer, type Viewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { COMMENT_MAX, getPostForViewer, type PostDetail } from "@/server/modules/community/queries";

export const metadata: Metadata = { title: "Beitrag" };

/**
 * S31 Beitrag und Antworten (COM02–COM04). Rechte werden bei jedem Abruf geprüft.
 * Lesesatz wie ein Artikel (max. 68 Zeichen pro Zeile), Antworten als Haarlinien-Strang.
 */
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
      className="inline-flex h-11 items-center gap-1.5 rounded-[11px] px-2.5 text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-sunk hover:text-ink"
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
          <article aria-label="Beitrag" className="flex flex-col gap-6">
            {/* Byline und Kennzeichnung als ruhige Meta-Zeile – COM04: nie als «geprüft» gekennzeichnet */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.8125rem] uppercase tracking-[0.12em] text-ink-2">
                  <Icon name={post.author.team ? "shield" : "message"} className="size-4" />
                  {post.author.team ? "Beitrag des Teams" : "Persönliche Erfahrung"}
                </span>
                {post.group && (
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[0.8125rem] text-ink-2">
                    <Icon name={post.group.type === "closed" ? "lock" : "users"} className="size-4 shrink-0" />
                    <span className="min-w-0 break-words">Gruppe {post.group.title}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <AuthorLine author={post.author} size="md" />
                <PostedAt date={post.publishedAt} label={formatDateTime(post.publishedAt, tz)} edited={post.edited} />
              </div>
            </div>
            <PlainText text={post.body} className="max-w-[68ch] text-[1.1875rem] leading-[1.7] text-ink" />
            <p className="font-mono text-[0.8125rem] text-ink-2">
              Sichtbar für: {post.group ? `Mitglieder der Gruppe ${post.group.title}` : "Mitglieder der Plattform"}
            </p>
            <div className="flex flex-wrap items-start gap-2 border-y border-line py-4">
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
                <div className="flex flex-wrap gap-1 sm:ml-auto">
                  <SmallLink href={reportHref("post", post.id)} icon="flag">
                    Melden
                  </SmallLink>
                  <SmallLink href={`/community/blockiert/neu?mitglied=${post.author.id}`} icon="ban">
                    {post.author.pseudonym} blockieren
                  </SmallLink>
                </div>
              )}
            </div>
          </article>
        ) : (
          // COM03: gelöschter Beitrag mit Antworten – neutraler Platzhalter ohne Text und Autor.
          <div className="flex items-center gap-3 rounded-[16px] border border-dashed border-line-2 p-4 text-base text-ink-2 sm:p-5">
            <Icon name="minus" className="size-4 shrink-0" />
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
    <section aria-labelledby="answers" className="flex flex-col gap-5">
      <h2 id="answers" className="display-sm">
        Antworten
      </h2>
      {post.comments.length === 0 ? (
        <p className="border-t border-line pt-5 text-base text-ink-2">Noch keine Antworten.</p>
      ) : (
        <ol className="border-t border-ink">
          {post.comments.map((c) =>
            c.kind === "placeholder" ? (
              <li key={c.id} className="flex items-center gap-3 border-b border-line py-5 text-sm italic text-ink-2">
                <Icon name="minus" className="size-4 shrink-0" />
                {c.reason === "blocked" ? "Diese Antwort ist für dich ausgeblendet." : "Diese Antwort ist nicht mehr verfügbar."}
              </li>
            ) : (
              <li key={c.id} className="border-b border-line">
                <article aria-label={`Antwort von ${c.author.pseudonym}`} className="flex flex-col gap-3 py-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <AuthorLine author={c.author} />
                    <PostedAt date={c.createdAt} label={formatDateTime(c.createdAt, tz)} edited={c.edited} />
                  </div>
                  {c.own ? (
                    <div className="sm:pl-[2.625rem]">
                      <OwnComment comment={{ id: c.id, body: c.body, version: c.version }} maxLength={COMMENT_MAX} canEdit={canEditOwn} />
                    </div>
                  ) : (
                    <>
                      <PlainText text={c.body} className="max-w-[68ch] text-base leading-relaxed text-ink sm:pl-[2.625rem]" />
                      <div className="-ml-2.5 flex flex-wrap gap-1 sm:ml-8">
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
    return <RulesGate version={COMMUNITY_RULES_VERSION} acceptedVersion={viewer.rulesAcceptedVersion} />;
  else if (!post.groupRulesAccepted && post.group)
    content = (
      <Notice tone="info" title="Die Gruppenregeln wurden aktualisiert">
        Bitte bestätige die neue Fassung im <Link href={`/community/gruppen/${post.group.slug}`}>Gruppenraum</Link>, bevor du
        antwortest.
      </Notice>
    );
  else content = <ReplyForm postId={post.id} maxLength={COMMENT_MAX} />;

  return (
    <section aria-labelledby="reply" className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
      <h2 id="reply" className="font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-ink sm:text-[1.75rem]">
        Antwort schreiben
      </h2>
      {content}
    </section>
  );
}
