import Link from "next/link";
import { Badge, Monogram } from "@/components/ui/primitives";

/**
 * Autorenangabe als ruhige Byline: Monogramm und Pseudonym in Mono als Link zum minimalen
 * Profil (S10, COM05). Mitarbeitende sind als «Team» erkennbar (PRD 10 «Kalte Startphase») –
 * nie als «geprüft» (COM04).
 */
export function AuthorLine({
  author,
  size = "sm",
}: {
  author: { id: string; pseudonym: string; team: string | null };
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <Monogram name={author.pseudonym} size={size} />
      <Link
        href={`/community/mitglied/${author.id}`}
        className="min-w-0 break-words text-[0.9375rem] font-semibold text-ink underline decoration-line-2 decoration-1 underline-offset-[0.25em] transition-colors duration-150 hover:decoration-current"
      >
        {author.pseudonym}
      </Link>
      {author.team && (
        <Badge tone="info" icon="shield">
          <span>
            Team<span className="sr-only"> der Plattform,</span> · {author.team}
          </span>
        </Badge>
      )}
    </span>
  );
}

/** Zeitpunkt in Mono mit maschinenlesbarem Datum und «bearbeitet»-Kennzeichnung (COM03). */
export function PostedAt({ date, label, edited }: { date: Date; label: string; edited?: boolean }) {
  return (
    <span className="font-mono text-[0.8125rem] tracking-[0.02em] text-ink-2">
      <time dateTime={date.toISOString()}>{label}</time>
      {edited && <span> · bearbeitet</span>}
    </span>
  );
}
