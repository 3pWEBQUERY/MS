import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/messaging/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/modules/messaging/actions";
import { listNotifications } from "@/server/modules/messaging/notifications";
import type { NotificationType } from "@/server/modules/messaging/notify";

export const metadata: Metadata = { title: "Mitteilungen" };

/**
 * S28 Benachrichtigungszentrale (MSG07, MSG08): neutrale Hinweise ohne Inhalte oder Vorschauen.
 * Das Ziel wird beim Öffnen erneut geprüft (/mitteilungen/[id]). Ruhige Haarlinien-Liste ohne Kacheln.
 */
export default function NotificationsPage({ searchParams }: PageProps<"/mitteilungen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Notifications searchParams={searchParams} />
    </Suspense>
  );
}

const ICONS: Record<NotificationType, IconName> = {
  contact_request: "user-plus",
  contact_accepted: "users",
  comment_reply: "message",
  group_decision: "users",
  new_message: "chat",
  moderation_decision: "scale",
  security: "shield",
  system: "info",
};

async function Notifications({ searchParams }: { searchParams: PageProps<"/mitteilungen">["searchParams"] }) {
  const viewer = await requireViewer({ allowSuspended: true });
  const { cursor } = await searchParams;
  const { items, nextCursor, unread } = await listNotifications(viewer, typeof cursor === "string" ? cursor : null);
  const tz = viewer.prefs.timezone;

  return (
    <div className="flex max-w-3xl flex-col">
      <PageHeader
        title="Mitteilungen"
        description="Neutrale Hinweise ohne Inhalte. Öffne einen Hinweis, um zum Ziel zu gelangen."
        actions={
          <ButtonLink href="/konto/mitteilungen" variant="secondary" size="sm" icon={<Icon name="settings" className="size-4" />}>
            Einstellungen
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-6">
        {items.length === 0 && !cursor ? (
          <EmptyState icon="bell" title="Keine Mitteilungen">
            Hier erscheinen Hinweise zu Kontaktanfragen, Antworten, Gruppen, neuen Nachrichten und Entscheidungen der Moderation.
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display font-extrabold text-[0.8125rem] uppercase tracking-[0.12em] text-ink-2" aria-live="polite">
                {unread === 0 ? "Alle Hinweise sind gelesen." : unread === 1 ? "1 ungelesener Hinweis" : `${unread} ungelesene Hinweise`}
              </p>
              {unread > 0 && (
                <ActionForm
                  action={markAllNotificationsReadAction}
                  label="Alle als gelesen markieren"
                  variant="secondary"
                  pendingText="Wird markiert …"
                  icon={<Icon name="check" className="size-4" />}
                />
              )}
            </div>
            <ul className="border-t border-ink">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line py-5 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-6 sm:py-6"
                >
                  {/* Symbol ohne Kachel; ungelesen = Punkt + fetter Text + «Ungelesen» (nie nur Farbe) */}
                  <span className="relative flex size-6 items-center justify-center self-start pt-0.5">
                    <Icon name={ICONS[n.type] ?? "bell"} className={cn("size-5", n.read ? "text-ink-3" : "text-accent-ink")} />
                    {!n.read && (
                      <span className="absolute -right-1 -top-0.5 size-2.5 rounded-full border-2 border-bg bg-accent" aria-hidden="true" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className={cn("break-words text-base leading-snug", n.read ? "text-ink-2" : "font-semibold text-ink")}>
                      {n.label}
                      {!n.read && <span className="sr-only"> (ungelesen)</span>}
                    </p>
                    <p className="font-mono text-[0.8125rem] text-ink-2">
                      {formatDateTime(n.createdAt, tz)}
                      {!n.read && (
                        <span aria-hidden="true" className="text-accent-ink">
                          {" "}
                          · Ungelesen
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-start-auto sm:shrink-0 sm:justify-end">
                    <Link
                      href={`/mitteilungen/${n.id}`}
                      prefetch={false}
                      className="group inline-flex h-11 items-center gap-2 rounded-[11px] px-3 font-semibold text-ink transition-colors duration-150 hover:bg-sunk"
                    >
                      Öffnen
                      <span className="sr-only">: {n.label}</span>
                      <Icon name="arrow-right" className="nudge size-4" />
                    </Link>
                    {!n.read && (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="inline-flex h-11 items-center rounded-[11px] px-3 text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-sunk hover:text-ink"
                        >
                          Als gelesen markieren
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {(nextCursor || cursor) && (
              <nav aria-label="Weitere Mitteilungen" className="flex flex-wrap gap-2">
                {cursor && (
                  <ButtonLink href="/mitteilungen" variant="ghost" size="sm">
                    Zu den neuesten
                  </ButtonLink>
                )}
                {nextCursor && (
                  <ButtonLink href={`/mitteilungen?cursor=${encodeURIComponent(nextCursor)}`} variant="secondary" size="sm">
                    Ältere laden
                  </ButtonLink>
                )}
              </nav>
            )}
          </>
        )}
        <p className="text-sm text-ink-2">
          Hinweise werden nach 90 Tagen automatisch entfernt. E-Mail-Hinweise, Ruhezeiten und Pausen stellst du unter{" "}
          <Link href="/konto/mitteilungen" className="link-quiet font-medium text-ink">
            Benachrichtigungen
          </Link>{" "}
          ein.
        </p>
      </div>
    </div>
  );
}
