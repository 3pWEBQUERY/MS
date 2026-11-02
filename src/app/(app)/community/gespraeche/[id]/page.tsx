import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmAction } from "@/components/messaging/action-form";
import { ChatView } from "@/components/messaging/chat-view";
import { StatusNotice } from "@/components/messaging/status-notice";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { recordDenied } from "@/server/audit";
import { requireViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { isUuid } from "@/server/modules/messaging/access";
import { endContactAction } from "@/server/modules/messaging/actions";
import { getConversationAccess, listMessages, markConversationRead } from "@/server/modules/messaging/conversations";

export const metadata: Metadata = { title: "Gespräch" };

/**
 * S40 Einzelgespräch (MSG03–MSG06, F05): Text senden, Zustellstatus, Kontakt beenden,
 * melden, blockieren. Fremde oder unbekannte IDs → neutrale 404 (AT03).
 */
export default function ConversationPage({ params, searchParams }: PageProps<"/community/gespraeche/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Conversation params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Conversation({
  params,
  searchParams,
}: {
  params: PageProps<"/community/gespraeche/[id]">["params"];
  searchParams: PageProps<"/community/gespraeche/[id]">["searchParams"];
}) {
  const viewer = await requireViewer();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const access = isUuid(id) ? await getConversationAccess(viewer.accountId, id) : null;
  if (!access) {
    await recordDenied("conversation_read", viewer.accountId, "conversation", "/community/gespraeche/[id]");
    notFound();
  }

  const vorRaw = typeof sp.vor === "string" ? Number(sp.vor) : NaN;
  const beforeSeq = Number.isInteger(vorRaw) && vorRaw > 0 ? vorRaw : undefined;
  const [{ items, hasOlder }, chatEnabled] = await Promise.all([
    listMessages(viewer.accountId, access.id, { beforeSeq, limit: 50 }),
    isEnabled("chat"),
  ]);
  // Eigener Lesestand (privat) beim Öffnen der neuesten Nachrichten.
  if (!beforeSeq && access.lastSeq > access.lastReadSeq) await markConversationRead(viewer.accountId, access.id, access.lastSeq);

  // Die blockierte Seite sieht nur «nicht mehr aktiv» – keine Offenlegung der Blockierung (SAF01).
  const shownState = access.state === "blocked" && !access.blockedByMe ? "closed" : access.state;
  const canSend = access.state === "active" && chatEnabled && !viewer.writeSuspended && !beforeSeq;
  const reportHref = `/melden?typ=message&gespraech=${access.id}`;

  return (
    <div className="flex max-w-3xl flex-col">
      <PageHeader
        back={{ href: "/community/gespraeche", label: "Alle Gespräche" }}
        eyebrow="Gespräch"
        title={access.otherPseudonym}
        actions={
          <>
            <ButtonLink href={reportHref} variant="secondary" size="sm" icon={<Icon name="flag" className="size-4" />}>
              Melden
            </ButtonLink>
            {!access.blockedByMe && (
              <ButtonLink
                href={`/community/blockiert/neu?mitglied=${access.otherId}`}
                variant="secondary"
                size="sm"
                icon={<Icon name="ban" className="size-4" />}
              >
                Blockieren
              </ButtonLink>
            )}
            {access.state === "active" && (
              <ConfirmAction
                action={endContactAction}
                fields={{ relationshipId: access.relationshipId, conversationId: access.id }}
                triggerLabel="Kontakt beenden"
                triggerVariant="quiet-danger"
                title="Kontakt beenden?"
                confirmLabel="Kontakt beenden"
              >
                <p>Ab sofort könnt ihr einander keine Nachrichten mehr senden. Der bisherige Verlauf bleibt für euch beide lesbar.</p>
                <p>Für einen erneuten Kontakt braucht es eine neue Anfrage und die Zustimmung von euch beiden.</p>
              </ConfirmAction>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <StatusNotice code={sp.status} />

        {shownState === "closed" && (
          <Notice tone="neutral" title="Dieses Gespräch ist nicht mehr aktiv">
            Der bisherige Verlauf bleibt lesbar. Neue Nachrichten sind erst nach einer neuen, beidseitigen Freigabe möglich.
          </Notice>
        )}
        {shownState === "blocked" && (
          <Notice tone="neutral" icon="ban" title="Du hast diese Person blockiert">
            Das Gespräch ist ausgeblendet und bleibt nur für deine Meldung und deinen Datenexport zugänglich.{" "}
            <Link href="/community/blockiert">Blockierliste</Link>
          </Notice>
        )}
        {access.state === "active" && !chatEnabled && (
          <Notice tone="warning" title="Gespräche sind vorübergehend eingeschränkt">
            Neue Nachrichten können zurzeit nicht gesendet werden. Der Verlauf bleibt erhalten.
          </Notice>
        )}
        {access.state === "active" && viewer.writeSuspended && (
          <Notice tone="warning" title="Dein Konto ist zurzeit für das Schreiben eingeschränkt">
            Du kannst den Verlauf lesen, aber keine Nachrichten senden. Einspruch ist unter{" "}
            <Link href="/meldungen">Meine Meldungen</Link> möglich.
          </Notice>
        )}

        {(hasOlder || beforeSeq) && (
          <div className="flex flex-wrap gap-2">
            {hasOlder && items[0] && (
              <ButtonLink href={`/community/gespraeche/${access.id}?vor=${items[0].seq}`} variant="secondary" size="sm">
                Ältere Nachrichten anzeigen
              </ButtonLink>
            )}
            {beforeSeq && (
              <ButtonLink href={`/community/gespraeche/${access.id}`} variant="ghost" size="sm">
                Zu den neuesten Nachrichten
              </ButtonLink>
            )}
          </div>
        )}

        <ChatView
          key={beforeSeq ?? "latest"}
          conversationId={access.id}
          initialMessages={items}
          canSend={canSend}
          otherPseudonym={access.otherPseudonym}
          timeZone={viewer.prefs.timezone}
        />

        {canSend && (
          <p className="text-sm text-ink-2">
            «Gespeichert» bedeutet: Die Nachricht ist sicher auf dem Server angekommen – nicht, dass sie gelesen wurde. Es gibt
            keine Lesebestätigungen oder Online-Anzeigen.
          </p>
        )}
      </div>
    </div>
  );
}
