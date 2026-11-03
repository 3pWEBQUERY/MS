import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusAction } from "@/components/content/admin/action-form";
import { ArticleVersionForm, ReviewForm, SourceForm, WithdrawForm } from "@/components/content/admin/article-forms";
import { ArticleStatusBadge, dateInputValue, DueBadge, one, StatusNotice } from "@/components/content/admin/common";
import { RichText } from "@/components/content/rich-text";
import { Icon } from "@/components/ui/icon";
import { AdminHeading } from "@/components/admin/ui";
import { Card, ExternalLink, KeyValue, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { recordDenied } from "@/server/audit";
import { requireStaff } from "@/server/auth/viewer";
import {
  archiveArticleAction,
  newVersionAction,
  publishVersionAction,
  removeSourceAction,
  submitForReviewAction,
} from "@/server/modules/content/editorial-actions";
import {
  getArticleForStaff,
  isVersionAuthor,
  listKnowledgeTopicsForStaff,
  listMediaOptions,
  publicState,
  staffDisplayName,
} from "@/server/modules/content/editorial-queries";
import { EDITABLE_STATUSES } from "@/server/modules/content/shared";
import { addMonths, EDITORIAL_AREA_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Artikel" };

const STATUS_MESSAGES: Record<string, string> = {
  angelegt: "Entwurf angelegt. Füge jetzt Quellen hinzu und sende ihn zur Prüfung.",
  gespeichert: "Entwurf gespeichert.",
  "neue-version": "Neue Version als Entwurf angelegt. Die bisher publizierte Version bleibt online, bis die neue publiziert ist.",
  quelle: "Quelle hinzugefügt.",
  "quelle-entfernt": "Quelle entfernt.",
  pruefung: "Prüfauftrag gesendet.",
  freigegeben: "Version freigegeben. Die Redaktion kann sie jetzt publizieren.",
  zurueckgegeben: "Version mit Änderungswünschen an die Redaktion zurückgegeben.",
  publiziert: "Version publiziert.",
  zurueckgezogen: "Artikel zurückgezogen. Er ist öffentlich nicht mehr sichtbar.",
  archiviert: "Artikel archiviert.",
};

/** S56 Artikel: Versionen, Prüfauftrag, Rückgabe, Freigabe, Publikation, Rückzug (CON02, CON03, US25). */
export default function StaffArticlePage({ params, searchParams }: PageProps<"/verwaltung/redaktion/artikel/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <StaffArticle params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffArticle({
  params,
  searchParams,
}: {
  params: PageProps<"/verwaltung/redaktion/artikel/[id]">["params"];
  searchParams: PageProps<"/verwaltung/redaktion/artikel/[id]">["searchParams"];
}) {
  const viewer = await requireStaff(EDITORIAL_AREA_ROLES);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await connection();
  const data = await getArticleForStaff(id);
  if (!data) {
    await recordDenied("unknown_object", viewer.accountId, "article", "/verwaltung/redaktion/artikel");
    notFound();
  }
  const { article, versions, sources, reviews } = data;
  const latest = versions[0];
  if (!latest) notFound();
  const pub = versions.find((v) => v.id === article.publishedVersionId) ?? null;
  const now = new Date();
  const state = pub ? publicState({ publicStatus: pub.status, publicReviewDueAt: pub.reviewDueAt }, now) : "none";
  const canEdit = viewer.roles.some((r) => r === "editor" || r === "admin");
  const isReviewer = viewer.roles.includes("medical_reviewer");
  const latestSources = sources.filter((s) => s.versionId === latest.id);
  const latestReviews = reviews.filter((r) => r.versionId === latest.id);
  const ownVersion = await isVersionAuthor(latest.id, latest.authorId, viewer.accountId);
  const canReview = latest.status === "in_review" && !ownVersion && (isReviewer || (!latest.isMedical && canEdit));
  const editable = EDITABLE_STATUSES.includes(latest.status);
  const [topics, media, reviewerName] = await Promise.all([
    editable && canEdit ? listKnowledgeTopicsForStaff() : Promise.resolve([]),
    editable && canEdit ? listMediaOptions() : Promise.resolve([]),
    canReview ? staffDisplayName(viewer.accountId) : Promise.resolve(""),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/verwaltung/redaktion", label: "Redaktion" }}
        eyebrow={article.topicName}
        title={latest.title}
        description={
          <span className="flex flex-wrap items-center gap-2 text-base">
            <span className="tabular font-mono text-sm">/wissen/{article.slug}</span>
            <DueBadge state={state === "live" ? "ok" : state} />
          </span>
        }
        actions={
          state === "live" || state === "due_soon" ? (
            <Link href={`/wissen/${article.slug}`} className="inline-flex h-12 items-center gap-2 font-semibold text-ink underline underline-offset-4">
              Öffentliche Ansicht <Icon name="arrow-right" className="size-4" />
            </Link>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-10">
        <StatusNotice code={one(sp.status)} messages={STATUS_MESSAGES} />

        {/* Öffentlicher Stand */}
        <section aria-labelledby="oeffentlich" className="flex flex-col gap-5">
          <AdminHeading id="oeffentlich" title="Öffentlicher Stand" />
          <div className="flex flex-col gap-5">
            {pub ? (
              <KeyValue
                className="border-y border-line"
                items={[
                  ["Version", <span key="v" className="tabular font-mono">V{pub.versionNo}</span>],
                  ["Status", <ArticleStatusBadge key="s" status={pub.status} />],
                  ["Publiziert", pub.publishedAt ? formatDateTime(pub.publishedAt) : "–"],
                  ["Nächster Prüftermin", pub.reviewDueAt ? formatDate(pub.reviewDueAt) : "–"],
                  ...(pub.withdrawnAt
                    ? ([
                        ["Zurückgezogen", formatDateTime(pub.withdrawnAt)],
                        ["Grund (intern)", pub.withdrawReason ?? "–"],
                      ] as [string, string][])
                    : []),
                ]}
              />
            ) : (
              <p className="text-base text-ink-2">Dieser Artikel war noch nie publiziert.</p>
            )}
            {state === "overdue" && (
              <Notice tone="warning" title="Prüftermin abgelaufen">
                Der Artikel ist öffentlich bereits ausgeblendet und wird automatisch zurückgezogen. Lege eine neue Version an und lass sie prüfen.
              </Notice>
            )}
            <div className="flex flex-wrap gap-6">
              {pub?.status === "published" && viewer.roles.some((r) => r === "editor" || r === "admin" || r === "medical_reviewer") && (
                <div className="w-full max-w-xl">
                  <WithdrawForm articleId={article.id} />
                </div>
              )}
              {canEdit && pub?.status !== "published" && latest.status !== "archived" && (
                <StatusAction
                  action={archiveArticleAction}
                  fields={{ articleId: article.id }}
                  label="Artikel archivieren"
                  icon={<Icon name="archive" className="size-5" />}
                  confirm={{
                    title: "Artikel archivieren?",
                    body: "Offene Versionen werden archiviert. Der Artikel bleibt intern dokumentiert und kann über eine neue Version wieder aufgenommen werden.",
                    confirmLabel: "Archivieren",
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* Arbeitsversion */}
        <section aria-labelledby="arbeitsversion" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="arbeitsversion" className="text-xl font-[650] tracking-[-0.01em] text-ink">
              Arbeitsversion V{latest.versionNo}
            </h2>
            <ArticleStatusBadge status={latest.status} />
            {latest.isMedical ? <span className="text-sm text-ink-2">Medizinischer Inhalt</span> : <span className="text-sm text-ink-2">Nicht medizinisch</span>}
          </div>

          {latest.status === "changes_requested" && latestReviews[0]?.comment && (
            <Notice tone="warning" title={`Änderungswünsche von ${latestReviews[0].reviewerDisplay}`}>
              <p className="whitespace-pre-wrap">{latestReviews[0].comment}</p>
            </Notice>
          )}

          {editable && canEdit ? (
            <>
              <ArticleVersionForm
                mode="edit"
                topics={topics}
                media={media}
                versionId={latest.id}
                version={latest.version}
                defaults={{
                  title: latest.title,
                  summary: latest.summary,
                  body: latest.body,
                  authorDisplay: latest.authorDisplay,
                  topicId: article.topicId,
                  readingMinutes: latest.readingMinutes,
                  isMedical: latest.isMedical,
                  coverMediaId: latest.coverMediaId,
                }}
              />
              <SourcesBlock sources={latestSources} editable />
              <SourceForm versionId={latest.id} />
              <Card tone="sunk" className="flex flex-col gap-3">
                <p className="font-semibold text-ink">Bereit für die Prüfung?</p>
                <p className="text-base text-ink-2">
                  Speichere zuerst deine Änderungen. Nach dem Prüfauftrag ist die Version gesperrt, bis sie freigegeben oder zurückgegeben wird.
                  {latest.isMedical && " Medizinische Artikel brauchen mindestens eine Quelle."}
                </p>
                <StatusAction action={submitForReviewAction} fields={{ versionId: latest.id }} label="Zur Prüfung senden" variant="primary" pendingText="Wird gesendet …" />
              </Card>
            </>
          ) : (
            <>
              <VersionPreview title={latest.title} summary={latest.summary} body={latest.body} />
              <SourcesBlock sources={latestSources} />
            </>
          )}

          {latest.status === "in_review" &&
            (canReview ? (
              <Card className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-ink">{latest.isMedical ? "Medizinische Prüfung" : "Redaktionelle Prüfung"}</h3>
                <ReviewForm
                  versionId={latest.id}
                  defaultDue={dateInputValue(addMonths(now, 12))}
                  maxDue={dateInputValue(addMonths(now, 12))}
                  defaultReviewer={reviewerName}
                />
              </Card>
            ) : (
              <Notice tone="info" title="Wartet auf Prüfung">
                {ownVersion
                  ? "Du hast an dieser Version mitgeschrieben. Die Prüfung übernimmt eine andere Person (Vieraugenprinzip)."
                  : latest.isMedical
                    ? "Diese Version wird von der medizinischen Prüfung freigegeben oder zurückgegeben."
                    : "Eine andere Person der Redaktion prüft diese Version."}
              </Notice>
            ))}

          {latest.status === "approved" && canEdit && (
            <Card tone="sunk" className="flex flex-col gap-3">
              <p className="font-semibold text-ink">Freigegeben – bereit zur Publikation</p>
              <p className="text-base text-ink-2">
                Nächster Prüftermin: {latest.reviewDueAt ? formatDate(latest.reviewDueAt) : "–"}.
                {pub?.status === "published" && " Die bisher publizierte Version wird dabei ersetzt und archiviert."}
              </p>
              <StatusAction
                action={publishVersionAction}
                fields={{ versionId: latest.id }}
                label="Version publizieren"
                variant="primary"
                pendingText="Wird publiziert …"
                confirm={{
                  title: "Version publizieren?",
                  body: "Die freigegebene Version wird sofort öffentlich sichtbar – mit Prüfdatum, Quellen und nächstem Prüftermin.",
                  confirmLabel: "Publizieren",
                }}
              />
            </Card>
          )}

          {["approved", "published", "withdrawn", "archived"].includes(latest.status) && canEdit && (
            <Card tone="sunk" className="flex flex-col gap-3">
              <p className="font-semibold text-ink">Inhalt ändern</p>
              <p className="text-base text-ink-2">
                Jede inhaltliche Änderung nach einer Freigabe braucht eine neue Version mit erneuter Prüfung (CON02). Die öffentliche Version
                bleibt bis dahin unverändert.
              </p>
              <StatusAction action={newVersionAction} fields={{ articleId: article.id }} label="Neue Version anlegen" icon={<Icon name="pencil" className="size-5" />} />
            </Card>
          )}
        </section>

        {/* Verlauf */}
        <section aria-labelledby="versionen" className="flex flex-col gap-5">
          <AdminHeading id="versionen" title="Versionen und Prüfungen" />
          <Table>
            <caption className="sr-only">Alle Versionen mit Prüfentscheiden</caption>
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Status</th>
                <th scope="col">Prüfung</th>
                <th scope="col">Zuletzt geändert</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const rv = reviews.filter((r) => r.versionId === v.id);
                return (
                  <tr key={v.id}>
                    <td className="tabular whitespace-nowrap font-mono">
                      V{v.versionNo}
                      {v.id === article.publishedVersionId && <span className="block font-sans text-sm text-ink-2">öffentliche Version</span>}
                    </td>
                    <td>
                      <ArticleStatusBadge status={v.status} />
                    </td>
                    <td className="min-w-56 text-sm">
                      {rv.length === 0
                        ? "–"
                        : rv.map((r) => (
                            <span key={r.id} className="block">
                              {r.decision === "approved" ? "Freigegeben" : "Änderungen nötig"} · {r.reviewerDisplay} ({r.specialty}) · {formatDate(r.createdAt)}
                            </span>
                          ))}
                    </td>
                    <td className="whitespace-nowrap text-sm">{formatDateTime(v.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </section>
      </div>
    </>
  );
}

function VersionPreview({ title, summary, body }: { title: string; summary: string; body: string }) {
  return (
    <Card className="flex flex-col gap-5">
      <p className="eyebrow">Vorschau</p>
      <p className="font-display text-[1.75rem] leading-tight tracking-[-0.015em] text-ink">{title}</p>
      <div className="rounded-[12px] bg-sunk p-4">
        <p className="mb-1 text-sm font-semibold text-ink-2">Kurzfassung</p>
        <p className="text-base text-ink">{summary}</p>
      </div>
      <RichText text={body} className="text-base" headingOffset={1} />
    </Card>
  );
}

function SourcesBlock({
  sources,
  editable,
}: {
  sources: { id: string; title: string; publisher: string; url: string | null; publishedOn: string | null; rightsNote: string | null }[];
  editable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-ink">Quellen ({sources.length})</h3>
      {sources.length === 0 ? (
        <p className="text-base text-ink-2">Noch keine Quellen hinterlegt.</p>
      ) : (
        <ol className="border-t border-line">
          {sources.map((s, i) => (
            <li key={s.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-3 border-b border-line py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start">
              <span aria-hidden="true" className="pt-0.5 font-mono text-sm font-medium tracking-[0.08em] text-ink-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold text-ink">{s.title}</p>
                <p className="text-sm text-ink-2">
                  {s.publisher}
                  {s.publishedOn && ` · ${s.publishedOn}`}
                  {s.rightsNote && ` · ${s.rightsNote}`}
                </p>
                {s.url && (
                  <ExternalLink href={s.url} className="w-fit break-all text-sm">
                    {s.url.replace(/^https:\/\//, "")}
                  </ExternalLink>
                )}
              </div>
              {editable && (
                <div className="col-start-2 sm:col-start-3">
                  <StatusAction action={removeSourceAction} fields={{ sourceId: s.id }} label="Entfernen" variant="quiet-danger" size="sm" pendingText="Wird entfernt …" />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
