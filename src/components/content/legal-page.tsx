import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
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
        <PageContainer>
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
    <PageContainer>
      {page ? (
        <>
          <PageHeader
            eyebrow={eyebrow}
            title={page.title}
            description={
              <p className="font-mono text-sm">
                Fassung <span className="tabular">{page.textVersion}</span> · gültig ab {formatDate(page.validFrom)}
              </p>
            }
          />
          {/* Ruhige Lesespalte (.prose-ms), Rückfragen als Randspalte */}
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
            <div className="flex min-w-0 flex-col gap-12">
              <RichText text={page.body} />
              {after}
            </div>
            <aside aria-label="Fragen zu diesem Text" className="flex flex-col gap-3 border-t border-ink pt-5 lg:sticky lg:top-28 lg:self-start">
              <p className="text-lg font-semibold text-ink">Fragen zu diesem Text?</p>
              <p className="text-base text-ink-2">
                Schreib uns über das{" "}
                <Link href="/kontakt" className="link-quiet font-semibold text-ink">
                  Kontaktformular
                </Link>
                . Bitte sende keine medizinischen Unterlagen.
              </p>
            </aside>
          </div>
        </>
      ) : (
        <div className="max-w-4xl">
          <PageHeader eyebrow={eyebrow} title="Dieser Text ist gerade nicht verfügbar" />
          <EmptyState icon="file" title="Bitte versuche es später erneut">
            Der Text wird gerade aktualisiert oder ist vorübergehend nicht abrufbar. Bei Fragen erreichst du uns über das{" "}
            <Link href="/kontakt" className="font-semibold text-ink underline underline-offset-4">
              Kontaktformular
            </Link>
            .
          </EmptyState>
        </div>
      )}
    </PageContainer>
  );
}
