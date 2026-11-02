import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RedaktionNav } from "@/components/content/admin/common";
import { Badge, EmptyState, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { listReviewQueue } from "@/server/modules/content/editorial-queries";
import { EDITORIAL_AREA_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Prüfvorrat" };

/** S56 Prüfvorrat: Versionen in Prüfung. Eigene Versionen sind gekennzeichnet und nicht prüfbar (CON02). */
export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <ReviewQueue />
    </Suspense>
  );
}

async function ReviewQueue() {
  const viewer = await requireStaff(EDITORIAL_AREA_ROLES);
  const queue = await listReviewQueue(viewer);
  const isReviewer = viewer.roles.includes("medical_reviewer");
  const open = queue.filter((q) => !q.ownVersion && (isReviewer || !q.isMedical));
  return (
    <>
      <PageHeader
        eyebrow="Redaktion"
        title="Prüfvorrat"
        description="Versionen, die auf eine Freigabe oder Rückgabe warten. Die älteste steht oben."
      />
      <div className="flex flex-col gap-8">
        <RedaktionNav roles={viewer.roles} active="pruefung" counts={{ pruefung: open.length }} />
        {queue.length === 0 ? (
          <EmptyState icon="check-circle" title="Keine offenen Prüfaufträge">
            Sobald die Redaktion eine Version zur Prüfung sendet, erscheint sie hier.
          </EmptyState>
        ) : (
          <Table>
            <caption className="sr-only">Offene Prüfaufträge</caption>
            <thead>
              <tr>
                <th scope="col">Artikel</th>
                <th scope="col">Art</th>
                <th scope="col">Eingereicht</th>
                <th scope="col">Prüfung durch dich</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((q) => (
                <tr key={q.versionId}>
                  <td className="min-w-64">
                    <Link href={`/verwaltung/redaktion/artikel/${q.articleId}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                      {q.title}
                    </Link>
                    <span className="block text-sm text-ink-2">
                      {q.topicName} · V{q.versionNo}
                    </span>
                  </td>
                  <td className="text-sm">{q.isMedical ? "Medizinisch" : "Nicht medizinisch"}</td>
                  <td className="whitespace-nowrap text-sm">{formatDateTime(q.updatedAt)}</td>
                  <td>
                    {q.ownVersion ? (
                      <Badge tone="outline">Eigene Version – nicht prüfbar</Badge>
                    ) : q.isMedical && !isReviewer ? (
                      <Badge tone="outline">Nur medizinische Prüfung</Badge>
                    ) : (
                      <Badge tone="info">Bereit zur Prüfung</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
