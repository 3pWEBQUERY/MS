import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { FLAG_LABEL, INCIDENT_STEPS } from "@/components/admin/labels";
import { FlagForm, IncidentStepForm } from "@/components/admin/ops-forms";
import { AdminSectionBlock, DateTime, formatSpan, StatGrid, StatTile } from "@/components/admin/ui";
import { ALARM_LABEL, OpsSubNav } from "@/components/admin/ops-nav";
import { Badge, Card, EmptyState, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { requeueDeliveryAction, requeueOutboxAction } from "@/server/modules/admin/flags-actions";
import { deliveryProblems, listFlags, OPS_ROLES, outboxProblems, outboxSummary, systemStatus } from "@/server/modules/admin/ops";
import { WORKER_STALE_MS } from "@/server/modules/admin/ops-alarms";

export const metadata: Metadata = { title: "Betrieb" };

/** S60 Betrieb und Konfiguration (HOM08, MSG08, NFR16, NFR19, US26) – ohne Inhalte und Personendaten. */
export default function OpsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content />
    </Suspense>
  );
}

function StatusRow({ label, ok, okText, failText, detail }: { label: string; ok: boolean; okText: string; failText: string; detail?: string }) {
  return (
    <tr>
      <th scope="row" className="bg-surface! text-base! font-semibold! text-ink!">
        {label}
      </th>
      <td>
        <Badge tone={ok ? "success" : "danger"} icon={ok ? "check-circle" : "alert"}>
          {ok ? okText : failText}
        </Badge>
      </td>
      <td className="text-sm text-ink-2">{detail ?? "–"}</td>
    </tr>
  );
}

