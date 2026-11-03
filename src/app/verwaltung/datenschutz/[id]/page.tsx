import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ActionButton } from "@/components/account/action-button";
import { RequestStatusBadge, TaskStatusBadge } from "@/components/account/request-status";
import { AdminHeading } from "@/components/admin/ui";
import { KeyValue, Notice, PageHeader, PageSkeleton, PlainText, Table } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { audit } from "@/server/audit";
import { requireStaff } from "@/server/auth/viewer";
import { clearExceptionAction, retryErasureAction, updateRequestStatusAction } from "@/server/modules/privacy/admin-actions";
import { analyticsAccessSummary } from "@/server/modules/privacy/access-summary";
import { IDENTITY_CHECKS } from "@/server/modules/privacy/mfa-recovery";
import { getRequestForOfficer, REQUEST_TYPE_LABEL } from "@/server/modules/privacy/requests";
import { SYSTEM_LABEL } from "@/server/modules/privacy/tasks";
import { ExceptionForm } from "./exception-form";
import { MfaRecoveryForm } from "./mfa-recovery-form";

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
const ANALYTICS_DECISION = { granted: "Erteilt", denied: "Abgelehnt", withdrawn: "Widerrufen" } as const;

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
  const isMfa = req.type === "mfa_recovery";
  const { overdue, exceptionDue, stale } = req;
  // Auskunft (PRI03, PRD 15): auch die optionale Nutzungsstatistik gehört zur Antwort.
  const analytics = req.type === "access" && req.accountId ? await analyticsAccessSummary(req.accountId) : null;

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        back={{ href: "/verwaltung/datenschutz", label: "Alle Aufträge" }}
        eyebrow={REQUEST_TYPE_LABEL[req.type]}
        title={<span className="tabular font-mono">{req.receiptNumber}</span>}
        actions={<RequestStatusBadge status={req.status} />}
        className="mb-0 sm:mb-0"
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
        <AdminHeading id="meta-title" title="Auftrag" />
        <KeyValue
            className="border-y border-line"
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
        <p className="text-sm text-ink-2">
          {isMfa
            ? "Die Anfrage wurde nach erfolgreicher Passwort-Anmeldung gestellt. Die Identität prüft die Datenschutzstelle verhältnismässig – keine Ausweiskopien, nie allein über eine Profilangabe."
            : "Identität verhältnismässig geprüft über bestehende Sitzung und bestätigte E-Mail-Adresse; keine Ausweiskopien."}{" "}
          Antworten gehen ausschliesslich an die bestätigte Adresse des Kontos.
        </p>
      </section>

      {isMfa && (req.status === "requested" || req.status === "verified") && (
        <section aria-labelledby="mfa-title" className="flex max-w-3xl flex-col gap-4">
          <AdminHeading
            id="mfa-title"
            title={req.status === "requested" ? "Identität prüfen" : "Zweite Freigabe"}
            description={
              req.status === "requested"
                ? "Nach der Bestätigung werden Geheimnis und Wiederherstellungscodes entfernt und alle Sitzungen beendet. Bei Konten mit Mitarbeitendenrolle setzt erst eine zweite Person zurück."
                : "Konto mit Mitarbeitendenrolle: Die Identität ist geprüft. Das Zurücksetzen gibt eine andere Person der Datenschutzstelle frei."
            } />
          {req.accountId === officer.accountId ? (
            <Notice tone="neutral" title="Eigener Auftrag">
              Eigene Aufträge bearbeitet eine andere Person der Datenschutzstelle.
            </Notice>
          ) : req.status === "verified" && req.handledBy === officer.accountId ? (
            <Notice tone="neutral" title="Vieraugenprinzip">
              Du hast die Identität geprüft. Die zweite Freigabe erteilt eine andere Person der Datenschutzstelle.
            </Notice>
          ) : (
            <MfaRecoveryForm
              requestId={req.id}
              step={req.status === "requested" ? "verify" : "reset"}
              checks={IDENTITY_CHECKS.map((c) => ({ value: c.value, label: c.label }))}
            />
          )}
        </section>
      )}

      {manual && req.status !== "completed" && req.status !== "rejected" && (
        <section aria-labelledby="handle-title" className="flex max-w-3xl flex-col gap-4">
          <AdminHeading id="handle-title" title="Bearbeitung" />
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

      {analytics && (
        <section aria-labelledby="analytics-title" className="flex max-w-3xl flex-col gap-4">
          <AdminHeading
            id="analytics-title"
            title="Für die Auskunft: optionale Nutzungsstatistik"
            description="Nur Stand und Anzahlen. Die Rohereignisse selbst erhält die Person mit ihrem Datenexport (Abschnitt «nutzungsstatistik»)." />
          <KeyValue
              className="border-y border-line"
              items={[
                [
                  "Einwilligung",
                  analytics.decision
                    ? `${ANALYTICS_DECISION[analytics.decision]} am ${formatDateTime(analytics.decidedAt!, tz)} (Fassung ${analytics.textVersion})`
                    : "Keine Entscheidung – Statistik aus",
                ],
                ["Analysebezug", analytics.subjectExpiresAt ? `besteht, Löschung spätestens ${formatDate(analytics.subjectExpiresAt, tz)}` : "keiner"],
                [
                  "Rohereignisse",
                  analytics.events > 0 ? `${analytics.events} (Kalendertage ${analytics.firstDay} bis ${analytics.lastDay})` : "keine",
                ],
                ["Zweck und Empfänger", "Produktverbesserung; nur intern, Ausgabe nur als Summen ab zehn Personen, keine Weitergabe an Dritte"],
              ]}
            />
        </section>
      )}

      {isErasure && (
        <section aria-labelledby="tasks-title" className="flex flex-col gap-4">
          <AdminHeading
            id="tasks-title"
            title="Teilschritte"
            description={`${req.tasks.length - open} von ${req.tasks.length} erledigt. Belege enthalten nur Anzahlen, keine Inhalte.`} />
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
        <AdminHeading
          id="exception-title"
          title="Begründete Ausnahme"
          description="Nur für rechtlich notwendige Aufbewahrung: getrennt, minimiert, befristet und regelmässig geprüft – kein «für immer»." />
        {req.exceptionNote && req.exceptionUntil && (
          <div className="flex flex-col items-start gap-3 border-l-2 border-accent pl-5">
            <p className="text-sm font-semibold text-ink-2">
              Befristet bis {formatDate(req.exceptionUntil, tz)}
              {exceptionDue && " · Prüfung fällig"}
            </p>
            <PlainText text={req.exceptionNote} className="text-base text-ink" />
            <ActionButton action={clearExceptionAction} fields={{ requestId: req.id }} variant="secondary" size="sm">
              Ausnahme aufheben
            </ActionButton>
          </div>
        )}
        <ExceptionForm requestId={req.id} hasException={Boolean(req.exceptionNote)} />
      </section>
    </div>
  );
}
