import Link from "next/link";
import { cantonName } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/time";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

/**
 * Editorial-Listen für Wissen und Hilfe (docs/DESIGN.md «Raster statt Kästchen»): Haarlinien,
 * Serif-Titel, Meta in Mono. Geprüftes Wissen trägt das «verified»-Badge; dieses wird nie für
 * Community-Inhalte verwendet (COM04, CON01).
 */
export function VerifiedBadge({ label = "Fachlich geprüft" }: { label?: string }) {
  return (
    <Badge tone="verified" icon="shield-check">
      {label}
    </Badge>
  );
}

type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  topicName: string;
  readingMinutes: number;
  isMedical: boolean;
  publishedAt: string | null;
};

const two = (i: number) => String(i + 1).padStart(2, "0");
const serifTitle =
  "font-display text-[1.5rem] font-bold leading-[1.15] tracking-[-0.015em] text-ink underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 group-hover:decoration-current";
const reviewLabel = (a: { isMedical: boolean }) => (a.isMedical ? "Fachlich geprüft" : "Redaktionell geprüft");

/**
 * Artikel als Editorial-Liste (S44): links Thema und Datum in Mono, Mitte Serif-Titel mit
 * Kurzfassung, rechts Prüfung und Lesezeit. Ganze Zeile ist Link.
 */
export function ArticleList({
  articles,
  headingLevel = "h3",
  showTopic = true,
}: {
  articles: ArticleSummary[];
  headingLevel?: "h2" | "h3";
  showTopic?: boolean;
}) {
  const H = headingLevel;
  return (
    <ul className="border-t border-ink">
      {articles.map((a) => (
        <li key={a.id} className="border-b border-line">
          <Link
            href={`/wissen/${a.slug}`}
            data-focus-inset
            className="group grid gap-x-10 gap-y-3 py-6 transition-colors duration-150 sm:py-7 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] md:items-start"
          >
            <span className="flex flex-col gap-1.5 font-mono md:pt-2">
              {showTopic && <span className="text-xs uppercase tracking-[0.12em] text-accent-ink">{a.topicName}</span>}
              {a.publishedAt && <span className="text-sm text-ink-2">Publiziert am {formatDate(a.publishedAt)}</span>}
            </span>
            <div className="flex min-w-0 max-w-2xl flex-col gap-2">
              <H className={serifTitle}>{a.title}</H>
              <span className="line-clamp-2 text-base text-ink-2">{a.summary}</span>
              <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2 md:hidden">
                <VerifiedBadge label={reviewLabel(a)} />
                <span className="tabular">{a.readingMinutes} Min. Lesezeit</span>
              </span>
            </div>
            <span className="hidden flex-col items-end gap-3 pt-1.5 md:flex">
              <VerifiedBadge label={reviewLabel(a)} />
              <span className="flex items-center gap-3 font-display font-semibold text-xs uppercase tracking-[0.1em] text-ink-2">
                <span className="tabular">{a.readingMinutes} Min. Lesezeit</span>
                <Icon name="arrow-right" className="nudge size-5 text-ink-3 group-hover:text-ink" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Artikel als nummerierte Spalten (wie «Mein Moment» der Startseite) – für kurze Auswahlen bis drei
 * Einträge. `tone="deep"` nur auf einer tiefen Fläche verwenden (Tokens on-deep).
 */
export function ArticleColumns({
  articles,
  headingLevel = "h3",
  tone = "paper",
}: {
  articles: ArticleSummary[];
  headingLevel?: "h2" | "h3";
  tone?: "paper" | "deep";
}) {
  const H = headingLevel;
  const deep = tone === "deep";
  return (
    <ol className={cn("grid border-t md:grid-cols-3", deep ? "border-on-deep-2" : "border-ink")}>
      {articles.map((a, i) => (
        <li
          key={a.id}
          className={cn(
            "border-b md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0 md:last:pr-0",
            deep ? "border-deep-line" : "border-line",
          )}
        >
          <Link href={`/wissen/${a.slug}`} className="group flex h-full flex-col gap-3 py-5 md:py-6" data-focus-inset>
            <span className={cn("flex items-center justify-between font-mono text-sm", deep ? "text-on-deep-2" : "text-ink-3")}>
              <span aria-hidden="true">{two(i)}</span>
              <Icon
                name="arrow-right"
                className={cn("nudge size-5", deep ? "text-on-deep-2 group-hover:text-on-deep" : "text-ink-3 group-hover:text-accent-ink")}
              />
            </span>
            <H className={cn(serifTitle, deep && "!text-on-deep")}>{a.title}</H>
            <span className={cn("line-clamp-3 text-base", deep ? "text-on-deep-2" : "text-ink-2")}>{a.summary}</span>
            <span
              className={cn(
                "mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 font-display font-semibold text-xs uppercase tracking-[0.1em]",
                deep ? "text-on-deep-2" : "text-ink-2",
              )}
            >
              <span className={deep ? "text-deep-accent" : "text-verified"}>{reviewLabel(a)}</span>
              <span className="tabular">{a.readingMinutes} Min. Lesezeit</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function cantonList(cantons: string[]): string {
  if (cantons.includes("CH")) return cantons.length > 1 ? `Ganze Schweiz (Schwerpunkt ${cantons.filter((c) => c !== "CH").map((c) => cantonName(c) ?? c).join(", ")})` : "Ganze Schweiz";
  return cantons.map((c) => cantonName(c) ?? c).join(", ");
}

type OfferSummary = { id: string; slug: string; organization: string; title: string; summary: string; cantons: string[]; topicSlugs: string[] };

/**
 * Hilfsangebote als Verzeichnis (S47): Organisation, Serif-Titel und Kurzbeschreibung, rechts
 * Region und Themen. Keine Bewertung, keine Rangfolge (CON04).
 */
export function OfferList({
  offers,
  topicNames,
  headingLevel = "h3",
}: {
  offers: OfferSummary[];
  topicNames: (slug: string) => string;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  return (
    <ul className="border-t border-ink">
      {offers.map((o) => (
        <li key={o.id} className="border-b border-line">
          <Link
            href={`/hilfe/${o.slug}`}
            data-focus-inset
            className="group grid gap-x-10 gap-y-4 py-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_auto] lg:items-start"
          >
            <div className="flex min-w-0 max-w-2xl flex-col gap-2">
              <span className="text-sm font-semibold text-ink-2">{o.organization}</span>
              <H className={serifTitle}>{o.title}</H>
              <span className="line-clamp-2 text-base text-ink-2">{o.summary}</span>
            </div>
            <span className="flex flex-col gap-2 text-sm text-ink-2 lg:pt-7">
              <span className="inline-flex items-start gap-2">
                <Icon name="pin" className="mt-0.5 size-4 shrink-0 text-accent-ink" />
                <span>{cantonList(o.cantons)}</span>
              </span>
              <span className="inline-flex items-start gap-2">
                <Icon name="filter" className="mt-0.5 size-4 shrink-0 text-ink-3" />
                <span>{o.topicSlugs.map(topicNames).join(" · ")}</span>
              </span>
            </span>
            <Icon name="arrow-right" className="nudge hidden size-5 text-ink-3 group-hover:text-ink lg:mt-8 lg:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
