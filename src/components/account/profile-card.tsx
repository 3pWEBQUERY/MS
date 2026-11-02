import { cantonName, interestLabel } from "@/lib/catalog";
import { Icon } from "@/components/ui/icon";
import { Badge, Monogram } from "@/components/ui/primitives";

/**
 * Sichtbares Mitgliederprofil (S10, COM05) – genau diese Felder sehen andere Mitglieder.
 * Wird auch für die Vorschau in S09 verwendet, damit beide Ansichten identisch bleiben (US12).
 * Bewusst ohne Biografie, Bild, E-Mail oder Gesundheitsangaben («Profilgrenze», PRD 05).
 */
export type MemberProfileFields = {
  pseudonym: string;
  interests: string[];
  canton: string | null;
};

export function MemberProfileCard({
  profile,
  as: Heading = "p",
  footer,
}: {
  profile: MemberProfileFields;
  as?: "h2" | "h3" | "p";
  footer?: React.ReactNode;
}) {
  const name = profile.pseudonym.trim() || "Dein Pseudonym";
  const canton = cantonName(profile.canton);
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <Monogram name={name} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading className="break-words text-xl font-[650] text-ink">{name}</Heading>
          <span className="text-sm text-ink-2">Mitglied</span>
        </div>
      </div>
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <dt className="text-sm font-semibold text-ink-2">Interessen</dt>
          <dd>
            {profile.interests.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {profile.interests.map((c) => (
                  <li key={c}>
                    <Badge tone="outline">{interestLabel(c)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-base text-ink-2">Keine Interessen angegeben</span>
            )}
          </dd>
        </div>
        {canton && (
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-semibold text-ink-2">Kanton</dt>
            <dd className="flex items-center gap-1.5 text-base text-ink">
              <Icon name="pin" className="size-4 text-ink-2" />
              {canton}
            </dd>
          </div>
        )}
      </dl>
      {footer}
    </div>
  );
}
