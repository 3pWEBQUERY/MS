import type { Metadata } from "next";
import { LegalPageView } from "@/components/content/legal-page";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Bedingungen für die Nutzung der Plattform.",
};

/** S50 – Text aus content.legal_pages, versioniert mit Gültigkeitsdatum. */
export default function Page() {
  return <LegalPageView slug="bedingungen" eyebrow="Bedingungen" />;
}