async function Content() {
  await requireStaff([...OPS_ROLES]);
  const [flags, outbox, problems, delivery, status] = await Promise.all([
    listFlags(),
    outboxSummary(),
    outboxProblems(),
    deliveryProblems(),
    systemStatus(),
  ]);
  const now = new Date();
  const queueAgeMs = outbox.queueAgeMs;
  const disabled = flags.filter((f) => !f.restriction && !f.enabled);
  const deadTypes = outbox.types.filter((t) => t.dead > 0);

  return (
    <div>
      <PageHeader
        eyebrow="Betrieb"
        title="Betrieb und Konfiguration"
        description="Feature-Schalter, Warteschlangen, Zustellprobleme und technische Statusanzeigen. Keine Inhalte, keine Personendaten."
      />
      <div className="flex flex-col gap-10">
        <OpsSubNav active="betrieb" />
        {status.alarms.length > 0 && (
          <Notice tone="danger" title="Aktive Betriebsalarme">
            {status.alarms.map((a) => `${ALARM_LABEL[a.code] ?? a.code} (${a.value})`).join(" · ")}. Vorgehen siehe docs/RUNBOOKS.md.
          </Notice>
        )}
        {disabled.length > 0 && (
          <Notice tone="warning" title="Teilbetrieb aktiv">
            Abgeschaltet: {disabled.map((f) => FLAG_LABEL[f.key] ?? f.description).join(", ")}. Mitglieder sehen einen Hinweis; öffentliche
            Hilfe und Sicherheitsseiten bleiben erreichbar.
          </Notice>
        )}

        <section aria-labelledby="kennzahlen" className="flex flex-col gap-4">
          <h2 id="kennzahlen" className="sr-only">
            Kennzahlen
          </h2>
          <StatGrid>
            <StatTile
              label="Wartende Ereignisse"
              value={outbox.totals.pending}
              icon="hourglass"
              hint={outbox.oldestOpen ? `Queuealter ${formatSpan(queueAgeMs)}` : "Warteschlange leer"}
              tone={queueAgeMs > 15 * 60 * 1000 ? "warning" : "neutral"}
            />
            <StatTile label="Fehlgeschlagen (Wiederholung)" value={outbox.totals.failed} icon="undo" tone={outbox.totals.failed > 0 ? "warning" : "neutral"} />
            <StatTile label="Fehlerwarteschlange" value={outbox.totals.dead} icon="alert" tone={outbox.totals.dead > 0 ? "danger" : "neutral"} hint="Ausgeschöpfte Versuche" />
            <StatTile
              label="Zustellprobleme"
              value={delivery.failed + delivery.dead}
              icon="mail"
              tone={delivery.dead > 0 ? "danger" : delivery.failed > 0 ? "warning" : "neutral"}
              hint={`${delivery.pending} Zustellungen wartend`}
            />
          </StatGrid>
        </section>

        <AdminSectionBlock id="status" title="Technischer Status" description="NFR16: Erreichbarkeit, Konfiguration und Arbeiteraktivität.">
          <Table>
            <caption className="sr-only">Technische Statusanzeigen</caption>
            <thead>
              <tr>
                <th scope="col">Komponente</th>
                <th scope="col">Status</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              <StatusRow label="Datenbank" ok={status.dbOk} okText="Erreichbar" failText="Nicht erreichbar" detail={`Antwortzeit ${status.dbLatencyMs} ms`} />
              <StatusRow
                label="Objektablage"
                ok={status.storageOk}
                okText="Erreichbar"
                failText={status.storageConfigured ? "Nicht erreichbar" : "Nicht konfiguriert"}
                detail={status.storageConfigured ? "Bucket konfiguriert" : "BUCKET, ENDPOINT, ACCESS_KEY_ID fehlen"}
              />
              <StatusRow
                label="E-Mail-Versand (SMTP)"
                ok={status.smtpConfigured}
                okText="Konfiguriert"
                failText="Nicht konfiguriert"
                detail={status.smtpConfigured ? undefined : "SMTP_HOST fehlt – E-Mails werden nicht zugestellt"}
              />
              <StatusRow
                label="Hintergrundarbeiter"
                ok={
                  Boolean(status.lastWorkerActivity) &&
                  now.getTime() - (status.lastWorkerActivity?.getTime() ?? 0) < (status.workerHeartbeat ? WORKER_STALE_MS : 60 * 60 * 1000)
                }
                okText="Aktiv"
                failText={status.lastWorkerActivity ? "Länger inaktiv" : "Keine Aktivität"}
                detail={
                  status.lastWorkerActivity
                    ? `Letztes Lebenszeichen vor ${formatSpan(now.getTime() - status.lastWorkerActivity.getTime())}${status.workerHeartbeat ? "" : " (Näherung aus der Outbox)"}`
                    : "Noch keine verarbeiteten Ereignisse"
                }
              />
            </tbody>
          </Table>
          <p className="text-sm text-ink-2">
            Fehlerquote, Latenz und Backup-Status werden in der Railway-Überwachung gemessen (Alarm bei über 2 % 5xx während 5 Minuten oder
            veraltetem Backup). Der externe Prüfer fragt zusätzlich <span className="font-mono">/api/v1/health/worker</span> ab. Verweigerte Zugriffe in den letzten 24 Stunden: <span className="tabular font-semibold">{status.deniedLast24h}</span>.
          </p>
        </AdminSectionBlock>

        <AdminSectionBlock
          id="schalter"
          title="Feature-Schalter"
          description="Einzeln abschaltbar (HOM08). Die Sperre gilt serverseitig sofort, bestehende Daten bleiben erhalten, keine Aktion wird nur scheinbar angenommen."
        >
          <ul className="grid gap-3 lg:grid-cols-2">
            {flags.map((f) => (
              <li key={f.key}>
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-lg font-[650] text-ink">{FLAG_LABEL[f.key] ?? f.key}</h3>
                      <p className="text-sm text-ink-2">{f.description}</p>
                    </div>
                    {f.restriction ? (
                      <Badge tone={f.enabled ? "info" : "outline"} icon={f.enabled ? "check-circle" : undefined}>
                        {f.enabled ? "Eingeschaltet" : "Ausgeschaltet"}
                      </Badge>
                    ) : (
                      <Badge tone={f.enabled ? "success" : "warning"} icon={f.enabled ? "check-circle" : "ban"}>
                        {f.enabled ? "Aktiv" : "Abgeschaltet"}
                      </Badge>
                    )}
                  </div>
                  {f.updatedAt && f.updatedBy && (
                    <p className="text-sm text-ink-2">
                      Zuletzt geändert <DateTime date={f.updatedAt} /> von {f.updatedBy}
                      {f.reason && <> · Anlass: {f.reason}</>}
                    </p>
                  )}
                  <FlagForm flagKey={f.key} enabled={f.enabled} version={f.version} label={FLAG_LABEL[f.key] ?? f.key} restriction={f.restriction} />
                </Card>
              </li>
            ))}
          </ul>
        </AdminSectionBlock>

        <AdminSectionBlock id="outbox" title="Outbox je Ereignistyp" description="Ältestes offenes Ereignis = Queuealter. Payloads enthalten nur IDs.">
          {outbox.types.length === 0 ? (
            <EmptyState icon="check-circle" title="Keine offenen oder fehlerhaften Ereignisse" />
          ) : (
            <Table>
              <caption className="sr-only">Outbox-Status je Typ</caption>
              <thead>
                <tr>
                  <th scope="col">Typ</th>
                  <th scope="col">Wartend</th>
                  <th scope="col">In Arbeit</th>
                  <th scope="col">Fehlgeschlagen</th>
                  <th scope="col">Fehlerwarteschlange</th>
                  <th scope="col">Queuealter</th>
                  <th scope="col">
                    <span className="sr-only">Aktion</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {outbox.types.map((t) => (
                  <tr key={t.type}>
                    <td className="font-mono text-sm">{t.type}</td>
                    <td className="tabular">{t.pending}</td>
                    <td className="tabular">{t.processing}</td>
                    <td className="tabular">{t.failed}</td>
                    <td className="tabular">{t.dead > 0 ? <span className="font-semibold text-danger">{t.dead}</span> : 0}</td>
                    <td className="text-sm">{t.oldest ? formatSpan(now.getTime() - t.oldest.getTime()) : "–"}</td>
                    <td>
                      {t.dead > 0 && (
                        <ActionButton
                          action={requeueOutboxAction}
                          fields={{ type: t.type }}
                          label="Alle erneut einreihen"
                          confirm={{
                            title: `${t.dead} Ereignisse erneut einreihen?`,
                            body: "Die Handler prüfen Rechte und aktuellen Status vor jeder Ausführung erneut. Die Ursache sollte vorher behoben sein.",
                            confirmLabel: "Erneut einreihen",
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {deadTypes.length > 0 && (
            <p className="text-sm text-ink-2">NFR19: Ereignisse mit ausgeschöpften Versuchen werden nicht automatisch wiederholt.</p>
          )}
        </AdminSectionBlock>

        <AdminSectionBlock id="fehler" title="Fehlgeschlagene Ereignisse" description="Nur Metadaten: Typ, Status, Versuche, Fehlercode.">
          {problems.length === 0 ? (
            <EmptyState icon="check-circle" title="Keine fehlgeschlagenen Ereignisse" />
          ) : (
            <Table>
              <caption className="sr-only">Fehlgeschlagene Outbox-Ereignisse</caption>
              <thead>
                <tr>
                  <th scope="col">Typ</th>
                  <th scope="col">Status</th>
                  <th scope="col">Versuche</th>
                  <th scope="col">Fehlercode</th>
                  <th scope="col">Erstellt</th>
                  <th scope="col">
                    <span className="sr-only">Aktion</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-sm">{p.type}</td>
                    <td>
                      <Badge tone={p.status === "dead" ? "danger" : "warning"}>{p.status === "dead" ? "Fehlerwarteschlange" : "Wird wiederholt"}</Badge>
                    </td>
                    <td className="tabular">{p.attempts}</td>
                    <td className="font-mono text-sm">{p.lastError ?? "–"}</td>
                    <td className="text-sm">
                      <DateTime date={p.createdAt} />
                    </td>
                    <td>
                      {p.status === "dead" && <ActionButton action={requeueOutboxAction} fields={{ eventId: p.id }} label="Erneut einreihen" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AdminSectionBlock>

        <AdminSectionBlock id="zustellung" title="Zustellaufträge mit Problemen" description="MSG08: Kanal, Status, Versuche und Fehlercode – ohne Empfänger oder Inhalte.">
          {delivery.rows.length === 0 ? (
            <EmptyState icon="check-circle" title="Keine fehlgeschlagenen Zustellungen" />
          ) : (
            <Table>
              <caption className="sr-only">Fehlgeschlagene Zustellaufträge</caption>
              <thead>
                <tr>
                  <th scope="col">Kanal</th>
                  <th scope="col">Status</th>
                  <th scope="col">Versuche</th>
                  <th scope="col">Fehlercode</th>
                  <th scope="col">Zuletzt</th>
                  <th scope="col">
                    <span className="sr-only">Aktion</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {delivery.rows.map((d) => (
                  <tr key={d.id}>
                    <td>{d.channel === "email" ? "E-Mail" : d.channel}</td>
                    <td>
                      <Badge tone={d.status === "dead" ? "danger" : "warning"}>{d.status === "dead" ? "Aufgegeben" : "Fehlgeschlagen"}</Badge>
                    </td>
                    <td className="tabular">{d.attempts}</td>
                    <td className="font-mono text-sm">{d.lastErrorCode ?? "–"}</td>
                    <td className="text-sm">
                      <DateTime date={d.updatedAt} />
                    </td>
                    <td>
                      <ActionButton action={requeueDeliveryAction} fields={{ jobId: d.id }} label="Erneut versuchen" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AdminSectionBlock>

        <AdminSectionBlock
          id="vorfall"
          title="Sicherheitsvorfall"
          description="Technische Bereitschaft ersetzt keine psychosoziale Beratung. Schritte mit Ticket und Zeitpunkt protokollieren."
        >
          <ol className="grid gap-3 md:grid-cols-2">
            {INCIDENT_STEPS.map((s) => (
              <li key={s.value} className="rounded-[16px] border border-line bg-surface p-4">
                <p className="font-semibold text-ink">{s.label}</p>
                <p className="text-sm text-ink-2">{s.description}</p>
              </li>
            ))}
          </ol>
          <Card>
            <IncidentStepForm />
          </Card>
          <p className="text-sm text-ink-2">
            Rollen und Sitzungen von Mitarbeitenden entzieht die Administration unter «Rollen und Audit» (Austritt). Für einen begründeten Zugriff auf Produktionsdaten:{" "}
            <Link href="/verwaltung/audit/sonderzugriff" className="font-semibold text-ink underline underline-offset-4">
              Sonderzugriff beantragen
            </Link>
            .
          </p>
        </AdminSectionBlock>
      </div>
    </div>
  );
}
