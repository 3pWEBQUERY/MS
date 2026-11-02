import Link from "next/link";
import { Badge, Monogram } from "@/components/ui/primitives";

/**
 * Autorenangabe: Pseudonym als Link zum minimalen Profil (S10, COM05).
 * Mitarbeitende sind als «Team» erkennbar (PRD 10 «Kalte Startphase») – nie als «geprüft» (COM04).
 */
export function AuthorLine({
  author,
  size = "sm",
}: {
  author: { id: string; pseudonym: string; team: string | null };
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <Monogram name={author.pseudonym} size={size} />
      <Link
        href={`/community/mitglied/${author.id}`}
        className="min-w-0 break-words font-semibold text-ink underline-offset-4 hover:underline"
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

/** Zeitpunkt mit maschinenlesbarem Datum und «bearbeitet»-Kennzeichnung (COM03). */
export function PostedAt({ date, label, edited }: { date: Date; label: string; edited?: boolean }) {
  return (
    <span className="text-sm text-ink-2">
      <time dateTime={date.toISOString()}>{label}</time>
      {edited && <span> · bearbeitet</span>}
    </span>
  );
}
