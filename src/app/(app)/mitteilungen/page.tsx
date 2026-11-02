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
 * Das Ziel wird beim Öffnen erneut geprüft (/mitteilungen/[id]).
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
              <p className="text-base text-ink-2" aria-live="polite">
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
            <ul className="flex flex-col gap-3">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-[20px] border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
                    n.read ? "border-line bg-surface" : "border-line-2 bg-raised",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-sunk text-ink">
                      <Icon name={ICONS[n.type] ?? "bell"} className="size-5" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className={cn("text-base text-ink", !n.read && "font-semibold")}>
                        {!n.read && (
                          <span className="mr-2 inline-block size-2.5 rounded-full bg-accent align-middle" aria-hidden="true" />
                        )}
                        {n.label}
                        {!n.read && <span className="sr-only"> (ungelesen)</span>}
                      </p>
                      <p className="text-sm text-ink-2">
                        {formatDateTime(n.createdAt, tz)}
                        {!n.read && <span aria-hidden="true"> · Ungelesen</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <ButtonLink href={`/mitteilungen/${n.id}`} prefetch={false} size="sm" variant={n.read ? "secondary" : "primary"}>
                      Öffnen
                      <span className="sr-only">: {n.label}</span>
                    </ButtonLink>
                    {!n.read && (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
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
          <Link href="/konto/mitteilungen" className="font-medium text-ink underline underline-offset-4">
            Benachrichtigungen
          </Link>{" "}
          ein.
        </p>
      </div>
    </div>
  );
}
