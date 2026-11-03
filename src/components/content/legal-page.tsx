import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { EmptyState, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { getLegalPage, type LegalSlug } from "@/server/modules/content/legal";
import { PageContainer } from "./page-container";
import { RichText } from "./rich-text";

/**
 * S50 Regeln und rechtliche Seiten (PRI01, SAF07). Vollständig serverseitig gerendert und
 * gecacht – lesbar ohne Login und ohne JavaScript. Version und Gültigkeitsdatum sind sichtbar.
 */
export function LegalPageView(props: { slug: LegalSlug; eyebrow: string; after?: ReactNode }) {
  return (
    <Suspense
      fallback={
        <PageContainer narrow>
          <PageSkeleton rows={2} />
        </PageContainer>
      }
    >
      <LegalPageContent {...props} />
    </Suspense>
  );
}

async function LegalPageContent({ slug, eyebrow, after }: { slug: LegalSlug; eyebrow: string; after?: ReactNode }) {
  const page = await getLegalPage(slug);
  return (
    <PageContainer narrow>
      {page ? (
        <>
          <PageHeader
            eyebrow={eyebrow}
            title={page.title}
            description={
              <p className="text-base">
                Fassung <span className="tabular font-mono text-sm">{page.textVersion}</span> · gültig ab {formatDate(page.validFrom)}
              </p>
            }
          />
          <div className="flex flex-col gap-10">
            <RichText text={page.body} />
            {after}
            <Notice tone="neutral" title="Fragen zu diesem Text?">
              Schreib uns über das <Link href="/kontakt">Kontaktformular</Link>. Bitte sende keine medizinischen Unterlagen.
            </Notice>
          </div>
        </>
      ) : (
        <>
          <PageHeader eyebrow={eyebrow} title="Dieser Text ist gerade nicht verfügbar" />
          <EmptyState icon="file" title="Bitte versuche es später erneut">
            Der Text wird gerade aktualisiert oder ist vorübergehend nicht abrufbar. Bei Fragen erreichst du uns über das{" "}
            <Link href="/kontakt" className="font-semibold text-ink underline underline-offset-4">
              Kontaktformular
            </Link>
            .
          </EmptyState>
        </>
      )}
    </PageContainer>
  );
}
