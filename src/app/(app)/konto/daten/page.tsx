import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/account/action-button";
import { ExportStatusBadge } from "@/components/account/export-status";
import { RequestStatusBadge } from "@/components/account/request-status";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { RuledItem, RuledList, SettingsHeader, SettingsSection, SettingsSections } from "@/components/account/settings-layout";
import { Icon } from "@/components/ui/icon";
import { IndexList, IndexRow, Notice, PageSkeleton, Table } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { hasRecentAuth, requireViewer } from "@/server/auth/viewer";
import { requestAccessAction } from "@/server/modules/privacy/actions";
import { listOwnExports } from "@/server/modules/privacy/export";
import { listOwnRequests, REQUEST_TYPE_LABEL } from "@/server/modules/privacy/requests";
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
      <SettingsHeader
        current="daten"
        title="Daten und Konto"
        description="Deine Rechte an deinen Daten: Auskunft, Export und Löschung. Sie gelten unabhängig von Einschränkungen in der Community."
        back={viewer.accountSuspended ? { href: "/konto/gesperrt", label: "Zurück zur Übersicht" } : undefined}
        showNav={!viewer.accountSuspended}
      />

      <SettingsSections>
        <SettingsSection
          id="export-title"
          index="01"
          title="Meine Daten exportieren"
          description="Eine JSON-Datei mit Konto, Profil, Einstellungen, Einwilligungen, Gesundheitsdaten, Beiträgen und Gesprächen sowie dein Tagebuch als CSV-Tabelle."
        >
          <RuledList>
            <RuledItem icon={<Icon name="clock" className="size-5" />}>
              Meist in wenigen Minuten bereit, spätestens innerhalb von 24 Stunden.
            </RuledItem>
            <RuledItem icon={<Icon name="lock" className="size-5" />}>
              Verschlüsselt abgelegt und nur nach Anmeldung 24 Stunden herunterladbar. Danach wird die Datei automatisch gelöscht.
            </RuledItem>
            <RuledItem icon={<Icon name="users" className="size-5" />}>
              Von deinen Gesprächspartnern enthält der Export nur ihr Pseudonym und die Nachrichten an dich.
            </RuledItem>
          </RuledList>
          {!configured && (
            <Notice tone="warning" role="status" title="Exportablage nicht konfiguriert">
              Die sichere Ablage für Exportdateien ist im Moment nicht eingerichtet. Ein Export kann erst danach erstellt werden.
              Auskunft und Löschung bleiben möglich.
            </Notice>
          )}
          {recent ? (
            <StartExportForm disabled={!configured} />
          ) : (
            <ReauthNotice next="/konto/daten">Bevor du deine Daten exportierst, bestätige bitte dein Passwort.</ReauthNotice>
          )}
          {exports.length > 0 && (
            <IndexList>
              {exports.map((e) => (
                <IndexRow
                  key={e.id}
                  href={`/konto/export/${e.id}`}
                  title={`Export vom ${formatDateTime(e.createdAt, tz)}`}
                  meta={e.status === "ready" && e.expiresAt ? `Herunterladbar bis ${formatDateTime(e.expiresAt, tz)}` : "Status ansehen"}
                  aside={
                    <span className="hidden sm:inline-flex">
                      <ExportStatusBadge status={e.status} />
                    </span>
                  }
                >
                  <span className="sm:hidden">
                    <ExportStatusBadge status={e.status} />
                  </span>
                </IndexRow>
              ))}
            </IndexList>
          )}
        </SettingsSection>

        <SettingsSection
          id="access-title"
          index="02"
          title="Auskunft anfordern"
          description="Die Datenschutzstelle beschreibt dir, welche Daten wir bearbeiten, wofür, an wen sie gehen und wie lange wir sie aufbewahren. Ein Export allein ist keine vollständige Auskunft."
        >
          <p className="text-base text-ink-2">
            Deine Identität gilt durch deine Anmeldung und deine bestätigte E-Mail-Adresse als geprüft. Wir verlangen keine
            Ausweiskopie.
          </p>
          <ActionButton action={requestAccessAction} variant="secondary" pendingText="Wird gesendet …">
            Auskunft anfordern
          </ActionButton>
        </SettingsSection>

        <SettingsSection id="requests-title" index="03" title="Meine Datenschutzaufträge" wide>
          {requests.length === 0 ? (
            <p className="border-y border-line py-4 text-base text-ink-2">Du hast noch keine Aufträge gestellt.</p>
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
                      <RequestStatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap">{formatDate(r.createdAt, tz)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </SettingsSection>

        {/* Unwiderrufliches zuletzt und klar abgesetzt – ruhig, ohne Alarmfläche */}
        <SettingsSection id="delete-title" index="04" title="Löschen" tone="danger" wide>
          <ul className="flex flex-col border-t border-ink">
            <li className="border-b border-line">
              <Link
                href="/konto/daten/gesundheit-loeschen"
                data-focus-inset
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 py-5 transition-colors duration-150 sm:gap-x-6 sm:py-6"
              >
                <Icon name="notebook" className="mt-0.5 size-5 shrink-0 text-ink-2" />
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-lg font-semibold leading-snug text-ink underline decoration-transparent decoration-1 underline-offset-[0.25em] transition-colors duration-150 group-hover:decoration-current">
                    Gesundheitsdaten löschen
                  </span>
                  <span className="max-w-2xl text-base text-ink-2">
                    Alle Check-ins, Symptome, Notizen und zugehörige Exportdateien. Dein Community-Konto bleibt bestehen.
                  </span>
                </span>
                <Icon name="arrow-right" className="nudge mt-1 size-5 shrink-0 text-ink-3 group-hover:text-ink" />
              </Link>
            </li>
            <li className="border-b border-line">
              <Link
                href="/konto/loeschen"
                data-focus-inset
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 py-5 transition-colors duration-150 sm:gap-x-6 sm:py-6"
              >
                <Icon name="trash" className="mt-0.5 size-5 shrink-0 text-danger" />
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-lg font-semibold leading-snug text-danger underline decoration-transparent decoration-1 underline-offset-[0.25em] transition-colors duration-150 group-hover:decoration-current">
                    Konto löschen
                  </span>
                  <span className="max-w-2xl text-base text-ink-2">Konto sofort deaktivieren und alle deine Daten löschen lassen.</span>
                </span>
                <Icon name="arrow-right" className="nudge mt-1 size-5 shrink-0 text-danger" />
              </Link>
            </li>
          </ul>
        </SettingsSection>
      </SettingsSections>

      <p className="max-w-2xl border-t border-line pt-6 text-base text-ink-2">
        <span className="font-semibold text-ink">Fragen zu deinen Daten?</span> Die Datenschutzstelle erreichst du über das{" "}
        <Link href="/kontakt" className="link-quiet font-medium text-ink">
          Kontaktformular
        </Link>
        . Mehr dazu in der{" "}
        <Link href="/datenschutz" className="link-quiet font-medium text-ink">
          Datenschutzinformation
        </Link>
        .
      </p>
    </div>
  );
}
