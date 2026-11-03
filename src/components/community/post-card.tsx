import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/time";
import type { PostListItem } from "@/server/modules/community/queries";
import { AuthorLine, PostedAt } from "./author-line";

/**
 * Beitrag im Magazin-Strang für Feed und Gruppenraum (S29, S35): Haarlinie statt Karte,
 * links Thema und Gruppe als Mono-Rubrik, rechts Titel in der Display-Serif, Auszug und Zeile
 * mit Pseudonym und Zeit. Keine Reaktions- oder Antwortzahlen, keine Rankings (COM01).
 * Gruppenbeiträge sind gekennzeichnet. Text nur als Text, ohne HTML.
 * Muss in einer Liste mit `border-t border-line` stehen (siehe `PostStrand`).
 */
export function PostCard({
  post,
  timeZone,
  showGroup = true,
  headingLevel = "h2",
}: {
  post: PostListItem;
  timeZone: string;
  showGroup?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const heading = post.title ?? post.excerpt.slice(0, 90) + (post.excerpt.length > 90 ? " …" : "");
  return (
    <article
      className={cn(
        "grid gap-x-10 gap-y-3 py-7 sm:py-8",
        // Zweispaltig nur im breiten Feed; im Gruppenraum (schmale Spalte) steht die Rubrik über dem Titel.
        showGroup && "md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]",
      )}
    >
      {/* Rubrik: Thema und Zielgruppe – Mono, ruhig, ohne Badges */}
      <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1.5", showGroup && "md:flex-col md:pt-2")}>
        <span className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-accent-ink">{post.topic.name}</span>
        {showGroup && post.group && (
          <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 text-sm leading-snug text-ink-2">
            <Icon name={post.group.type === "closed" ? "lock" : "users"} className="mt-px size-4 shrink-0" />
            <span className="min-w-0 break-words">Gruppe {post.group.title}</span>
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <H
          className={cn(
            "break-words text-ink",
            post.title
              ? "font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] sm:text-[1.75rem]"
              : "text-lg font-semibold leading-snug",
          )}
        >
          <Link
            href={`/community/beitrag/${post.id}`}
            className="underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 hover:decoration-current focus-visible:decoration-current"
          >
            {heading}
          </Link>
        </H>
        {post.title && <p className="line-clamp-3 max-w-[68ch] break-words text-base leading-relaxed text-ink-2">{post.excerpt}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <AuthorLine author={post.author} />
          <PostedAt date={post.publishedAt} label={formatDateTime(post.publishedAt, timeZone)} edited={post.edited} />
        </div>
      </div>
    </article>
  );
}

/** Chronologischer Strang aus Beiträgen mit Haarlinien (COM01: neueste zuerst, keine Sortierung nach Beliebtheit). */
export function PostStrand({
  posts,
  timeZone,
  showGroup = true,
  headingLevel = "h2",
}: {
  posts: PostListItem[];
  timeZone: string;
  showGroup?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <ul className="border-t border-ink">
      {posts.map((p) => (
        <li key={p.id} className="border-b border-line">
          <PostCard post={p} timeZone={timeZone} showGroup={showGroup} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
