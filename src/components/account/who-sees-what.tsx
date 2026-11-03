import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";

/** «Wer sieht was» (S07, S12, PRI01): kurz, konkret, ohne Fachsprache. */
const ITEMS: { title: string; who: string; text: string; icon: IconName }[] = [
  {
    title: "Pseudonym, Interessen, Kanton",
    who: "Angemeldete Mitglieder",
    text: "Nur was du selbst angibst. Kanton und Interessen sind freiwillig. Deine E-Mail-Adresse erscheint nie im Profil.",
    icon: "user",
  },
  {
    title: "Beiträge und Antworten",
    who: "Mitglieder der Community oder der jeweiligen Gruppe",
    text: "Geschlossene Gruppen sehen nur ihre Mitglieder. Die Moderation sieht Inhalte, wenn sie gemeldet werden.",
    icon: "message",
  },
  {
    title: "Nachrichten",
    who: "Du und dein Kontakt",
    text: "Erst nach gegenseitiger Freigabe. Die Moderation sieht nur Nachrichten, die gemeldet wurden.",
    icon: "chat",
  },
  {
    title: "Check-ins und Tagebuch",
    who: "Nur du",
    text: "Keine Freigabe an Kontakte, Angehörige, Redaktion, Moderation oder Fachpersonen.",
    icon: "lock",
  },
  {
    title: "E-Mail-Adresse und Kontodaten",
    who: "Nur du – und die Datenschutzstelle für deine Anfragen",
    text: "Für Anmeldung, Sicherheitshinweise und Belege. Kein Newsletter ohne deine Zustimmung.",
    icon: "mail",
  },
];

/**
 * Darstellung als Definitions-Raster mit Haarlinien (docs/DESIGN.md): Bereich links, «Sichtbar für»
 * als Mono-Auszeichnung. `tone="deep"` für die tiefe Bühne in S12 – dort nur on-deep-Tokens.
 */
export function WhoSeesWhat({ compact = false, tone = "paper" }: { compact?: boolean; tone?: "paper" | "deep" }) {
  const items = compact ? ITEMS.filter((i) => i.icon !== "mail") : ITEMS;
  const deep = tone === "deep";
  return (
    <ul className={cn("flex flex-col border-t", deep ? "border-deep-line" : "border-ink")}>
      {items.map((i) => (
        <li
          key={i.title}
          className={cn(
            "grid gap-x-8 gap-y-2 border-b py-5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:py-6",
            deep ? "border-deep-line" : "border-line",
          )}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <p className={cn("flex items-start gap-3 text-lg font-semibold leading-snug", deep ? "text-on-deep" : "text-ink")}>
              <Icon name={i.icon} className={cn("mt-1 size-5 shrink-0", deep ? "text-deep-accent" : "text-accent-ink")} />
              {i.title}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 sm:pt-1">
            <p className={cn("font-mono text-[0.8125rem] leading-snug", deep ? "text-deep-accent" : "text-accent-ink")}>
              Sichtbar für: {i.who}
            </p>
            <p className={cn("text-base", deep ? "text-on-deep-2" : "text-ink-2")} data-optional={compact ? true : undefined}>
              {i.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
