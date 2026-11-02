import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ActionButton } from "@/components/account/action-button";
import { RequestStatusBadge, TaskStatusBadge } from "@/components/account/request-status";
import { Card, KeyValue, Notice, PageHeader, PageSkeleton, PlainText, SectionHeader, Table } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { audit } from "@/server/audit";
import { requireStaff } from "@/server/auth/viewer";
import { clearExceptionAction, retryErasureAction, updateRequestStatusAction } from "@/server/modules/privacy/admin-actions";
import { getRequestForOfficer, REQUEST_TYPE_LABEL } from "@/server/modules/privacy/requests";
import { SYSTEM_LABEL } from "@/server/modules/privacy/tasks";
import { ExceptionForm } from "./exception-form";

export const metadata: Metadata = { title: "Datenschutzauftrag" };

/** S58 Detail: Teilschritte, Ausnahmen, erneutes Anstossen – ohne Inhalte der Person (PRD 03). */
export default function PrivacyRequestPage({ params }: PageProps<"/verwaltung/datenschutz/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <RequestDetail params={params} />
    </Suspense>
  );
}

const short = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "–");

async function RequestDetail({ params }: { params: PageProps<"/verwaltung/datenschutz/[id]">["params"] }) {
  const officer = await requireStaff(["privacy_officer"]);
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  const req = parsed.success ? await getRequestForOfficer(parsed.data) : null;
  if (!req) notFound();
  await audit({ actorId: officer.accountId, actorRole: "privacy_officer", action: "privacy.request.viewed", objectType: "privacy_request", objectId: req.id });

  const tz = officer.prefs.timezone;
  const isErasure = req.type === "erasure_account" || req.type === "erasure_health";
  const problems = req.tasks.filter((t) => t.status === "failed" || t.status === "escalated").length;
  const open = req.tasks.filter((t) => t.status !== "done").length;
  const manual = req.type === "access" || req.type === "rectification" || req.type === "export";
  const { overdue, exceptionDue, stale } = req;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        back={{ href: "/verwaltung/datenschutz", label: "Alle Aufträge" }}
        eyebrow={REQUEST_TYPE_LABEL[req.type]}
        title={<span className="tabular font-mono">{req.receiptNumber}</span>}
        actions={<RequestStatusBadge status={req.status} />}
        className="pb-0 sm:pb-0"
      />

      {overdue && (
        <Notice tone="danger" role="alert" title="Frist überschritten">
          Die Arbeitsfrist lief am {formatDate(req.dueAt, tz)} ab. Bitte prüfe die gesetzliche Antwortfrist und dokumentiere das
          weitere Vorgehen.
        </Notice>
      )}
      {req.status === "failed" && (
        <Notice tone="danger" role="alert" title="Eskaliert – kein stiller Abschluss">
          Mindestens ein Teilschritt ist nach mehreren Versuchen fehlgeschlagen. Ursache beheben und Teilschritte erneut anstossen.
        </Notice>
      )}

      <section aria-labelledby="meta-title" className="flex max-w-3xl flex-col gap-4">
        <SectionHeader id="meta-title" title="Auftrag" className="mb-0" />
        <Card>
          <KeyValue
            items={[
              ["Art", REQUEST_TYPE_LABEL[req.type]],
              ["Eingegangen", formatDateTime(req.createdAt, tz)],
              ["Frist", formatDate(req.dueAt, tz)],
              ["Identitätsprüfung", req.identityMethod],
              ["Konto (technische ID)", <span key="a" className="font-mono text-sm">{short(req.accountId)}</span>],
              ["Bearbeitet von", <span key="h" className="font-mono text-sm">{short(req.handledBy)}</span>],
              ["Zuletzt geändert", formatDateTime(req.updatedAt, tz)],
              ["Abgeschlossen", req.completedAt ? formatDateTime(req.completedAt, tz) : "–"],
            ]}
          />
        </Card>
        <p className="text-sm text-ink-2">
          Identität verhältnismässig geprüft über bestehende Sitzung und bestätigte E-Mail-Adresse; keine Ausweiskopien.
          Antworten gehen ausschliesslich an die bestätigte Adresse des Kontos.
        </p>
      </section>

      {manual && req.status !== "completed" && req.status !== "rejected" && (
        <section aria-labelledby="handle-title" className="flex max-w-3xl flex-col gap-4">
          <SectionHeader id="handle-title" title="Bearbeitung" className="mb-0" />
          <div className="flex flex-wrap gap-3">
            {req.status === "requested" && (
              <ActionButton action={updateRequestStatusAction} fields={{ requestId: req.id, status: "in_progress" }} variant="secondary">
                Bearbeitung übernehmen
              </ActionButton>
            )}
            <ActionButton action={updateRequestStatusAction} fields={{ requestId: req.id, status: "completed" }} variant="primary">
              Als erledigt markieren
            </ActionButton>
          </div>
        </section>
      )}

      {isErasure && (
        <section aria-labelledby="tasks-title" className="flex flex-col gap-4">
          <SectionHeader
            id="tasks-title"
            title="Teilschritte"
            description={`${req.tasks.length - open} von ${req.tasks.length} erledigt. Belege enthalten nur Anzahlen, keine Inhalte.`}
            className="mb-0"
          />
          <Table>
            <caption className="sr-only">Teilschritte des Löschauftrags</caption>
            <thead>
              <tr>
                <th scope="col">System</th>
                <th scope="col">Objektklasse</th>
                <th scope="col">Status</th>
                <th scope="col">Versuche</th>
                <th scope="col">Technischer Beleg</th>
                <th scope="col">Aktualisiert</th>
              </tr>
            </thead>
            <tbody>
              {req.tasks.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap">{SYSTEM_LABEL[t.system] ?? t.system}</td>
                  <td>{t.label}</td>
                  <td className="whitespace-nowrap">
                    <TaskStatusBadge status={t.status} />
                  </td>
                  <td className="tabular">{t.attempts}</td>
                  <td className="min-w-64 text-sm text-ink-2">{t.receipt ?? "–"}</td>
                  <td className="whitespace-nowrap text-sm">{formatDateTime(t.updatedAt, tz)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {(problems > 0 || req.status === "failed" || stale) && (
            <ActionButton action={retryErasureAction} fields={{ requestId: req.id }} variant="primary" pendingText="Wird angestossen …">
              Offene Teilschritte erneut anstossen
            </ActionButton>
          )}
        </section>
      )}

      <section aria-labelledby="exception-title" className="flex max-w-3xl flex-col gap-4">
        <SectionHeader
          id="exception-title"
          title="Begründete Ausnahme"
          description="Nur für rechtlich notwendige Aufbewahrung: getrennt, minimiert, befristet und regelmässig geprüft – kein «für immer»."
          className="mb-0"
        />
        {req.exceptionNote && req.exceptionUntil && (
          <Card tone="sunk" className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-ink-2">
              Befristet bis {formatDate(req.exceptionUntil, tz)}
              {exceptionDue && " · Prüfung fällig"}
            </p>
            <PlainText text={req.exceptionNote} className="text-base text-ink" />
            <ActionButton action={clearExceptionAction} fields={{ requestId: req.id }} variant="secondary" size="sm">
              Ausnahme aufheben
            </ActionButton>
          </Card>
        )}
        <ExceptionForm requestId={req.id} hasException={Boolean(req.exceptionNote)} />
      </section>
    </div>
  );
}
