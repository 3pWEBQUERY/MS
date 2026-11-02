import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { EXPORT_ERROR, ExportStatusBadge } from "@/components/account/export-status";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, KeyValue, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import { recordDenied } from "@/server/audit";
import { hasRecentAuth, requireViewer } from "@/server/auth/viewer";
import { getOwnExport } from "@/server/modules/privacy/export";
import { ExportAutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Exportstatus", robots: { index: false } };

/** S17 Exportstatus (PRI03): Auftrag, Fortschritt, Ablaufzeit, sicherer Download. */
export default function ExportStatusPage({ params }: PageProps<"/konto/export/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <ExportStatus params={params} />
    </Suspense>
  );
}

const STEPS = [
  { key: "queued", label: "Auftrag angelegt" },
  { key: "running", label: "Daten werden zusammengestellt und verschlüsselt" },
  { key: "ready", label: "Bereit zum Herunterladen" },
] as const;

function formatSize(bytes: number | null) {
  if (!bytes) return "–";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("de-CH")} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("de-CH", { maximumFractionDigits: 1 })} MB`;
}

async function ExportStatus({ params }: { params: PageProps<"/konto/export/[id]">["params"] }) {
  const viewer = await requireViewer({ allowSuspended: true });
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  const job = parsed.success ? await getOwnExport(viewer.accountId, parsed.data) : null;
  if (!job) {
    // Neutrale 404 ohne Existenzangabe; Fremdzugriff ohne Werte erfasst (AT03)
    await recordDenied("export_not_owned", viewer.accountId, "export_job", "/konto/export/[id]");
    notFound();
  }
  const tz = viewer.prefs.timezone;
  const pending = job.status === "queued" || job.status === "running";
  const stepIndex = job.status === "queued" ? 0 : job.status === "running" ? 1 : 2;
  const recent = hasRecentAuth(viewer);
  const href = `/konto/export/${job.id}`;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        back={{ href: "/konto/daten", label: "Daten und Konto" }}
        eyebrow="Datenexport"
        title="Exportstatus"
        description={`Auftrag vom ${formatDateTime(job.createdAt, tz)}`}
        className="pb-0 sm:pb-0"
      />

      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-ink">Status</p>
          <ExportStatusBadge status={job.status} />
        </div>

        {(pending || job.status === "ready") && (
          <ol className="flex flex-col gap-3" aria-label="Fortschritt">
            {STEPS.map((s, i) => {
              const done = i < stepIndex || job.status === "ready";
              const active = i === stepIndex && pending;
              return (
                <li key={s.key} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] ${done ? "bg-ink text-ink-inverse" : active ? "border border-ink text-ink" : "bg-sunk text-ink-3"}`}
                  >
                    <Icon name={done ? "check" : active ? "loader" : "minus"} className={`size-4 ${active ? "motion-safe:animate-spin" : ""}`} />
                  </span>
                  <span className={done || active ? "text-ink" : "text-ink-2"}>
                    {s.label}
                    <span className="sr-only">{done ? " – erledigt" : active ? " – läuft" : " – ausstehend"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {pending && <ExportAutoRefresh />}

        {job.status === "ready" && job.expiresAt && (
          <>
            <KeyValue
              items={[
                ["Bereitgestellt", job.readyAt ? formatDateTime(job.readyAt, tz) : "–"],
                ["Herunterladbar bis", formatDateTime(job.expiresAt, tz)],
                ["Grösse", formatSize(job.sizeBytes)],
                ["Zuletzt heruntergeladen", job.downloadedAt ? formatDateTime(job.downloadedAt, tz) : "Noch nicht"],
              ]}
            />
            {recent ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a href={`/api/v1/exports/${job.id}?datei=json`} download className={buttonClass("primary", "lg")}>
                    <Icon name="download" className="size-5" />
                    Alle Daten (JSON)
                  </a>
                  <a href={`/api/v1/exports/${job.id}?datei=csv`} download className={buttonClass("secondary", "lg")}>
                    <Icon name="table" className="size-5" />
                    Tagebuch (CSV)
                  </a>
                </div>
                <p className="text-sm text-ink-2">
                  Speichere die Dateien an einem sicheren Ort. Sie enthalten Gesundheitsdaten und Nachrichten im Klartext.
                </p>
              </div>
            ) : (
              <ReauthNotice next={href}>Zum Herunterladen bestätige bitte erneut dein Passwort.</ReauthNotice>
            )}
          </>
        )}

        {job.status === "expired" && (
          <Notice tone="neutral" icon="clock" title="Dieser Export ist abgelaufen">
            Exportdateien stehen höchstens 24 Stunden bereit und werden danach automatisch gelöscht. Du kannst jederzeit einen
            neuen Export erstellen.
          </Notice>
        )}

        {job.status === "failed" && (
          <Notice tone={job.errorCode === "storage_not_configured" ? "warning" : "danger"} role="alert" title={job.errorCode === "storage_not_configured" ? "Exportablage nicht konfiguriert" : "Export fehlgeschlagen"}>
            {EXPORT_ERROR[job.errorCode ?? ""] ?? "Der Export konnte nicht erstellt werden. Es wurde nichts gespeichert. Bitte starte einen neuen Export."}
          </Notice>
        )}
      </Card>

      {(job.status === "expired" || job.status === "failed") && (
        <ButtonLink href="/konto/daten" variant="secondary" className="w-fit">
          Neuen Export starten
        </ButtonLink>
      )}
    </div>
  );
}
