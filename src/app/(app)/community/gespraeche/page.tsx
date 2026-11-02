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
    <li>
      <Link
        href={`/community/gespraeche/${c.id}`}
        className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-2 hover:bg-raised sm:p-6"
      >
        <Monogram name={c.otherPseudonym} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-lg font-semibold text-ink">{c.otherPseudonym}</span>
          <span className="text-sm text-ink-2">
            {c.state === "closed" ? "Kontakt beendet · nur lesen" : c.lastActivityAt ? `Zuletzt am ${formatDate(c.lastActivityAt, tz)}` : "Neu verbunden"}
          </span>
        </span>
        {c.hasNew && (
          <Badge tone="accent" icon="message">
            Neue Nachricht
          </Badge>
        )}
        <Icon name="chevron-right" className="size-5 shrink-0 text-ink-2" />
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
              <SectionHeader id="aktive" title="Aktive Gespräche" />
              {active.length === 0 ? (
                <p className="text-base text-ink-2">Keine aktiven Gespräche.</p>
              ) : (
                <ul className="flex flex-col gap-3">
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
                  title="Geschlossene Gespräche"
                  description="Der Kontakt wurde beendet. Der bisherige Verlauf bleibt lesbar, neue Nachrichten sind nicht möglich."
                />
                <ul className="flex flex-col gap-3">
                  {closed.map((c) => (
                    <ConversationRow key={c.id} c={c} tz={tz} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <Notice tone="neutral" icon="lock" title="Vertraulichkeit">
          Nachrichten werden verschlüsselt übertragen und gespeichert. Es gibt keine Ende-zu-Ende-Verschlüsselung: Die Moderation
          sieht Nachrichten nur, wenn sie gemeldet wurden – und dann nur die ausgewählten. Gesprächsinhalte erscheinen nie in
          E-Mails oder Vorschauen.
        </Notice>

        <p className="text-base text-ink-2">
          <Link href="/community/blockiert" className="inline-flex items-center gap-1.5 font-medium text-ink underline underline-offset-4">
            <Icon name="ban" className="size-4" />
            Blockierte Personen und ausgeblendete Gespräche
          </Link>
        </p>
      </div>
    </div>
  );
}
