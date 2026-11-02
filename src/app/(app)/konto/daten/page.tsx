import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav } from "@/components/account/account-nav";
import { ActionButton } from "@/components/account/action-button";
import { ExportStatusBadge } from "@/components/account/export-status";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, Notice, PageHeader, PageSkeleton, SectionHeader, Table } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { hasRecentAuth, requireViewer } from "@/server/auth/viewer";
import { requestAccessAction } from "@/server/modules/privacy/actions";
import { listOwnExports } from "@/server/modules/privacy/export";
import { listOwnRequests, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/server/modules/privacy/requests";
import { storageConfigured } from "@/server/storage";
import { StartExportForm } from "./start-export-form";

export const metadata: Metadata = { title: "Daten und Konto", robots: { index: false } };

/** S15 Daten und Konto (PRI03–PRI05, ACC08): auch bei Kontosperre erreichbar (PRD 03). */
export default function DataPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Data />
    </Suspense>
  );
}

async function Data() {
  const viewer = await requireViewer({ allowSuspended: true });
  const tz = viewer.prefs.timezone;
  const [exports, requests] = await Promise.all([listOwnExports(viewer.accountId), listOwnRequests(viewer.accountId)]);
  const configured = storageConfigured();
  const recent = hasRecentAuth(viewer);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Einstellungen"
          title="Daten und Konto"
          description="Deine Rechte an deinen Daten: Auskunft, Export und Löschung. Sie gelten unabhängig von Einschränkungen in der Community."
          className="pb-0 sm:pb-0"
        />
        {!viewer.accountSuspended && <AccountNav current="daten" />}
      </div>

      <section aria-labelledby="export-title" className="flex flex-col gap-4">
        <SectionHeader
          id="export-title"
          title="Meine Daten exportieren"
          description="Eine JSON-Datei mit Konto, Profil, Einstellungen, Einwilligungen, Gesundheitsdaten, Beiträgen und Gesprächen sowie dein Tagebuch als CSV-Tabelle."
          className="mb-0"
        />
        <ul className="flex max-w-2xl flex-col gap-2 text-base text-ink-2">
          <li className="flex gap-3">
            <Icon name="clock" className="mt-1 size-5 shrink-0 text-ink" />
            Meist in wenigen Minuten bereit, spätestens innerhalb von 24 Stunden.
          </li>
          <li className="flex gap-3">
            <Icon name="lock" className="mt-1 size-5 shrink-0 text-ink" />
            Verschlüsselt abgelegt und nur nach Anmeldung 24 Stunden herunterladbar. Danach wird die Datei automatisch gelöscht.
          </li>
          <li className="flex gap-3">
            <Icon name="users" className="mt-1 size-5 shrink-0 text-ink" />
            Von deinen Gesprächspartnern enthält der Export nur ihr Pseudonym und die Nachrichten an dich.
          </li>
        </ul>
        {!configured && (
          <Notice tone="warning" role="status" title="Exportablage nicht konfiguriert">
            Die sichere Ablage für Exportdateien ist im Moment nicht eingerichtet. Ein Export kann erst danach erstellt werden.
            Auskunft und Löschung bleiben möglich.
          </Notice>
        )}
        {recent ? (
          <StartExportForm disabled={!configured} />
        ) : (
          <div className="max-w-2xl">
            <ReauthNotice next="/konto/daten">Bevor du deine Daten exportierst, bestätige bitte dein Passwort.</ReauthNotice>
          </div>
        )}
        {exports.length > 0 && (
          <ul className="flex flex-col gap-3">
            {exports.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/konto/export/${e.id}`}
                  className="flex flex-col gap-2 rounded-[20px] border border-line bg-surface p-5 transition-colors hover:border-line-2 hover:bg-raised sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold text-ink">Export vom {formatDateTime(e.createdAt, tz)}</span>
                    <span className="text-sm text-ink-2">
                      {e.status === "ready" && e.expiresAt ? `Herunterladbar bis ${formatDateTime(e.expiresAt, tz)}` : "Status ansehen"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ExportStatusBadge status={e.status} />
                    <Icon name="chevron-right" className="size-5 text-ink-2" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="access-title" className="flex max-w-2xl flex-col gap-4">
        <SectionHeader
          id="access-title"
          title="Auskunft anfordern"
          description="Die Datenschutzstelle beschreibt dir, welche Daten wir bearbeiten, wofür, an wen sie gehen und wie lange wir sie aufbewahren. Ein Export allein ist keine vollständige Auskunft."
          className="mb-0"
        />
        <p className="text-sm text-ink-2">
          Deine Identität gilt durch deine Anmeldung und deine bestätigte E-Mail-Adresse als geprüft. Wir verlangen keine
          Ausweiskopie.
        </p>
        <ActionButton action={requestAccessAction} variant="secondary" pendingText="Wird gesendet …">
          Auskunft anfordern
        </ActionButton>
      </section>

      <section aria-labelledby="delete-title" className="flex flex-col gap-4">
        <SectionHeader id="delete-title" title="Löschen" className="mb-0" />
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/konto/daten/gesundheit-loeschen"
            className="flex items-start gap-4 rounded-[20px] border border-line bg-surface p-5 transition-colors hover:border-line-2 hover:bg-raised"
          >
            <Icon name="notebook" className="mt-0.5 size-6 shrink-0 text-ink" />
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-ink">Gesundheitsdaten löschen</span>
              <span className="text-sm text-ink-2">
                Alle Check-ins, Symptome, Notizen und zugehörige Exportdateien. Dein Community-Konto bleibt bestehen.
              </span>
            </span>
          </Link>
          <Link
            href="/konto/loeschen"
            className="flex items-start gap-4 rounded-[20px] border border-line bg-surface p-5 transition-colors hover:border-danger hover:bg-danger-soft"
          >
            <Icon name="trash" className="mt-0.5 size-6 shrink-0 text-danger" />
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-danger">Konto löschen</span>
              <span className="text-sm text-ink-2">Konto sofort deaktivieren und alle deine Daten löschen lassen.</span>
            </span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="requests-title" className="flex flex-col gap-4">
        <SectionHeader id="requests-title" title="Meine Datenschutzaufträge" className="mb-0" />
        {requests.length === 0 ? (
          <p className="text-base text-ink-2">Du hast noch keine Aufträge gestellt.</p>
        ) : (
          <Table>
            <caption className="sr-only">Meine Datenschutzaufträge mit Beleg, Art, Status und Datum</caption>
            <thead>
              <tr>
                <th scope="col">Beleg</th>
                <th scope="col">Art</th>
                <th scope="col">Status</th>
                <th scope="col">Eingegangen</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="tabular font-mono">{r.receiptNumber}</td>
                  <td>{REQUEST_TYPE_LABEL[r.type]}</td>
                  <td>
                    <Badge tone={r.status === "completed" ? "success" : r.status === "rejected" ? "neutral" : "info"}>
                      {REQUEST_STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(r.createdAt, tz)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <Card tone="sunk" className="flex max-w-2xl flex-col gap-2">
        <p className="font-semibold text-ink">Fragen zu deinen Daten?</p>
        <p className="text-base text-ink-2">
          Die Datenschutzstelle erreichst du über das{" "}
          <Link href="/kontakt" className="font-medium text-ink underline underline-offset-4">
            Kontaktformular
          </Link>
          . Mehr dazu in der{" "}
          <Link href="/datenschutz" className="font-medium text-ink underline underline-offset-4">
            Datenschutzinformation
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
