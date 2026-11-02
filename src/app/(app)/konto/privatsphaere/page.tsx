import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav } from "@/components/account/account-nav";
import { WhoSeesWhat } from "@/components/account/who-sees-what";
import { Badge, Card, PageHeader, PageSkeleton, SectionHeader, type Tone } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { getConsentOverview, healthWithdrawnAt, type ConsentEntry, type ConsentPurpose } from "@/server/modules/account/consents";
import { healthScope } from "@/server/modules/privacy/erasure";
import { AnalyticsConsentForm, HealthConsentForm } from "./consent-forms";

export const metadata: Metadata = { title: "Privatsphäre und Einwilligungen", robots: { index: false } };

/** S12 Privatsphäre und Einwilligungen (PRI01, PRI02, F07). Auch bei Kontosperre erreichbar. */
export default function PrivacyPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Privacy />
    </Suspense>
  );
}

const PURPOSE: Record<ConsentPurpose, { title: string; text: string; link?: { href: string; label: string } }> = {
  health_area: {
    title: "Gesundheitsbereich (Check-ins und Tagebuch)",
    text: "Eigene, ausdrückliche Entscheidung. Ohne Aktivierung bleiben Community, Gespräche, Wissen und Hilfe vollständig nutzbar.",
  },
  analytics: {
    title: "Anonyme Nutzungsstatistik",
    text: "Optional und standardmässig aus. Gezählt wird nur, welche Bereiche genutzt werden – ohne Inhalte, Pseudonyme, Suchtexte oder Gesundheitswerte und ohne Tracker von Dritten.",
  },
  terms: {
    title: "Nutzungsbedingungen",
    text: "Grundlage für dein Mitgliederkonto. Sie ersetzen keine Einwilligung. Beenden kannst du sie, indem du dein Konto löschst.",
    link: { href: "/bedingungen", label: "Nutzungsbedingungen lesen" },
  },
  privacy_notice: {
    title: "Datenschutzinformation",
    text: "Zur Kenntnis genommen bei der Registrierung: wer verantwortlich ist, wofür Daten genutzt werden, wie lange und welche Rechte du hast.",
    link: { href: "/datenschutz", label: "Datenschutzinformation lesen" },
  },
  community_rules: {
    title: "Community-Regeln",
    text: "Werden vor dem ersten Beitrag oder der ersten Gruppe bestätigt.",
    link: { href: "/regeln", label: "Regeln lesen" },
  },
};

const DECISION: Record<string, { label: string; tone: Tone }> = {
  granted: { label: "Zugestimmt", tone: "success" },
  denied: { label: "Abgelehnt", tone: "neutral" },
  withdrawn: { label: "Widerrufen", tone: "neutral" },
};

const CHANNEL: Record<string, string> = { web: "Website", app: "App", support: "Datenschutzstelle" };

function Status({ entry }: { entry: ConsentEntry }) {
  if (!entry.latest) {
    const label = entry.purpose === "analytics" ? "Aus (nicht erteilt)" : entry.purpose === "health_area" ? "Nicht aktiviert" : "Noch nicht bestätigt";
    return <Badge tone="outline">{label}</Badge>;
  }
  const d = DECISION[entry.latest.decision];
  const label =
    entry.purpose === "health_area"
      ? { granted: "Aktiviert", denied: "Nicht aktiviert", withdrawn: "Widerrufen" }[entry.latest.decision]
      : entry.purpose === "analytics"
        ? { granted: "Ein", denied: "Aus", withdrawn: "Aus (widerrufen)" }[entry.latest.decision]
        : d.label;
  return (
    <Badge tone={d.tone} icon={entry.latest.decision === "granted" ? "check" : undefined}>
      {label}
    </Badge>
  );
}

