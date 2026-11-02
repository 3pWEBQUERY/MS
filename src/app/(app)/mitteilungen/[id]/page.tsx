import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { isUuid } from "@/server/modules/messaging/access";
import { openNotification } from "@/server/modules/messaging/notifications";

export const metadata: Metadata = { title: "Mitteilung" };

/**
 * Öffnet eine Mitteilung (MSG08): markiert sie als gelesen und prüft das Ziel erneut.
 * Nicht mehr zugängliche Ziele werden neutral als «nicht mehr verfügbar» angezeigt.
 */
export default function OpenNotificationPage({ params }: PageProps<"/mitteilungen/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <OpenNotification params={params} />
    </Suspense>
  );
}

async function OpenNotification({ params }: { params: PageProps<"/mitteilungen/[id]">["params"] }) {
  const viewer = await requireViewer({ allowSuspended: true });
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const result = await openNotification(viewer, id);
  if (!result) notFound();
  if (result.href) redirect(result.href);

  return (
    <div className="flex max-w-2xl flex-col">
      <PageHeader back={{ href: "/mitteilungen", label: "Alle Mitteilungen" }} title="Mitteilung" />
      <EmptyState
        icon="info"
        title="Nicht mehr verfügbar"
        action={
          <ButtonLink href="/mitteilungen" variant="secondary">
            Zu den Mitteilungen
          </ButtonLink>
        }
      >
        Das Ziel dieses Hinweises ist nicht mehr verfügbar.
      </EmptyState>
    </div>
  );
}
