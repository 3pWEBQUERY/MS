import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RulesGate } from "@/components/community/rules-gate";
import { ContactRequestForm } from "@/components/messaging/contact-request-form";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Monogram, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { COMMUNITY_RULES_VERSION } from "@/lib/catalog";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { isUuid } from "@/server/modules/messaging/access";
import { hasBlocked, isBlockedBetween } from "@/server/modules/messaging/blocks";
import { getPairState, getRequestTarget } from "@/server/modules/messaging/contacts";

export const metadata: Metadata = { title: "Kontaktanfrage" };

/** S38 Kontaktanfrage bestätigen (MSG01, MSG02): Profil, Zweck und Grenzen, Freigabe ohne Nachrichtentext. */
export default function ContactRequestPage({ params }: PageProps<"/community/mitglied/[id]/anfrage">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <ContactRequest params={params} />
    </Suspense>
  );
}

async function ContactRequest({ params }: { params: PageProps<"/community/mitglied/[id]/anfrage">["params"] }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id) || id === viewer.accountId) notFound();

  // Eigene Blockierung: freundlicher Hinweis. Blockierung durch die Gegenseite: neutral 404 (SAF01).
  if (await hasBlocked(viewer.accountId, id)) {
    return (
      <div className="flex max-w-2xl flex-col">
        <PageHeader back={{ href: "/community/blockiert", label: "Zur Blockierliste" }} title="Kontaktanfrage" />
        <Notice tone="neutral" title="Du hast diese Person blockiert">
          Solange die Blockierung besteht, sind Anfragen und Nachrichten in beide Richtungen gesperrt. Du kannst die Blockierung in
          deiner <Link href="/community/blockiert">Blockierliste</Link> aufheben.
        </Notice>
      </div>
    );
  }
  if (await isBlockedBetween(viewer.accountId, id)) notFound();

  const target = await getRequestTarget(viewer, id);
  if (!target) notFound();
  const [state, chatEnabled] = await Promise.all([getPairState(viewer, id), isEnabled("chat")]);

  return (
    <div className="flex max-w-2xl flex-col">
      <PageHeader
        back={{ href: `/community/mitglied/${target.accountId}`, label: "Zum Profil" }}
        eyebrow="Kontaktanfrage"
        title={`Kontakt mit ${target.pseudonym}`}
        description="Ihr könnt einander erst schreiben, wenn ihr beide zugestimmt habt."
      />
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Monogram name={target.pseudonym} size="lg" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="break-words text-lg font-semibold text-ink">{target.pseudonym}</p>
            <Link href={`/community/mitglied/${target.accountId}`} className="link-quiet w-fit text-sm font-medium text-ink-2 hover:text-ink">
              Profil ansehen
            </Link>
          </div>
        </div>

        <section aria-labelledby="grenzen" className="flex flex-col gap-5">
          <h2 id="grenzen" className="display-sm">
            So funktioniert die Anfrage
          </h2>
          <ul className="border-t border-ink text-base text-ink-2">
            {(
              [
              ["check-circle", "Mit dem Senden stimmst du einem Kontakt mit dieser Person zu."],
              ["message", "Die Anfrage ist standardisiert – ohne eigenen Text und ohne Links."],
              ["lock", "Erst wenn die andere Person annimmt, könnt ihr einander Nachrichten schreiben."],
              ["clock", "Unbeantwortete Anfragen verfallen nach 14 Tagen. Du kannst sie jederzeit zurückziehen."],
              ["shield", "Ihr könnt den Kontakt jederzeit beenden, blockieren oder melden."],
              ["lock", "Nachrichten werden verschlüsselt gespeichert, aber nicht Ende-zu-Ende-verschlüsselt. Die Moderation sieht nur gemeldete Nachrichten."],
              ] as [IconName, string][]
            ).map(([icon, text]) => (
              <li key={text} className="flex items-start gap-4 border-b border-line py-4">
                <Icon name={icon} className="mt-0.5 size-5 shrink-0 text-accent-ink" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {!chatEnabled && (
          <Notice tone="warning" title="Kontaktanfragen sind vorübergehend eingeschränkt">
            Bestehende Gespräche bleiben erhalten. Bitte versuche es später erneut.
          </Notice>
        )}

        {state.kind === "active" ? (
          <Notice
            tone="success"
            title="Ihr seid bereits verbunden"
            action={
              state.conversationId ? (
                <ButtonLink href={`/community/gespraeche/${state.conversationId}`} size="sm">
                  Zum Gespräch
                </ButtonLink>
              ) : undefined
            }
          />
        ) : state.kind === "outgoing_pending" ? (
          <Notice
            tone="neutral"
            title="Deine Anfrage ist ausstehend"
            action={
              <ButtonLink href="/community/kontakte" variant="secondary" size="sm">
                Zu meinen Kontakten
              </ButtonLink>
            }
          >
            Du kannst sie unter «Kontakte» zurückziehen.
          </Notice>
        ) : state.kind === "incoming_pending" ? (
          <Notice
            tone="info"
            title={`${target.pseudonym} hat dir bereits eine Anfrage gesendet`}
            action={
              <ButtonLink href="/community/kontakte" size="sm">
                Anfrage ansehen
              </ButtonLink>
            }
          >
            Unter «Kontakte» kannst du sie bewusst annehmen oder ablehnen.
          </Notice>
        ) : state.kind === "cooldown" ? (
          <Notice tone="neutral" title="Zurzeit ist keine neue Anfrage möglich">
            Eine neue Anfrage an diese Person ist frühestens ab {formatDate(state.until, viewer.prefs.timezone)} möglich.
          </Notice>
        ) : viewer.rulesAcceptedVersion !== COMMUNITY_RULES_VERSION ? (
          // SAF07: Eine Kontaktanfrage ist Community-Schreiben – zuerst die aktuellen Regeln bestätigen.
          <RulesGate version={COMMUNITY_RULES_VERSION} acceptedVersion={viewer.rulesAcceptedVersion} />
        ) : (
          <ContactRequestForm targetId={target.accountId} disabled={!chatEnabled || viewer.writeSuspended} />
        )}

        {viewer.writeSuspended && state.kind === "none" && (
          <Notice tone="warning" title="Dein Konto ist zurzeit für das Schreiben eingeschränkt">
            Du kannst keine Anfragen senden. Einspruch ist unter <Link href="/meldungen">Meine Meldungen</Link> möglich.
          </Notice>
        )}
      </div>
    </div>
  );
}
