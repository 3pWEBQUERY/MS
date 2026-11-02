import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { AssignCaseForm, DecideCaseForm, MeasureForm, PriorityForm, ReviewMeasureForm } from "@/components/admin/case-forms";
import {
  ACTION_LABEL,
  APPEAL_STATUS_LABEL,
  APPEAL_STATUS_TONE,
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
  CASE_TRANSITIONS,
  OPERATING_HOURS_NOTE,
  PRIORITY_LABEL,
  PRIORITY_TARGET,
  PRIORITY_TONE,
  REPORT_REASON_LABEL,
  ROLE_LABEL,
  SANCTION_LABEL,
  TARGET_LABEL,
  type CaseStatus,
} from "@/components/admin/labels";
import { AdminSectionBlock, DateTime, Deadline } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, EmptyState, KeyValue, Notice, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { changeCaseStatusAction } from "@/server/modules/moderation/actions";
import { getCaseForStaff, PRIORITY_WINDOW_MS, SECOND_APPROVAL_WINDOW_MS } from "@/server/modules/moderation/cases";

export const metadata: Metadata = { title: "Moderationsfall" };

/** S53 Moderationsfall (SAF03–SAF05, AT07): nur gesicherte Belege und Fallmetadaten. */
export default function CasePage({ params }: PageProps<"/verwaltung/moderation/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content params={params} />
    </Suspense>
  );
}

const CONTENT_STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "outline" }> = {
  published: { label: "Inhalt sichtbar", tone: "success" },
  hidden: { label: "Inhalt ausgeblendet", tone: "warning" },
  deleted: { label: "Vom Mitglied gelöscht", tone: "neutral" },
  removed: { label: "Entfernt", tone: "neutral" },
  missing: { label: "Nicht mehr vorhanden", tone: "outline" },
};

const TRANSITION_LABEL: Partial<Record<CaseStatus, string>> = {
  triaged: "Als triagiert markieren",
  in_progress: "In Bearbeitung nehmen",
  escalated: "An Leitung eskalieren",
  closed: "Fall abschliessen",
};

function durationText(h: number | null) {
  if (h === null || h === undefined) return null;
  if (h === 0) return "unbefristet";
  if (h % 24 === 0) return h === 24 ? "24 Stunden" : `${h / 24} Tage`;
  return `${h} Stunden`;
}

const SOURCE_LABEL: Record<string, string> = { ...TARGET_LABEL, message: "Nachricht" };

