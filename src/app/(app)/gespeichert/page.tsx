import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoadMore, withParams } from "@/components/community/load-more";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState, PageHeader, PageSkeleton, SegmentNav } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { removeBookmarkAction } from "@/server/modules/community/bookmark-actions";
import { getBookmarksForViewer, type BookmarkArea } from "@/server/modules/community/queries";

export const metadata: Metadata = { title: "Gespeichert" };

const AREAS: { param: string; area: BookmarkArea; label: string; singular: string; icon: IconName }[] = [
  { param: "beitraege", area: "post", label: "Beiträge", singular: "Beitrag", icon: "message" },
  { param: "artikel", area: "article", label: "Artikel", singular: "Artikel", icon: "book" },
  { param: "angebote", area: "offer", label: "Hilfsangebote", singular: "Hilfsangebot", icon: "lifebuoy" },
];

/**
 * S27 Gespeicherte Inhalte (HOM04, US11): private Merkliste, nach Bereich filterbar.
 * Nicht mehr zugängliche Ziele erscheinen neutral ohne Titel oder Text. Keine Speicherzahlen.
 * Haarlinien-Liste mit Mono-Rubrik und Serif-Titel statt Kartenstapel.
 */
export default function SavedPage({ searchParams }: PageProps<"/gespeichert">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Saved searchParams={searchParams} />
    </Suspense>
  );
}

async function Saved({ searchParams }: { searchParams: PageProps<"/gespeichert">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const current = AREAS.find((a) => a.param === sp.bereich) ?? null;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : null;
  const page = await getBookmarksForViewer(viewer, { area: current?.area ?? null, cursor });

  return (
    <div className="flex flex-col">
      <PageHeader title="Gespeichert" description="Deine private Merkliste. Niemand sonst sieht, was du gespeichert hast." />
      <SegmentNav
        label="Nach Bereich filtern"
        className="mb-8"
        items={[
          { href: "/gespeichert", label: "Alle", active: !current },
          ...AREAS.map((a) => ({ href: withParams("/gespeichert", { bereich: a.param }), label: a.label, active: current?.param === a.param })),
        ]}
      />

      <section aria-labelledby="saved-list" className="flex flex-col gap-4">
        <h2 id="saved-list" className="sr-only">
          {current ? `Gespeicherte ${current.label}` : "Alle gespeicherten Inhalte"}
        </h2>
        {page.items.length === 0 ? (
          <EmptyState
            icon="bookmark"
            title={cursor ? "Keine weiteren Einträge" : "Noch nichts gespeichert"}
            action={
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/wissen" variant="secondary">
                  Wissen ansehen
                </ButtonLink>
                <ButtonLink href="/community" variant="secondary">
                  Zur Community
                </ButtonLink>
              </div>
            }
          >
            Mit «Speichern» bei Artikeln, Beiträgen oder Hilfsangeboten legst du sie hier für später ab.
          </EmptyState>
        ) : (
          <ul className="border-t border-ink">
            {page.items.map((b) => {
              const area = AREAS.find((a) => a.area === b.targetType)!;
              return (
                <li
                  key={b.id}
                  className="flex flex-col gap-4 border-b border-line py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-7"
                >
                  <div className="flex min-w-0 flex-col gap-2.5">
                    {/* Rubrik in Mono: Bereich mit Symbol und Datum */}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.8125rem] text-ink-2">
                      <span className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.12em] text-accent-ink">
                        <Icon name={area.icon} className="size-4" />
                        {area.singular}
                      </span>
                      <span>Gespeichert am {formatDate(b.savedAt, viewer.prefs.timezone)}</span>
                    </p>
                    {b.target ? (
                      <>
                        <h3 className="font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-ink">
                          <Link
                            href={b.target.href}
                            className="break-words underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-colors duration-150 hover:decoration-current focus-visible:decoration-current"
                          >
                            {b.target.title}
                          </Link>
                        </h3>
                        {b.target.context && <p className="text-sm text-ink-2">{b.target.context}</p>}
                      </>
                    ) : (
                      // HOM04: weder Titel noch Vorschautext für entfernte oder unberechtigte Inhalte.
                      <h3 className="text-lg font-semibold italic text-ink-2">Nicht mehr verfügbar</h3>
                    )}
                  </div>
                  <form action={removeBookmarkAction} className="shrink-0">
                    <input type="hidden" name="bookmarkId" value={b.id} />
                    <SubmitButton variant="secondary" size="sm" pendingText="Wird entfernt …" icon={<Icon name="x" className="size-4" />}>
                      Entfernen
                      <span className="sr-only">{b.target ? ` – ${b.target.title}` : " – nicht mehr verfügbarer Eintrag"}</span>
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <LoadMore href={page.nextCursor ? withParams("/gespeichert", { bereich: current?.param, cursor: page.nextCursor }) : null} />
      </section>
    </div>
  );
}
