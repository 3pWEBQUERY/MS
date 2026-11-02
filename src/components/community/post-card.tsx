import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import type { PostListItem } from "@/server/modules/community/queries";
import { AuthorLine, PostedAt } from "./author-line";

/**
 * Beitragskarte für Feed und Gruppenraum (S29, S35). Keine Reaktions- oder Antwortzahlen,
 * keine Rankings (COM01). Gruppenbeiträge sind gekennzeichnet. Text nur als Text, ohne HTML.
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
    <article className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-2 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{post.topic.name}</Badge>
        {showGroup && post.group && (
          <Badge tone="outline" icon={post.group.type === "closed" ? "lock" : "users"}>
            <span className="max-w-[11rem] truncate sm:max-w-[16rem]">Gruppe {post.group.title}</span>
          </Badge>
        )}
      </div>
      <H className="text-lg font-semibold leading-snug text-ink">
        <Link
          href={`/community/beitrag/${post.id}`}
          className="break-words underline-offset-4 hover:underline focus-visible:underline"
        >
          {heading}
        </Link>
      </H>
      {post.title && <p className="line-clamp-3 break-words text-base text-ink-2">{post.excerpt}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AuthorLine author={post.author} />
        <PostedAt date={post.publishedAt} label={formatDateTime(post.publishedAt, timeZone)} edited={post.edited} />
      </div>
    </article>
  );
}
