import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmAction } from "@/components/messaging/action-form";
import { StatusNotice } from "@/components/messaging/status-notice";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Monogram, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { unblockAction } from "@/server/modules/messaging/actions";
import { listMyBlocks } from "@/server/modules/messaging/blocks";

export const metadata: Metadata = { title: "Blockierte Personen" };

/** S41 Blockierliste (SAF01, AT06): nur eigene Entscheidungen; Aufheben stellt keinen Kontakt wieder her. */
export default function BlockListPage({ searchParams }: PageProps<"/community/blockiert">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <BlockList searchParams={searchParams} />
    </Suspense>
  );
}

async function BlockList({ searchParams }: { searchParams: PageProps<"/community/blockiert">["searchParams"] }) {
  const viewer = await requireViewer();
  const [{ status }, items] = await Promise.all([searchParams, listMyBlocks(viewer)]);
  const tz = viewer.prefs.timezone;

  return (
    <div className="flex max-w-3xl flex-col">
      <PageHeader
        back={{ href: "/community/kontakte", label: "Kontakte und Anfragen" }}
        eyebrow="Community"
        title="Blockierte Personen"
        description="Hier siehst du nur deine eigenen Entscheidungen. Blockierte Personen erfahren nicht, dass du sie blockiert hast."
      />
      <div className="flex flex-col gap-8">
        <StatusNotice code={status} />

        {items.length === 0 ? (
          <EmptyState icon="ban" title="Du hast niemanden blockiert">
            Du kannst Personen über ihr Profil, einen Beitrag oder ein Gespräch blockieren. Blockieren stellt sofort Abstand her.
          </EmptyState>
        ) : (
          <ul className="border-t border-ink">
            {items.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-6"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <Monogram name={b.pseudonym} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="break-words text-lg font-semibold leading-snug text-ink">{b.pseudonym}</p>
                    <p className="font-mono text-[0.8125rem] text-ink-2">Blockiert am {formatDate(b.createdAt, tz)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-14 sm:shrink-0 sm:pl-0">
                  {b.conversationId && (
                    <ButtonLink
                      href={`/community/gespraeche/${b.conversationId}`}
                      variant="secondary"
                      size="sm"
                      icon={<Icon name="chat" className="size-4" />}
                    >
                      Verlauf ansehen
                    </ButtonLink>
                  )}
                  <ConfirmAction
                    action={unblockAction}
                    fields={{ blockId: b.id }}
                    triggerLabel="Blockierung aufheben"
                    title="Blockierung aufheben?"
                    confirmLabel="Blockierung aufheben"
                    confirmVariant="primary"
                  >
                    <p>{b.pseudonym} kann deine Inhalte im Mitgliederbereich danach wieder sehen und dir eine Kontaktanfrage senden.</p>
                    <p>Ein früherer Kontakt wird nicht wiederhergestellt. Für ein Gespräch braucht es eine neue Anfrage und eure beidseitige Zustimmung.</p>
                  </ConfirmAction>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Notice tone="neutral" title="Melden ist unabhängig vom Blockieren">
          Wenn dich jemand belästigt oder bedroht, kannst du Inhalte zusätzlich melden. Deine Meldungen und ihren Stand findest du
          unter <Link href="/meldungen">Meine Meldungen</Link>. Bei akuter Gefahr: Notruf 144.
        </Notice>
      </div>
    </div>
  );
}
