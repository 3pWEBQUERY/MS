import type { Metadata } from "next";
import { LegalPageView } from "@/components/content/legal-page";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Barrierefreiheit",
  description: "Stand der Barrierefreiheit und wie du Barrieren melden kannst.",
};

/** S50 Barrierefreiheitserklärung mit öffentlicher Kontaktmöglichkeit für Barrieren (PRD 12). */
export default function Page() {
  return (
    <LegalPageView
      slug="barrierefreiheit"
      eyebrow="Barrierefreiheit"
      after={
        <div className="flex max-w-[68ch] flex-col gap-5 border-y border-ink py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-[1.5rem] leading-snug tracking-[-0.01em] text-ink">
            Etwas ist für dich schwer zu bedienen oder zu lesen? <em className="text-accent-ink">Das möchten wir wissen.</em>
          </p>
          <ButtonLink href="/kontakt?kategorie=barriere" variant="secondary" className="shrink-0" icon={<Icon name="flag" className="size-5" />}>
            Barriere melden
          </ButtonLink>
        </div>
      }
    />
  );
}
