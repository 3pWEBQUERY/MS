import type { Metadata } from "next";
import { LegalPageView } from "@/components/content/legal-page";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Wer welche Daten sieht, wofür sie bearbeitet werden und welche Rechte du hast (PRI01).",
};

/** S50 – Text aus content.legal_pages, versioniert mit Gültigkeitsdatum. */
export default function Page() {
  return <LegalPageView slug="datenschutz" eyebrow="Datenschutz" />;
}
