import type { Metadata } from "next";
import { LegalPageView } from "@/components/content/legal-page";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Angaben zur Trägerschaft und zum Betrieb.",
};

/** S50 – Text aus content.legal_pages, versioniert mit Gültigkeitsdatum. */
export default function Page() {
  return <LegalPageView slug="impressum" eyebrow="Impressum" />;
}
