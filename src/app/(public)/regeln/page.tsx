import type { Metadata } from "next";
import { LegalPageView } from "@/components/content/legal-page";

export const metadata: Metadata = {
  title: "Community-Regeln",
  description: "Versionierte Regeln für den Austausch in der Community (SAF07).",
};

/** S50 – Text aus content.legal_pages, versioniert mit Gültigkeitsdatum. */
export default function Page() {
  return <LegalPageView slug="regeln" eyebrow="Regeln" />;
}
