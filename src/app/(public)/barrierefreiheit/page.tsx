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
        <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-base text-ink">Etwas ist für dich schwer zu bedienen oder zu lesen? Das möchten wir wissen.</p>
          <ButtonLink href="/kontakt?kategorie=barriere" variant="secondary" icon={<Icon name="flag" className="size-5" />}>
            Barriere melden
          </ButtonLink>
        </div>
      }
    />
  );
}
