import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { StatusNotice } from "@/components/messaging/status-notice";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, KeyValue, Notice, PageHeader, PageSkeleton, PlainText, SectionHeader, Table } from "@/components/ui/primitives";
import { REPORT_REASONS } from "@/lib/catalog";
import { formatDate } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import {
  listDecisionsAboutMe,
  listMyReports,
  REPORT_STATUS_LABELS,
  type DecisionAboutMe,
} from "@/server/modules/moderation/member-cases";
import { REPORT_TARGET_LABELS } from "@/server/modules/moderation/reports";

export const metadata: Metadata = { title: "Meine Meldungen" };

/**
 * S43 Meine Meldungen und Einspruch (SAF05, US18, US20): eigener Status mit Belegnummer,
 * Entscheidungen, die mich betreffen, und Einspruch innerhalb von 30 Tagen.
 * Auch bei Kontosperre erreichbar (ACC08). Keine Identität anderer Personen.
 */
export default function MyReportsPage({ searchParams }: PageProps<"/meldungen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <MyReports searchParams={searchParams} />
    </Suspense>
  );
}

const reasonLabel = (r: string) => REPORT_REASONS.find(([k]) => k === r)?.[1] ?? "Sonstiges";

function durationText(hours: number | null) {
  if (!hours) return null;
  if (hours % 24 === 0) {
    const d = hours / 24;
    return d === 1 ? "1 Tag" : `${d} Tage`;
  }
  return hours === 1 ? "1 Stunde" : `${hours} Stunden`;
}

function DecisionCard({ d, tz }: { d: DecisionAboutMe; tz: string }) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">Fall</p>
          <p className="font-mono text-lg font-semibold text-ink">{d.caseNumber}</p>
        </div>
        {d.appeal ? (
          <Badge tone="info" icon="scale">
            Einspruch: {d.appeal.label}
          </Badge>
        ) : (
          <Badge tone="neutral">Entschieden</Badge>
        )}
      </div>
      <KeyValue
        items={[
          ["Betrifft", REPORT_TARGET_LABELS[d.targetType] ?? "Inhalt"],
          ...(d.decidedAt ? ([["Entschieden am", formatDate(d.decidedAt, tz)]] as [string, string][]) : []),
          ...d.actions.map(
            (a) =>
              [
                "Massnahme",
                <span key={a.kind} className="flex flex-col gap-1">
                  <span className="font-semibold">
                    {a.label}
                    {durationText(a.durationHours) ? ` · Dauer ${durationText(a.durationHours)}` : ""}
                  </span>
                  {a.ruleRef && <span className="text-sm text-ink-2">Regel: {a.ruleRef}</span>}
                  {a.publicReason && <PlainText text={a.publicReason} className="text-base text-ink-2" />}
                </span>,
              ] as [string, ReactNode],
          ),
          ...(d.ruleRef ? ([["Regelgrund", d.ruleRef]] as [string, string][]) : []),
          ...(d.decisionSummary
            ? ([["Begründung", <PlainText key="s" text={d.decisionSummary} />]] as [string, ReactNode][])
            : []),
        ]}
      />
      {d.appeal?.decisionNote && (
        <Notice tone="neutral" title="Ergebnis der Überprüfung">
          <PlainText text={d.appeal.decisionNote} />
        </Notice>
      )}
      {d.canAppeal && d.appealDeadline ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-2">Einspruch möglich bis {formatDate(d.appealDeadline, tz)}.</p>
          <ButtonLink href={`/meldungen/${d.caseId}/einspruch`} variant="secondary" size="sm">
            Einspruch erheben
          </ButtonLink>
        </div>
      ) : !d.appeal ? (
        <p className="text-sm text-ink-2">
          Die Einspruchsfrist ist abgelaufen. Spätere Anliegen kannst du über das <Link href="/kontakt" className="font-medium text-ink underline underline-offset-4">Kontaktformular</Link> einreichen.
        </p>
      ) : null}
    </Card>
  );
}

async function MyReports({ searchParams }: { searchParams: PageProps<"/meldungen">["searchParams"] }) {
  const viewer = await requireViewer({ allowSuspended: true });
  const [{ status }, reports, decisions] = await Promise.all([searchParams, listMyReports(viewer), listDecisionsAboutMe(viewer)]);
  const tz = viewer.prefs.timezone;

  return (
    <div className="flex max-w-3xl flex-col">
      <PageHeader
        eyebrow="Sicherheit"
        title="Meine Meldungen"
        description="Hier siehst du den Stand deiner Meldungen und Entscheidungen der Moderation, die dich betreffen."
      />
      <div className="flex flex-col gap-10">
        <StatusNotice code={status} />

        <section aria-labelledby="entscheidungen">
          <SectionHeader
            id="entscheidungen"
            title="Entscheidungen, die mich betreffen"
            description="Du kannst innerhalb von 30 Tagen Einspruch erheben. Eine andere zuständige Person prüft ihn."
          />
          {decisions.length === 0 ? (
            <p className="text-base text-ink-2">Es gibt keine Entscheidungen der Moderation zu deinem Konto.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {decisions.map((d) => (
                <DecisionCard key={d.caseId} d={d} tz={tz} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="meldungen">
          <SectionHeader
            id="meldungen"
            title="Meine Meldungen"
            description="Die gemeldete Person erfährt nicht, wer gemeldet hat."
          />
          {reports.length === 0 ? (
            <EmptyState icon="flag" title="Du hast noch nichts gemeldet">
              Wenn dir etwas nicht richtig erscheint, kannst du Beiträge, Antworten, Profile, Gruppen und Nachrichten direkt dort
              melden.
            </EmptyState>
          ) : (
            <Table>
              <caption className="sr-only">Meine Meldungen mit Belegnummer und Stand</caption>
              <thead>
                <tr>
                  <th scope="col">Belegnummer</th>
                  <th scope="col">Inhalt</th>
                  <th scope="col">Grund</th>
                  <th scope="col">Datum</th>
                  <th scope="col">Stand</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.receiptNumber}>
                    <td className="whitespace-nowrap font-mono">{r.receiptNumber}</td>
                    <td>{REPORT_TARGET_LABELS[r.targetType]}</td>
                    <td>{reasonLabel(r.reason)}</td>
                    <td className="tabular whitespace-nowrap">{formatDate(r.createdAt, tz, { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                    <td>
                      <Badge tone={r.status === "completed" ? "success" : r.status === "in_review" ? "info" : "neutral"}>
                        {REPORT_STATUS_LABELS[r.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <Notice tone="neutral" title="Wie Meldungen bearbeitet werden">
          Die Moderation arbeitet in festen Betriebszeiten und prüft Meldungen nach Dringlichkeit. Sie ist kein Notfalldienst –
          bei akuter Gefahr wähle den Notruf 144. Mehr dazu unter <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
        </Notice>
      </div>
    </div>
  );
}
