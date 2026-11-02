import Link from "next/link";
import { cantonName } from "@/lib/catalog";
import { formatDate } from "@/lib/time";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

/**
 * Karten für Wissen und Hilfe. Geprüftes Wissen trägt das «verified»-Badge; dieses wird nie
 * für Community-Inhalte verwendet (COM04, CON01).
 */
export function VerifiedBadge({ label = "Fachlich geprüft" }: { label?: string }) {
  return (
    <Badge tone="verified" icon="shield-check">
      {label}
    </Badge>
  );
}

export function ArticleCardLink({
  article,
  headingLevel = "h3",
}: {
  article: { slug: string; title: string; summary: string; topicName: string; readingMinutes: number; isMedical: boolean; publishedAt: string | null };
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  return (
    <Link
      href={`/wissen/${article.slug}`}
      className="group flex h-full flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-2 hover:bg-raised sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <VerifiedBadge label={article.isMedical ? "Fachlich geprüft" : "Redaktionell geprüft"} />
        <span className="text-sm text-ink-2">{article.topicName}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <H className="text-lg font-semibold leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{article.title}</H>
        <p className="line-clamp-3 text-base text-ink-2">{article.summary}</p>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" className="size-4" />
          {article.readingMinutes} Min. Lesezeit
        </span>
        {article.publishedAt && <span>Publiziert am {formatDate(article.publishedAt)}</span>}
      </p>
    </Link>
  );
}

export function cantonList(cantons: string[]): string {
  if (cantons.includes("CH")) return cantons.length > 1 ? `Ganze Schweiz (Schwerpunkt ${cantons.filter((c) => c !== "CH").map((c) => cantonName(c) ?? c).join(", ")})` : "Ganze Schweiz";
  return cantons.map((c) => cantonName(c) ?? c).join(", ");
}

export function OfferCardLink({
  offer,
  topicNames,
  headingLevel = "h3",
}: {
  offer: { slug: string; organization: string; title: string; summary: string; cantons: string[]; topicSlugs: string[] };
  topicNames: (slug: string) => string;
  headingLevel?: "h2" | "h3" | "h4";
}) {
  const H = headingLevel;
  return (
    <Link
      href={`/hilfe/${offer.slug}`}
      className="group flex h-full flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-2 hover:bg-raised sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-ink-2">{offer.organization}</p>
        <H className="text-lg font-semibold leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{offer.title}</H>
        <p className="line-clamp-3 text-base text-ink-2">{offer.summary}</p>
      </div>
      <div className="mt-auto flex flex-col gap-2 text-sm text-ink-2">
        <p className="inline-flex items-start gap-1.5">
          <Icon name="pin" className="mt-0.5 size-4 shrink-0" />
          <span>{cantonList(offer.cantons)}</span>
        </p>
        <p className="inline-flex items-start gap-1.5">
          <Icon name="filter" className="mt-0.5 size-4 shrink-0" />
          <span>{offer.topicSlugs.map(topicNames).join(" · ")}</span>
        </p>
      </div>
    </Link>
  );
}
