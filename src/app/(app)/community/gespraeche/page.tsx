import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CommunityNav } from "@/components/community/community-nav";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, EmptyState, Monogram, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { listConversations, type ConversationListItem } from "@/server/modules/messaging/conversations";

export const metadata: Metadata = { title: "Gespräche" };

/**
 * S39 Gesprächsliste (MSG03, MSG04): freigegebene Kontakte, neutrale Kennzeichnung
 * «Neue Nachricht» (eigener Lesestand), geschlossene Gespräche. Blockierte sind ausgeblendet.
 */
export default function ConversationsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Conversations />
    </Suspense>
  );
}

function ConversationRow({ c, tz }: { c: ConversationListItem; tz: string }) {
  return (
    <li className="border-b border-line">
      <Link
        href={`/community/gespraeche/${c.id}`}
        data-focus-inset
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 py-5 transition-colors duration-150 hover:bg-raised sm:gap-x-6 sm:px-3 sm:py-6"
      >
        <Monogram name={c.otherPseudonym} />
        <span className="flex min-w-0 flex-col items-start gap-1">
          <span className="break-words text-lg font-semibold leading-snug text-ink">{c.otherPseudonym}</span>
          <span className="font-mono text-[0.8125rem] text-ink-2">
            {c.state === "closed" ? "Kontakt beendet · nur lesen" : c.lastActivityAt ? `Zuletzt am ${formatDate(c.lastActivityAt, tz)}` : "Neu verbunden"}
          </span>
          {/* Eigener Lesestand, neutral mit Text und Symbol – keine Anzahl (MSG04) */}
          {c.hasNew && (
            <Badge tone="accent" icon="message" className="mt-1">
              Neue Nachricht
            </Badge>
          )}
        </span>
        <Icon name="arrow-right" className="nudge size-5 shrink-0 text-ink-3 group-hover:text-ink" />
      </Link>
    </li>
  );
}

async function Conversations() {
  const viewer = await requireViewer();
  const [items, chatEnabled] = await Promise.all([listConversations(viewer), isEnabled("chat")]);
  const active = items.filter((c) => c.state === "active");
  const closed = items.filter((c) => c.state === "closed");
  const tz = viewer.prefs.timezone;

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Community"
        title="Gespräche"
        description="Einzelgespräche mit Kontakten, denen ihr beide zugestimmt habt."
      />
      <CommunityNav active="gespraeche" />

      <div className="flex flex-col gap-10">
        {!chatEnabled && (
          <Notice tone="warning" title="Gespräche sind vorübergehend eingeschränkt">
            Bestehende Verläufe bleiben lesbar. Neue Nachrichten können zurzeit nicht gesendet werden.
          </Notice>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon="chat"
            title="Noch keine Gespräche"
            action={
              <ButtonLink href="/community/kontakte" variant="secondary">
                Kontakte und Anfragen
              </ButtonLink>
            }
          >
            Ein Gespräch entsteht, sobald eine Kontaktanfrage angenommen wurde.
          </EmptyState>
        ) : (
          <>
            <section aria-labelledby="aktive">
              <SectionHeader id="aktive" index="01" title="Aktive Gespräche" />
              {active.length === 0 ? (
                <p className="border-t border-line pt-5 text-base text-ink-2">Keine aktiven Gespräche.</p>
              ) : (
                <ul className="border-t border-ink">
                  {active.map((c) => (
                    <ConversationRow key={c.id} c={c} tz={tz} />
                  ))}
                </ul>
              )}
            </section>
            {closed.length > 0 && (
              <section aria-labelledby="geschlossen">
                <SectionHeader
                  id="geschlossen"
                  index="02"
                  title="Geschlossene Gespräche"
                  description="Der Kontakt wurde beendet. Der bisherige Verlauf bleibt lesbar, neue Nachrichten sind nicht möglich."
                />
                <ul className="border-t border-ink">
                  {closed.map((c) => (
                    <ConversationRow key={c.id} c={c} tz={tz} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* Die eine tiefe Fläche dieser Seite: Vertraulichkeit als ruhige Haltung, nicht als Warnung (MSG05) */}
        <div className="grid gap-6 rounded-[28px] bg-deep p-6 text-on-deep sm:p-10 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-10">
          <p className="flex items-start gap-3 font-display text-[1.75rem] leading-[1.1] tracking-[-0.015em] text-on-deep">
            <Icon name="lock" className="mt-1.5 size-5 shrink-0 text-deep-accent" />
            Vertraulichkeit
          </p>
          <p className="max-w-[60ch] text-lg leading-relaxed text-on-deep-2">
            Nachrichten werden verschlüsselt übertragen und gespeichert. Es gibt keine Ende-zu-Ende-Verschlüsselung: Die Moderation
            sieht Nachrichten nur, wenn sie gemeldet wurden – und dann nur die ausgewählten. Gesprächsinhalte erscheinen nie in
            E-Mails oder Vorschauen.
          </p>
        </div>

        <p className="text-base text-ink-2">
          <Link href="/community/blockiert" className="link-quiet inline-flex min-h-11 items-center gap-2 font-medium text-ink">
            <Icon name="ban" className="size-4" />
            Blockierte Personen und ausgeblendete Gespräche
          </Link>
        </p>
      </div>
    </div>
  );
}
