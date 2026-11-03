import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AssignAppealForm, DecideAppealForm } from "@/components/admin/appeal-forms";
import {
  ACTION_LABEL,
  APPEAL_STATUS_LABEL,
  APPEAL_STATUS_TONE,
  CASE_STATUS_LABEL,
  PRIORITY_LABEL,
  ROLE_LABEL,
  TARGET_LABEL,
} from "@/components/admin/labels";
import { AdminSectionBlock, DateTime, Deadline } from "@/components/admin/ui";
import { Badge, Card, KeyValue, Notice, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { getAppealForStaff } from "@/server/modules/moderation/appeals";

export const metadata: Metadata = { title: "Einspruch" };

/** Einspruchsprüfung (SAF05, US20, AT07). Melderidentität wird nicht offengelegt. */
export default function AppealPage({ params }: PageProps<"/verwaltung/moderation/einsprueche/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/verwaltung/moderation/einsprueche/[id]">["params"] }) {
  const viewer = await requireStaff(["moderator", "moderation_lead"]);
  const { id } = await params;
  const a = await getAppealForStaff(viewer, id, "/verwaltung/moderation/einsprueche/[id]");
  if (!a) notFound();
  const now = new Date();
  const decided = a.status === "upheld" || a.status === "overturned";

  return (
    <div>
      <PageHeader
        back={{ href: "/verwaltung/moderation/einsprueche", label: "Einsprüche" }}
        eyebrow="Einspruch"
        title={
          <>
            Einspruch zu <span className="tabular font-mono">{a.case.caseNumber}</span>
          </>
        }
        description={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={APPEAL_STATUS_TONE[a.status]}>{APPEAL_STATUS_LABEL[a.status]}</Badge>
            {decided ? (
              <span className="text-sm text-ink-2">
                Entschieden <DateTime date={a.decidedAt} />
              </span>
            ) : (
              <Deadline dueAt={a.answerBy} now={now} total={a.answerBy.getTime() - a.createdAt.getTime()} />
            )}
          </div>
        }
      />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {a.viewerIsDecider && !decided && (
            <Notice tone="warning" title="Du warst am Entscheid beteiligt">
              Du kannst diesen Einspruch nicht prüfen. Die Prüfung übernimmt eine andere zuständige Person.
            </Notice>
          )}

          <AdminSectionBlock id="begruendung" title="Begründung des Einspruchs">
            <Card>
              {a.reason ? (
                <PlainText text={a.reason} className="text-base text-ink" />
              ) : (
                <p className="text-ink-2">Die Begründung kann nicht angezeigt werden. Bitte die technische Bereitschaft informieren.</p>
              )}
              <p className="mt-3 text-sm text-ink-2">
                Eingegangen <DateTime date={a.createdAt} />
              </p>
            </Card>
          </AdminSectionBlock>

          <AdminSectionBlock id="entscheid" title="Ursprünglicher Entscheid">
            <Card className="flex flex-col gap-3">
              <p className="text-sm text-ink-2">
                Entschieden <DateTime date={a.case.decidedAt} />
                {a.case.ruleRef && <> · Regelbezug {a.case.ruleRef}</>}
              </p>
              {a.case.decisionSummary ? (
                <PlainText text={a.case.decisionSummary} className="text-base text-ink" />
              ) : (
                <p className="text-ink-2">Keine Entscheidbegründung erfasst.</p>
              )}
            </Card>
            {a.actions.length > 0 && (
              <ul className="flex flex-col gap-2">
                {a.actions.map((x) => (
                  <li key={x.id} className="rounded-[16px] border border-line bg-surface p-4 text-sm">
                    <p className="font-semibold text-ink">
                      {ACTION_LABEL[x.kind]} · {x.actor ?? "System"} · <DateTime date={x.createdAt} />
                    </p>
                    {x.ruleRef && <p className="text-ink-2">Regelbezug: {x.ruleRef}</p>}
                    {x.publicReason && <PlainText text={x.publicReason} className="mt-1 text-ink-2" />}
                  </li>
                ))}
              </ul>
            )}
            {(a.status === "in_review" ? a.viewerIsReviewer || a.viewerIsLead : a.viewerIsLead) && (
              <p className="text-sm text-ink-2">
                Belege und vollständige Fallangaben:{" "}
                <Link href={`/verwaltung/moderation/${a.case.id}`} className="font-semibold text-ink underline underline-offset-4">
                  Fall öffnen
                </Link>
              </p>
            )}
          </AdminSectionBlock>

          {a.viewerIsReviewer && !a.viewerIsDecider && a.status === "in_review" && (
            <AdminSectionBlock id="pruefung" title="Prüfung abschliessen">
              <Card>
                <DecideAppealForm appealId={a.id} />
              </Card>
            </AdminSectionBlock>
          )}

          {decided && a.decisionNote && (
            <AdminSectionBlock id="ergebnis" title="Ergebnis">
              <Card>
                <PlainText text={a.decisionNote} className="text-base text-ink" />
              </Card>
            </AdminSectionBlock>
          )}
        </div>

        <aside className="flex flex-col gap-6" aria-label="Angaben zum Einspruch">
          <Card className="flex flex-col gap-2">
            <h2 className="text-lg font-[650] text-ink">Fall</h2>
            <KeyValue
              items={[
                ["Fallnummer", <span key="n" className="tabular font-mono">{a.case.caseNumber}</span>],
                ["Ziel", TARGET_LABEL[a.case.targetType] ?? a.case.targetType],
                ["Priorität", PRIORITY_LABEL[a.case.priority]],
                ["Fallstatus", CASE_STATUS_LABEL[a.case.status]],
                ["Antwortziel", <DateTime key="z" date={a.answerBy} />],
                ["Prüfende Person", a.viewerIsReviewer ? "Du" : (a.reviewer ?? "Noch nicht zugewiesen")],
              ]}
            />
          </Card>
          {a.viewerIsLead && !decided && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-[650] text-ink">Zuweisung</h2>
              {a.candidates.length === 0 ? (
                <Notice tone="warning" title="Keine unabhängige Person verfügbar">
                  Alle Personen mit Moderationsrolle waren am Entscheid beteiligt. Bitte eine weitere zuständige Person mit Rolle und MFA
                  einsetzen.
                </Notice>
              ) : (
                <AssignAppealForm
                  appealId={a.id}
                  current={a.reviewerId}
                  people={a.candidates.map((p) => ({
                    id: p.id,
                    label: `${p.id === viewer.accountId ? "Ich" : p.pseudonym} (${p.roles.map((r) => ROLE_LABEL[r]).join(", ")})`,
                  }))}
                />
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