function History({ entry, tz }: { entry: ConsentEntry; tz: string }) {
  if (entry.history.length === 0) return null;
  return (
    <details className="group rounded-[12px] border border-line" data-optional>
      <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-ink-2 hover:text-ink">
        Verlauf ({entry.history.length})
      </summary>
      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {entry.history.map((h, i) => (
          <li key={i} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[10rem_1fr]">
            <span className="font-semibold text-ink">{DECISION[h.decision].label}</span>
            <span className="text-ink-2">
              {formatDateTime(h.decidedAt, tz)} · Fassung <span className="font-mono">{h.textVersion}</span> · {CHANNEL[h.channel] ?? h.channel}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

async function Privacy() {
  const viewer = await requireViewer({ allowSuspended: true });
  const tz = viewer.prefs.timezone;
  const entries = await getConsentOverview(viewer.accountId);
  const withdrawnAt = healthWithdrawnAt(entries);
  const scope = withdrawnAt ? await healthScope(viewer.accountId) : null;
  const hasHealthData = scope ? scope.checkIns + scope.entries + scope.definitions > 0 : false;
  const deleteBy = withdrawnAt ? new Date(withdrawnAt.getTime() + 30 * 864e5) : null;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Einstellungen"
          title="Privatsphäre und Einwilligungen"
          description="Jede Entscheidung ist getrennt, nichts ist vorausgewählt. Du kannst sie jederzeit selbst ändern – ohne Support."
          className="pb-0 sm:pb-0"
          back={viewer.accountSuspended ? { href: "/konto/gesperrt", label: "Zurück zur Übersicht" } : undefined}
        />
        {!viewer.accountSuspended && <AccountNav current="privatsphaere" />}
      </div>

      <section aria-labelledby="who-title" className="flex flex-col gap-4">
        <SectionHeader id="who-title" title="Wer sieht was" className="mb-0" />
        <WhoSeesWhat />
      </section>

      <section aria-labelledby="consents-title" className="flex flex-col gap-4">
        <SectionHeader
          id="consents-title"
          title="Zwecke und Entscheidungen"
          description="Mit Textfassung, Zeitpunkt und Kanal jeder Entscheidung."
          className="mb-0"
        />
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => {
            const meta = PURPOSE[entry.purpose];
            return (
              <li key={entry.purpose}>
                <Card className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-[650] text-ink">{meta.title}</h3>
                    <Status entry={entry} />
                  </div>
                  <p className="text-base text-ink-2">{meta.text}</p>
                  {entry.latest && (
                    <p className="text-sm text-ink-2">
                      Zuletzt am {formatDateTime(entry.latest.decidedAt, tz)} · Fassung{" "}
                      <span className="font-mono">{entry.latest.textVersion}</span> · {CHANNEL[entry.latest.channel] ?? entry.latest.channel}
                      {entry.latest.textVersion !== entry.currentVersion && " · Es gibt eine neuere Fassung."}
                    </p>
                  )}
                  {entry.purpose === "health_area" && (
                    <>
                      {withdrawnAt && hasHealthData && deleteBy && (
                        <p className="rounded-[12px] bg-sunk px-4 py-3 text-base text-ink">
                          Deine bisherigen Gesundheitsdaten werden spätestens am {formatDate(deleteBy, tz)} gelöscht, wenn du
                          den Bereich bis dahin nicht wieder aktivierst. Bis dahin kannst du sie{" "}
                          <Link href="/konto/daten" className="font-medium underline underline-offset-4">
                            exportieren oder selbst löschen
                          </Link>
                          .
                        </p>
                      )}
                      <HealthConsentForm active={viewer.healthActive} />
                    </>
                  )}
                  {entry.purpose === "analytics" && <AnalyticsConsentForm active={entry.latest?.decision === "granted"} />}
                  {meta.link && (
                    <Link href={meta.link.href} className="w-fit text-base font-medium text-ink underline underline-offset-4">
                      {meta.link.label}
                    </Link>
                  )}
                  <History entry={entry} tz={tz} />
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="rights-title" className="flex flex-col gap-3">
        <SectionHeader id="rights-title" title="Deine Rechte" className="mb-0" />
        <p className="max-w-2xl text-base text-ink-2">
          Auskunft, Export und Löschung findest du unter{" "}
          <Link href="/konto/daten" className="font-medium text-ink underline underline-offset-4">
            Daten und Konto
          </Link>
          . Diese Rechte bleiben auch bei einer Einschränkung deines Kontos verfügbar.
        </p>
      </section>
    </div>
  );
}
