import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactForm } from "@/components/content/contact-form";
import { PageContainer } from "@/components/content/page-container";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { contactFormToken, resolveContactRef } from "@/server/modules/content/contact";
import { CONTACT_CATEGORIES } from "@/server/modules/content/shared";

export const metadata: Metadata = {
  title: "Kontakt und Fehler melden",
  description: "Anliegen zur Plattform, Fehler in Artikeln oder Hinweise zu Hilfsangeboten melden. Kein Notfallkanal.",
};

/** S51 Kontakt und Fehler melden (CON06). */
export default function ContactPage({ searchParams }: PageProps<"/kontakt">) {
  return (
    <PageContainer narrow>
      <PageHeader
        eyebrow="Kontakt"
        title="Kontakt und Fehler melden"
        description="Fragen zur Plattform, Fehler in einem Artikel, veraltete Angaben zu einem Hilfsangebot oder Barrieren – wir lesen jedes Anliegen."
      />
      <div className="flex flex-col gap-8">
        <Notice tone="danger" icon="lifebuoy" title="Kein Notfallkanal">
          Dieses Formular wird nur während der Betriebszeiten gelesen. Bei akuter Gefahr: Sanitätsnotruf <strong className="tabular">144</strong> –
          weitere Hilfewege unter <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
        </Notice>
        <Suspense fallback={<PageSkeleton rows={2} />}>
          <ContactContent searchParams={searchParams} />
        </Suspense>
        <p className="text-sm text-ink-2">
          Dein Anliegen wird verschlüsselt gespeichert und nur von den zuständigen Mitarbeitenden gelesen. Mehr dazu in der{" "}
          <Link href="/datenschutz" className="font-medium text-ink underline underline-offset-4">
            Datenschutzinformation
          </Link>
          .
        </p>
      </div>
    </PageContainer>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function ContactContent({ searchParams }: { searchParams: PageProps<"/kontakt">["searchParams"] }) {
  const sp = await searchParams;
  await connection();
  // F03: Referenz nur als Kennung, keine sensiblen vorausgefüllten Daten.
  const ref = await resolveContactRef(one(sp.ref), one(sp.id));
  const kategorie = one(sp.kategorie);
  const defaultCategory = ref ? (ref.type === "article" ? "artikel" : "angebot") : CONTACT_CATEGORIES.some(([c]) => c === kategorie) ? kategorie : undefined;
  return (
    <ContactForm
      formToken={contactFormToken()}
      defaultCategory={defaultCategory}
      refType={ref?.type}
      refId={ref?.id}
      refTitle={ref?.title}
    />
  );
}
