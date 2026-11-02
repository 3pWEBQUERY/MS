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

export function WhoSeesWhat({ compact = false }: { compact?: boolean }) {
  const items = compact ? ITEMS.filter((i) => i.icon !== "mail") : ITEMS;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-[20px] border border-line bg-surface">
      {items.map((i) => (
        <li key={i.title} className="flex gap-4 p-4 sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-sunk text-ink-2">
            <Icon name={i.icon} className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-semibold text-ink">{i.title}</p>
            <p className="text-sm font-semibold text-ink-2">Sichtbar für: {i.who}</p>
            <p className="text-base text-ink-2" data-optional={compact ? true : undefined}>
              {i.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