async function Content({ params }: { params: PageProps<"/verwaltung/moderation/[id]">["params"] }) {
  const viewer = await requireStaff(["moderator", "moderation_lead"]);
  const { id } = await params;
  const c = await getCaseForStaff(viewer, id, "/verwaltung/moderation/[id]");
  if (!c) notFound();

  const now = new Date();
  const open = ["new", "triaged", "in_progress", "escalated"].includes(c.status);
  const canWork = c.viewerIsLead || c.viewerIsAssignee;
  const caseRef = { caseId: c.id, version: c.version };
  const transitions = CASE_TRANSITIONS[c.status].filter((t) => !(c.status === "escalated" && !c.viewerIsLead) || t === "escalated");
  const canDecide = ["triaged", "in_progress", "escalated"].includes(c.status) && (c.status !== "escalated" || c.viewerIsLead);
  const isOwnCase = c.subjectAccountId === viewer.accountId;

  return (
    <div>
      <PageHeader
        back={{ href: "/verwaltung/moderation", label: "Moderationsübersicht" }}
        eyebrow={`Moderationsfall · ${TARGET_LABEL[c.targetType] ?? c.targetType}`}
        title={<span className="tabular font-mono">{c.caseNumber}</span>}
        description={
          <div className="flex flex-wrap items-center gap-2 text-base">
            <Badge tone={PRIORITY_TONE[c.priority]}>{PRIORITY_LABEL[c.priority]}</Badge>
            <Badge tone={CASE_STATUS_TONE[c.status]}>{CASE_STATUS_LABEL[c.status]}</Badge>
            <Deadline dueAt={c.dueAt} now={now} total={PRIORITY_WINDOW_MS[c.priority]} done={!open} />
          </div>
        }
      />

      <div className="flex flex-col gap-10">
        {isOwnCase && (
          <Notice tone="warning" title="Du bist von diesem Fall betroffen">
            Bitte bearbeite ihn nicht selbst und informiere die Moderationsleitung.
          </Notice>
        )}

        {c.viewerIsAppealReviewer && (
          <Notice tone="info" title="Lesezugriff für deine Einspruchsprüfung">
            Du siehst die Belege, um den Einspruch unabhängig zu prüfen. Das Ergebnis hältst du im Einspruch fest.
          </Notice>
        )}

        {c.priority === "P0" && open && (
          <Notice tone="danger" icon="shield-alert" title="Krisenablauf K01 – wahrgenommene akute Gefahr" role="note">
            <ol className="ml-5 flex list-decimal flex-col gap-1">
              <li>Beobachtung und Zeitpunkt als interne Notiz festhalten.</li>
              <li>Nur erforderliche Belege sichern – keine weiteren Chats oder Profile öffnen.</li>
              <li>Geschulte Moderationsleitung sofort alarmieren (Eskalation).</li>
              <li>Freigegebene Antwortvorlage verwenden: Grenzen der Plattform nennen und auf örtliche professionelle Hilfe verweisen.</li>
              <li>Nicht zu öffentlichen Gesundheitsdetails auffordern, keine Rettung oder Identifikation versprechen.</li>
              <li>Eine Sperre ist keine Krisenreaktion. Gefährdungs- und Missbrauchslage getrennt betrachten (K02).</li>
            </ol>
            <div className="mt-3 rounded-[12px] bg-surface p-4 text-ink">
              <p className="mb-1 text-sm font-semibold text-ink-2">Antwortvorlage (freigegeben)</p>
              <p>
                Danke, dass du dich meldest. Diese Plattform ist kein Notfalldienst und kann keine Hilfe vor Ort leisten. Wenn du oder
                jemand anderes in unmittelbarer Gefahr ist, wende dich bitte sofort an örtliche professionelle Hilfe. Erreichbare
                Hilfewege findest du unter «Sicherheit und akute Hilfe».
              </p>
            </div>
            <p className="mt-2">
              <Link href="/sicherheit">Sicherheit und akute Hilfe öffnen</Link>
            </p>
          </Notice>
        )}

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-10">
            <AdminSectionBlock
              id="belege"
              title="Gesicherte Belege"
              description="Nur die gemeldete Auswahl mit unveränderbarem Erfassungszeitpunkt. Weitere Chats, Profile oder Tagebücher sind nicht zugänglich."
            >
              {c.evidence.length === 0 ? (
                <EmptyState icon="file" title="Keine Belege gesichert">
                  Für diesen Fall liegen keine Belege vor. Entscheide nur auf Grundlage der Meldung und des Inhaltsstatus.
                </EmptyState>
              ) : (
                <ol className="flex flex-col gap-3">
                  {c.evidence.map((e, i) => (
                    <li key={e.id}>
                      <Card className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-ink">
                            Beleg {i + 1} · {SOURCE_LABEL[e.sourceType] ?? e.sourceType} von «{e.authorLabel}»
                          </p>
                          {e.hashVerified ? (
                            <Badge tone="success" icon="check">
                              Prüfsumme bestätigt
                            </Badge>
                          ) : (
                            <Badge tone="outline">Prüfsumme gespeichert</Badge>
                          )}
                        </div>
                        {e.text === null ? (
                          <p className="text-ink-2">Der Beleg kann nicht entschlüsselt werden. Bitte die technische Bereitschaft informieren.</p>
                        ) : (
                          <PlainText text={e.text} className="rounded-[12px] bg-sunk p-4 text-base text-ink" />
                        )}
                        <dl className="grid gap-x-6 gap-y-1 text-sm text-ink-2 sm:grid-cols-2">
                          <div>
                            <dt className="inline font-semibold">Verfasst: </dt>
                            <dd className="inline">
                              <DateTime date={e.sourceCreatedAt} />
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-semibold">Gesichert: </dt>
                            <dd className="inline">
                              <DateTime date={e.capturedAt} />
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="inline font-semibold">SHA-256: </dt>
                            <dd className="inline break-all font-mono text-xs">{e.contentHash}</dd>
                          </div>
                        </dl>
                      </Card>
                    </li>
                  ))}
                </ol>
              )}
            </AdminSectionBlock>

            <AdminSectionBlock
              id="meldungen"
              title={c.reports.length === 1 ? "1 Meldung" : `${c.reports.length} Meldungen`}
              description="Die Identität meldender Personen wird nicht angezeigt."
            >
              {c.reports.length === 0 ? (
                <p className="text-ink-2">Dieser Fall wurde ohne Meldung eröffnet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {c.reports.map((r) => (
                    <li key={r.label} className="rounded-[16px] border border-line bg-surface p-4">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {r.label}
                        <Badge tone="neutral">{REPORT_REASON_LABEL[r.reason] ?? r.reason}</Badge>
                        <span className="text-sm font-normal text-ink-2">
                          <DateTime date={r.createdAt} />
                        </span>
                      </p>
                      {r.details && <PlainText text={r.details} className="mt-2 text-base text-ink-2" />}
                    </li>
                  ))}
                </ul>
              )}
            </AdminSectionBlock>

            <AdminSectionBlock id="verlauf" title="Massnahmen und Verlauf">
              {c.actions.length === 0 ? (
                <p className="text-ink-2">Noch keine Massnahmen festgehalten.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {c.actions.map((a) => {
                    const approvalOpen = a.requiresSecondApproval === 1 && !a.approvedAt;
                    const effectPending = approvalOpen && (a.kind === "account_suspend" || a.kind === "write_suspend");
                    return (
                      <li key={a.id} id={approvalOpen ? "freigabe" : undefined}>
                        <Card tone={approvalOpen ? "sunk" : "surface"} className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-ink">
                              {ACTION_LABEL[a.kind]}
                              {durationText(a.durationHours) && <span className="font-normal text-ink-2"> · {durationText(a.durationHours)}</span>}
                            </p>
                            <span className="text-sm text-ink-2">
                              {a.ownAction ? "Du" : (a.actor ?? "System")} · <DateTime date={a.createdAt} />
                            </span>
                          </div>
                          {a.ruleRef && <p className="text-sm text-ink-2">Regelbezug: {a.ruleRef}</p>}
                          {a.publicReason && (
                            <div>
                              <p className="text-sm font-semibold text-ink-2">Begründung für die betroffene Person</p>
                              <PlainText text={a.publicReason} className="text-base text-ink" />
                            </div>
                          )}
                          {a.internalNote && (
                            <div>
                              <p className="text-sm font-semibold text-ink-2">Interne Notiz</p>
                              <PlainText text={a.internalNote} className="text-base text-ink" />
                            </div>
                          )}
                          {a.requiresSecondApproval === 1 && a.approvedAt && (
                            <Badge tone="success" icon="check" className="self-start">
                              Zweite Freigabe durch {a.approver} am {formatDateTime(a.approvedAt)}
                            </Badge>
                          )}
                          {a.requiresSecondApproval === 2 && (
                            <Badge tone="outline" className="self-start">
                              Nicht bestätigt durch {a.approver ?? "zweite Person"}
                            </Badge>
                          )}
                          {approvalOpen && (
                            <div className="flex flex-col gap-3 border-t border-line pt-3">
                              <p className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge tone="warning">{effectPending ? "Wartet auf zweite Freigabe" : "Zweitprüfung offen"}</Badge>
                                <Deadline
                                  dueAt={new Date(a.createdAt.getTime() + SECOND_APPROVAL_WINDOW_MS)}
                                  now={now}
                                  total={SECOND_APPROVAL_WINDOW_MS}
                                />
                              </p>
                              {c.viewerIsLead && !a.ownAction && !isOwnCase ? (
                                <ReviewMeasureForm actionId={a.id} effectPending={effectPending} />
                              ) : (
                                <p className="text-sm text-ink-2">
                                  Eine andere Person mit der Rolle {ROLE_LABEL.moderation_lead} muss diese Massnahme prüfen.
                                </p>
                              )}
                            </div>
                          )}
                        </Card>
                      </li>
                    );
                  })}
                </ol>
              )}
            </AdminSectionBlock>

            {canWork && !isOwnCase && open && (
              <AdminSectionBlock
                id="massnahme"
                title="Massnahme festhalten"
                description="Wiederholung, Schwere und Schutzbedarf bestimmen die Massnahme. Bei medizinischen Aussagen fachliche Prüfung beiziehen; keine Therapieanweisungen (K03)."
              >
                <Card>
                  <MeasureForm
                    caseRef={caseRef}
                    priority={c.priority}
                    canHide={(c.targetType === "post" || c.targetType === "comment") && c.contentStatus === "published"}
                    hasSubject={Boolean(c.subject)}
                    notesOnly={c.status === "escalated" && !c.viewerIsLead}
                  />
                </Card>
              </AdminSectionBlock>
            )}

            {canWork && !isOwnCase && canDecide && (
              <AdminSectionBlock
                id="entscheid"
                title="Entscheid"
                description="Der Entscheid wird der betroffenen Person mit Regelgrund und Einspruchsweg mitgeteilt. Meldende erhalten einen neutralen Statushinweis."
              >
                <Card>
                  <DecideCaseForm caseRef={caseRef} hasSubject={Boolean(c.subject)} />
                </Card>
              </AdminSectionBlock>
            )}

            {(c.decisionSummary || c.decidedAt) && (
              <AdminSectionBlock id="entschieden" title="Entscheid">
                <Card className="flex flex-col gap-3">
                  <p className="text-sm text-ink-2">
                    Entschieden <DateTime date={c.decidedAt} />
                    {c.ruleRef && <> · Regelbezug {c.ruleRef}</>}
                  </p>
                  {c.decisionSummary && <PlainText text={c.decisionSummary} className="text-base text-ink" />}
                </Card>
              </AdminSectionBlock>
            )}
          </div>

          <aside className="flex flex-col gap-6" aria-label="Fallangaben">
            <Card className="flex flex-col gap-2">
              <h2 className="text-lg font-[650] text-ink">Fallangaben</h2>
              <KeyValue
                items={[
                  ["Eingang", <DateTime key="e" date={c.createdAt} />],
                  ["Ziel", TARGET_LABEL[c.targetType] ?? c.targetType],
                  [
                    "Inhaltsstatus",
                    c.contentStatus ? (
                      <Badge key="s" tone={CONTENT_STATUS[c.contentStatus]?.tone ?? "neutral"}>
                        {CONTENT_STATUS[c.contentStatus]?.label ?? c.contentStatus}
                      </Badge>
                    ) : (
                      <span key="s" className="text-ink-2">Nur im Fall (Belege)</span>
                    ),
                  ],
                  ["Gründe", c.reasonCounts.map((r) => `${REPORT_REASON_LABEL[r.reason] ?? r.reason} (${r.count})`).join(", ") || "–"],
                  ["Reaktionsziel", PRIORITY_TARGET[c.priority]],
                  ["Frist", <DateTime key="f" date={c.dueAt} />],
                  ["Zuständig", c.viewerIsAssignee ? "Du" : (c.assignee ?? "Nicht zugewiesen")],
                  ...(c.closedAt
                    ? ([
                        ["Abgeschlossen", <DateTime key="c" date={c.closedAt} />],
                        ["Belege gelöscht ab", <DateTime key="p" date={c.evidencePurgeAfter} />],
                      ] as [string, ReactNode][])
                    : []),
                ]}
              />
              <p className="text-sm text-ink-2">{OPERATING_HOURS_NOTE}</p>
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-[650] text-ink">Betroffenes Konto</h2>
              {c.subject ? (
                <>
                  <p className="font-semibold text-ink">{c.subject.pseudonym}</p>
                  <p className="text-sm text-ink-2">
                    Kontostatus: {c.subject.status === "active" ? "aktiv" : c.subject.status === "restricted" ? "eingeschränkt" : c.subject.status === "suspended" ? "gesperrt" : c.subject.status}
                    {" · "}
                    {c.subject.priorCases === 0 ? "keine weiteren Fälle" : c.subject.priorCases === 1 ? "1 weiterer Fall" : `${c.subject.priorCases} weitere Fälle`}
                  </p>
                  {c.subject.activeSanctions.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {c.subject.activeSanctions.map((s) => (
                        <li key={s.id}>
                          <Badge tone="warning">
                            {SANCTION_LABEL[s.kind] ?? s.kind}
                            {s.endsAt ? ` bis ${formatDateTime(s.endsAt)}` : " unbefristet"}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-2">Keine aktiven Sanktionen.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-2">Kein Konto zugeordnet oder Konto gelöscht.</p>
              )}
            </Card>

            {c.viewerIsLead && c.status !== "closed" && (
              <Card className="flex flex-col gap-3">
                <h2 className="text-lg font-[650] text-ink">Zuweisung</h2>
                <AssignCaseForm
                  caseRef={caseRef}
                  current={c.assigneeId}
                  people={c.assignable
                    .filter((p) => p.id !== c.subjectAccountId)
                    .map((p) => ({
                      id: p.id,
                      label: `${p.id === viewer.accountId ? "Ich" : p.pseudonym} (${p.roles.map((r) => ROLE_LABEL[r]).join(", ")})`,
                    }))}
                />
              </Card>
            )}

            {canWork && !isOwnCase && open && (
              <Card className="flex flex-col gap-3">
                <h2 className="text-lg font-[650] text-ink">{c.status === "new" ? "Triage" : "Priorität"}</h2>
                <PriorityForm caseRef={caseRef} current={c.priority} triage={c.status === "new"} />
              </Card>
            )}

            {canWork && !isOwnCase && transitions.length > 0 && (
              <Card className="flex flex-col gap-3">
                <h2 className="text-lg font-[650] text-ink">Status</h2>
                <p className="text-sm text-ink-2">
                  Aktuell: {CASE_STATUS_LABEL[c.status]}. Ein Entscheid entsteht über «Entscheid speichern».
                </p>
                <div className="flex flex-col gap-2">
                  {transitions.map((t) => (
                    <ActionButton
                      key={t}
                      action={changeCaseStatusAction}
                      fields={{ ...caseRef, to: t }}
                      label={TRANSITION_LABEL[t] ?? CASE_STATUS_LABEL[t]}
                      confirm={
                        t === "closed"
                          ? {
                              title: "Fall abschliessen?",
                              body: "Der Fall wird abgeschlossen. Belege werden 180 Tage nach Abschluss gelöscht. Ein Einspruch bleibt bis 30 Tage nach dem Entscheid möglich.",
                              confirmLabel: "Fall abschliessen",
                            }
                          : t === "escalated"
                            ? {
                                title: "An die Leitung eskalieren?",
                                body: "Die Moderationsleitung übernimmt den Entscheid. Du kannst weiterhin interne Notizen ergänzen.",
                                confirmLabel: "Eskalieren",
                              }
                            : undefined
                      }
                    />
                  ))}
                </div>
              </Card>
            )}

            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-[650] text-ink">Einsprüche</h2>
              {c.appeals.length === 0 ? (
                <p className="text-sm text-ink-2">Kein Einspruch eingegangen.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {c.appeals.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={APPEAL_STATUS_TONE[a.status]}>{APPEAL_STATUS_LABEL[a.status]}</Badge>
                      <DateTime date={a.createdAt} />
                      <Link href={`/verwaltung/moderation/einsprueche/${a.id}`} className="font-semibold text-ink underline underline-offset-4">
                        Öffnen
                        <Icon name="arrow-right" className="ml-1 inline size-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
