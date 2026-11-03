import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CommunityNav } from "@/components/community/community-nav";
import { RulesGate } from "@/components/community/rules-gate";
import { ActionForm, ConfirmAction } from "@/components/messaging/action-form";
import { StatusNotice } from "@/components/messaging/status-notice";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, EmptyState, Monogram, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { COMMUNITY_RULES_VERSION } from "@/lib/catalog";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import {
  endContactAction,
  respondContactAction,
  withdrawRequestAction,
} from "@/server/modules/messaging/actions";
import { listContacts } from "@/server/modules/messaging/contacts";

export const metadata: Metadata = { title: "Kontakte und Anfragen" };

/** S37 Kontakte und Anfragen (MSG01, MSG02): eingehend, ausgehend, bestehend. */
export default function ContactsPage({ searchParams }: PageProps<"/community/kontakte">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Contacts searchParams={searchParams} />
    </Suspense>
  );
}

function Row({ pseudonym, meta, children }: { pseudonym: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <Monogram name={pseudonym} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-lg font-semibold text-ink">{pseudonym}</p>
          {meta && <div className="text-sm text-ink-2">{meta}</div>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-start gap-2">{children}</div>}
    </li>
  );
}

async function Contacts({ searchParams }: { searchParams: PageProps<"/community/kontakte">["searchParams"] }) {
  const viewer = await requireViewer();
  const [{ status }, lists, chatEnabled] = await Promise.all([searchParams, listContacts(viewer), isEnabled("chat")]);
  const tz = viewer.prefs.timezone;
  const nothing = lists.incoming.length === 0 && lists.outgoing.length === 0 && lists.active.length === 0;

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Community"
        title="Kontakte und Anfragen"
        description="Gespräche gibt es nur mit gegenseitiger Zustimmung. Du entscheidest, wer dir schreiben darf."
      />
      <CommunityNav active="kontakte" />

      <div className="flex flex-col gap-10">
        <StatusNotice code={status} />

        {lists.incoming.length > 0 && viewer.rulesAcceptedVersion !== COMMUNITY_RULES_VERSION && (
          // SAF07: Annehmen öffnet ein Gespräch – zuerst die aktuellen Regeln bestätigen. Ablehnen geht immer.
          <RulesGate version={COMMUNITY_RULES_VERSION} acceptedVersion={viewer.rulesAcceptedVersion} />
        )}
        {!chatEnabled && (
          <Notice tone="warning" title="Kontaktanfragen und Gespräche sind vorübergehend eingeschränkt">
            Bestehende Kontakte und Verläufe bleiben erhalten. Kontakt beenden und Blockieren sind weiterhin möglich.
          </Notice>
        )}

        {nothing ? (
          <EmptyState icon="users" title="Noch keine Kontakte" action={<ButtonLink href="/community/gruppen" variant="secondary">Gruppen entdecken</ButtonLink>}>
            Wenn du jemanden in der Community kennenlernst, kannst du über das Profil eine Kontaktanfrage senden. Ihr könnt
            einander erst schreiben, wenn beide zugestimmt haben.
          </EmptyState>
        ) : (
          <>
            <section aria-labelledby="incoming">
              <SectionHeader
                id="incoming"
                title="Eingehende Anfragen"
                description="Nimm nur an, wenn du mit dieser Person schreiben möchtest. Eine Ablehnung wird nicht als solche angezeigt."
              />
              {lists.incoming.length === 0 ? (
                <p className="text-base text-ink-2">Keine offenen Anfragen.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {lists.incoming.map((r) => (
                    <Row
                      key={r.relationshipId}
                      pseudonym={r.pseudonym}
                      meta={
                        <>
                          {r.requestedAt ? `Angefragt am ${formatDate(r.requestedAt, tz)}` : "Angefragt"}
                          {r.expiresAt ? ` · gültig bis ${formatDate(r.expiresAt, tz)}` : ""}
                          {" · "}
                          <Link href={`/community/mitglied/${r.otherId}`} className="font-medium text-ink underline underline-offset-4">
                            Profil
                          </Link>
                        </>
                      }
                    >
                      <ActionForm
                        action={respondContactAction}
                        fields={{ relationshipId: r.relationshipId, decision: "accept" }}
                        label="Annehmen"
                        pendingText="Wird angenommen …"
                        icon={<Icon name="check" className="size-4" />}
                        showSuccess={false}
                      />
                      <ActionForm
                        action={respondContactAction}
                        fields={{ relationshipId: r.relationshipId, decision: "decline" }}
                        label="Ablehnen"
                        variant="secondary"
                        pendingText="Wird abgelehnt …"
                        showSuccess={false}
                      />
                    </Row>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="outgoing">
              <SectionHeader id="outgoing" title="Gesendete Anfragen" />
              {lists.outgoing.length === 0 ? (
                <p className="text-base text-ink-2">Keine gesendeten Anfragen.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {lists.outgoing.map((r) => (
                    <Row
                      key={r.relationshipId}
                      pseudonym={r.pseudonym}
                      meta={r.requestedAt ? `Gesendet am ${formatDate(r.requestedAt, tz)}` : undefined}
                    >
                      {/* MSG02: nur «ausstehend» oder «nicht aktiv» – eine Ablehnung wird nie offengelegt. */}
                      {r.state === "pending" ? (
                        <>
                          <Badge tone="info" icon="clock">
                            Ausstehend
                          </Badge>
                          <ConfirmAction
                            action={withdrawRequestAction}
                            fields={{ relationshipId: r.relationshipId }}
                            triggerLabel="Zurückziehen"
                            title="Anfrage zurückziehen?"
                            confirmLabel="Anfrage zurückziehen"
                            confirmVariant="primary"
                          >
                            <p>Die Anfrage an {r.pseudonym} wird sofort zurückgezogen.</p>
                            <p>Eine neue Anfrage an diese Person ist danach frühestens in 30 Tagen möglich.</p>
                          </ConfirmAction>
                        </>
                      ) : (
                        <Badge tone="neutral">Nicht aktiv</Badge>
                      )}
                    </Row>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="active">
              <SectionHeader id="active" title="Bestehende Kontakte" />
              {lists.active.length === 0 ? (
                <p className="text-base text-ink-2">Noch keine bestehenden Kontakte.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {lists.active.map((r) => (
                    <Row key={r.relationshipId} pseudonym={r.pseudonym} meta={`Verbunden seit ${formatDate(r.since, tz)}`}>
                      {r.conversationId && (
                        <ButtonLink href={`/community/gespraeche/${r.conversationId}`} size="sm" icon={<Icon name="chat" className="size-4" />}>
                          Zum Gespräch
                        </ButtonLink>
                      )}
                      <ConfirmAction
                        action={endContactAction}
                        fields={{ relationshipId: r.relationshipId }}
                        triggerLabel="Kontakt beenden"
                        title="Kontakt beenden?"
                        confirmLabel="Kontakt beenden"
                      >
                        <p>Ab sofort könnt ihr einander keine Nachrichten mehr senden. Der bisherige Verlauf bleibt für euch beide lesbar.</p>
                        <p>Für einen erneuten Kontakt braucht es eine neue Anfrage und die Zustimmung von euch beiden.</p>
                      </ConfirmAction>
                    </Row>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <p className="text-base text-ink-2">
          <Link href="/community/blockiert" className="inline-flex items-center gap-1.5 font-medium text-ink underline underline-offset-4">
            <Icon name="ban" className="size-4" />
            Blockierte Personen verwalten
          </Link>
        </p>
      </div>
    </div>
  );
}
