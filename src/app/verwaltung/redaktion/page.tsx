import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArticleStatusBadge, DueBadge, one, RedaktionNav } from "@/components/content/admin/common";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AdminEmpty } from "@/components/admin/ui";
import { Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { listArticlesForStaff, listContactMessages, listReviewQueue, publicState } from "@/server/modules/content/editorial-queries";
import { EDITORIAL_AREA_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Redaktion" };

/** S56 Redaktion und Prüfung (CON02, CON03): Artikelliste mit Status, Prüftermin und Arbeitsvorrat «überfällig». */
export default function EditorialPage({ searchParams }: PageProps<"/verwaltung/redaktion">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <EditorialContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EditorialContent({ searchParams }: { searchParams: PageProps<"/verwaltung/redaktion">["searchParams"] }) {
  const viewer = await requireStaff(EDITORIAL_AREA_ROLES);
  const sp = await searchParams;
  await connection();
  const view = one(sp.ansicht) === "faellig" ? "faellig" : "artikel";
  const [rows, queue, hints] = await Promise.all([
    listArticlesForStaff(),
    listReviewQueue(viewer),
    listContactMessages(viewer, { refType: "article" }),
  ]);
  const now = new Date();
  const withState = rows.map((r) => ({ ...r, state: publicState(r, now) }));
  const dueRows = withState.filter((r) => r.state === "overdue" || r.state === "due_soon" || (r.state === "withdrawn" && r.latestStatus !== "archived"));
  const list = view === "faellig" ? dueRows : withState;
  const canEdit = viewer.roles.some((r) => r === "editor" || r === "admin");
  const openReviews = queue.filter((q) => !q.ownVersion).length;

  return (
    <>
      <PageHeader
        eyebrow="Verwaltung"
        title="Redaktion und Prüfung"
        description="Artikelversionen, Prüfaufträge, Freigabe und Publikation. Medizinische Inhalte gehen nur nach Fremdprüfung online."
        actions={
          canEdit ? (
            <ButtonLink href="/verwaltung/redaktion/neu" icon={<Icon name="plus" className="size-5" />}>
              Artikel anlegen
            </ButtonLink>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-8">
        <RedaktionNav roles={viewer.roles} active={view} counts={{ faellig: dueRows.length, pruefung: openReviews, hinweise: hints.length }} />
        {dueRows.some((r) => r.state === "overdue") && view === "artikel" && (
          <Notice tone="warning" title="Artikel mit abgelaufenem Prüftermin">
            Überfällige Artikel sind öffentlich nicht mehr sichtbar. Lege eine neue Version an und sende sie zur Prüfung.{" "}
            <Link href="/verwaltung/redaktion?ansicht=faellig">Arbeitsvorrat öffnen</Link>
          </Notice>
        )}
        {list.length === 0 ? (
          <AdminEmpty icon="book" title={view === "faellig" ? "Nichts fällig" : "Noch keine Artikel"}>
            {view === "faellig" ? "Alle publizierten Artikel haben einen gültigen Prüftermin." : "Lege den ersten Artikel als Entwurf an."}
          </AdminEmpty>
        ) : (
          <Table>
            <caption className="sr-only">Artikel mit Arbeitsversion und öffentlichem Stand</caption>
            <thead>
              <tr>
                <th scope="col">Artikel</th>
                <th scope="col">Arbeitsversion</th>
                <th scope="col">Öffentlich</th>
                <th scope="col">Prüftermin</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="min-w-64">
                    <Link href={`/verwaltung/redaktion/artikel/${r.id}`} className="link-quiet font-semibold text-ink">
                      {r.latestTitle}
                    </Link>
                    <span className="block text-sm text-ink-2">{r.topicName}</span>
                  </td>
                  <td>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="tabular font-mono text-sm text-ink-2">V{r.latestVersionNo}</span>
                      <ArticleStatusBadge status={r.latestStatus} />
                    </span>
                  </td>
                  <td>
                    <DueBadge state={r.state === "live" ? "ok" : r.state} />
                  </td>
                  <td className="tabular whitespace-nowrap text-sm">
                    {r.publicReviewDueAt && r.publicStatus === "published" ? formatDate(r.publicReviewDueAt) : "–"}
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
