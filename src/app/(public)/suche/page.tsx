import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Highlight } from "@/components/content/highlight";
import { PageContainer } from "@/components/content/page-container";
import { SearchForm } from "@/components/content/search-form";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, EmptyState, Monogram, Notice, PageHeader, PageSkeleton, SegmentNav } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { getViewer, type Viewer } from "@/server/auth/viewer";
import { searchCommunityForViewer, searchMembersForViewer } from "@/server/modules/community/queries";
import { normalizeQuery, searchKnowledge, searchOffers } from "@/server/modules/content/search";

export const metadata: Metadata = { title: "Suche", robots: { index: false } };

type Area = "alle" | "wissen" | "hilfe" | "community" | "mitglieder";
const AREAS: Area[] = ["alle", "wissen", "hilfe", "community", "mitglieder"];

/**
 * S45 Suchergebnisse (CON07): getrennte Bereiche Wissen, Hilfe, Community und Mitglieder.
 * Gäste durchsuchen nur Wissen und Hilfe. Rechtefilter gelten in den Abfragen vor Zählung und
 * Ausschnitt. Suchbegriffe werden nicht geloggt und nicht in Analytics übernommen.
 */
export default function SearchPage({ searchParams }: PageProps<"/suche">) {
  return (
    <PageContainer>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

/** Mitgliederbereiche nur für bestätigte, eingeführte, nicht gesperrte Konten (PRD 03). */
function memberViewer(v: Viewer | null): Viewer | null {
  if (!v || !v.verified || !v.onboarded || v.accountSuspended) return null;
  if (v.mfaEnabled && !v.mfaVerified) return null;
  return v;
}

async function SearchContent({ searchParams }: { searchParams: PageProps<"/suche">["searchParams"] }) {
  const sp = await searchParams;
  const q = normalizeQuery(sp.q);
  const rawArea = (Array.isArray(sp.bereich) ? sp.bereich[0] : sp.bereich) as Area | undefined;
  const member = memberViewer(await getViewer());
  let area: Area = rawArea && AREAS.includes(rawArea) ? rawArea : "alle";
  if (!member && (area === "community" || area === "mitglieder")) area = "alle";

  const per = area === "alle" ? 5 : 20;
  const want = (a: Area) => area === "alle" || area === a;
  const [knowledge, offers, community, members] = await Promise.all([
    q && want("wissen") ? searchKnowledge(q, per) : null,
    q && want("hilfe") ? searchOffers(q, per) : null,
    q && member && want("community") ? searchCommunityForViewer(member, q, 20) : null,
    q && member && want("mitglieder") ? searchMembersForViewer(member, q, 20) : null,
  ]);
  const communityItems = community ? (area === "alle" ? community.slice(0, per) : community) : [];
  const memberItems = members ? (area === "alle" ? members.slice(0, per) : members) : [];
  const counts = {
    wissen: knowledge?.total ?? 0,
    hilfe: offers?.total ?? 0,
    community: community?.length ?? 0,
    mitglieder: members?.length ?? 0,
  };
  const totalHits = counts.wissen + counts.hilfe + counts.community + counts.mitglieder;
  const href = (a: Area) => `/suche?q=${encodeURIComponent(q)}${a === "alle" ? "" : `&bereich=${a}`}`;
  const navItems: { href: string; label: string; active: boolean; count?: number }[] = [
    { href: href("alle"), label: "Alle", active: area === "alle" },
    { href: href("wissen"), label: "Wissen", active: area === "wissen", count: area === "alle" || area === "wissen" ? counts.wissen : undefined },
    { href: href("hilfe"), label: "Hilfe", active: area === "hilfe", count: area === "alle" || area === "hilfe" ? counts.hilfe : undefined },
    ...(member
      ? [
          { href: href("community"), label: "Community", active: area === "community", count: area === "alle" || area === "community" ? counts.community : undefined },
          { href: href("mitglieder"), label: "Mitglieder", active: area === "mitglieder", count: area === "alle" || area === "mitglieder" ? counts.mitglieder : undefined },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader eyebrow="Suche" title={q ? `Ergebnisse für «${q}»` : "Suche"} />
      <div className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <SearchForm defaultValue={q} scope={area === "alle" ? undefined : area} id="suche-seite" />
        </div>

        {!q ? (
          <EmptyState
            icon="search"
            title="Wonach suchst du?"
            action={
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/wissen" variant="secondary">
                  Wissen nach Themen
                </ButtonLink>
                <ButtonLink href="/hilfe" variant="secondary">
                  Hilfe nach Kanton
                </ButtonLink>
              </div>
            }
          >
            Gib mindestens zwei Zeichen ein, zum Beispiel «Fatigue», «Arbeit» oder «Invalidenversicherung».
          </EmptyState>
        ) : (
          <>
            {q && <SegmentNav label="Suchbereiche" items={navItems} />}
            {!member && (
              <Notice tone="neutral" icon="lock" title="Community und Mitglieder sind geschützt">
                Beiträge und Pseudonyme sind nur für angemeldete Mitglieder durchsuchbar.{" "}
                <Link href={`/anmelden?next=${encodeURIComponent(href("alle"))}`}>Anmelden</Link>
              </Notice>
            )}

            {totalHits === 0 ? (
              <EmptyState
                icon="search"
                title="Keine Treffer"
                action={
                  <div className="flex flex-wrap gap-2">
                    {area !== "alle" && (
                      <ButtonLink href={href("alle")} variant="secondary">
                        In allen Bereichen suchen
                      </ButtonLink>
                    )}
                    <ButtonLink href="/suche" variant="ghost">
                      Suche zurücksetzen
                    </ButtonLink>
                  </div>
                }
              >
                Versuche einen kürzeren oder allgemeineren Begriff. Du kannst auch über die{" "}
                <Link href="/wissen" className="font-semibold text-ink underline underline-offset-4">
                  Wissensthemen
                </Link>{" "}
                oder den{" "}
                <Link href="/hilfe" className="font-semibold text-ink underline underline-offset-4">
                  Hilfe-Finder
                </Link>{" "}
                weitersuchen.
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-10">
                {knowledge && (
                  <ResultSection id="r-wissen" title="Wissen" badge={<Badge tone="verified" icon="shield-check">Fachlich geprüft</Badge>} total={knowledge.total} more={area === "alle" && knowledge.total > per ? href("wissen") : undefined}>
                    {knowledge.items.map((h) => (
                      <ResultLink key={h.id} href={h.href} title={h.title} meta={h.meta}>
                        <Highlight text={h.snippet} />
                      </ResultLink>
                    ))}
                  </ResultSection>
                )}
                {offers && (
                  <ResultSection id="r-hilfe" title="Hilfe" total={offers.total} more={area === "alle" && offers.total > per ? href("hilfe") : undefined}>
                    {offers.items.map((h) => (
                      <ResultLink key={h.id} href={h.href} title={h.title} meta={h.meta}>
                        <Highlight text={h.snippet} />
                      </ResultLink>
                    ))}
                  </ResultSection>
                )}
                {community && (
                  <ResultSection
                    id="r-community"
                    title="Community"
                    badge={<Badge tone="outline" icon="users">Erfahrungen von Mitgliedern</Badge>}
                    total={community.length}
                    capped={community.length >= 20}
                    more={area === "alle" && community.length > per ? href("community") : undefined}
                  >
                    {communityItems.map((h) => (
                      <ResultLink
                        key={h.id}
                        href={`/community/beitrag/${h.id}`}
                        title={h.title ?? "Beitrag ohne Titel"}
                        meta={`${h.author} · ${h.group ? `Gruppe ${h.group.title}` : h.topic} · ${formatDate(h.publishedAt)}`}
                      >
                        {h.snippet}
                      </ResultLink>
                    ))}
                  </ResultSection>
                )}
                {members && (
                  <ResultSection id="r-mitglieder" title="Mitglieder" total={members.length} capped={members.length >= 20} more={area === "alle" && members.length > per ? href("mitglieder") : undefined}>
                    {memberItems.map((m) => (
                      <li key={m.accountId}>
                        <Link
                          href={`/community/mitglied/${m.accountId}`}
                          className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-2 hover:bg-raised"
                        >
                          <Monogram name={m.pseudonym} />
                          <span className="font-semibold text-ink">{m.pseudonym}</span>
                          {m.team && <Badge tone="info">{m.team}</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ResultSection>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ResultSection({
  id,
  title,
  total,
  capped,
  badge,
  more,
  children,
}: {
  id: string;
  title: string;
  total: number;
  capped?: boolean;
  badge?: ReactNode;
  more?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={id} className="text-xl font-[650] text-ink">
          {title}
        </h2>
        <span className="tabular text-base text-ink-2">
          {capped ? `mindestens ${total}` : total} Treffer
        </span>
        {badge}
      </div>
      {total === 0 ? (
        <p className="text-base text-ink-2">In diesem Bereich gibt es keine Treffer.</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
      {more && (
        <Link href={more} className="inline-flex w-fit items-center gap-1.5 font-semibold text-ink underline underline-offset-4">
          Alle Treffer in «{title}» <Icon name="arrow-right" className="size-4" />
        </Link>
      )}
    </section>
  );
}

function ResultLink({ href, title, meta, children }: { href: string; title: string; meta: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex flex-col gap-1.5 rounded-[16px] border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-2 hover:bg-raised sm:p-5"
      >
        <span className="text-sm text-ink-2">{meta}</span>
        <span className="text-lg font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{title}</span>
        <span className="line-clamp-3 text-base text-ink-2">{children}</span>
      </Link>
    </li>
  );
}
