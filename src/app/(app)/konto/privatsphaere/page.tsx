import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SettingsHeader, SettingsSection, SettingsSections } from "@/components/account/settings-layout";
import { WhoSeesWhat } from "@/components/account/who-sees-what";
import { Icon } from "@/components/ui/icon";
import { Badge, PageSkeleton, type Tone } from "@/components/ui/primitives";
import { formatDate, formatDateTime } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { getConsentOverview, healthWithdrawnAt, type ConsentEntry, type ConsentPurpose } from "@/server/modules/account/consents";
import { healthScope } from "@/server/modules/privacy/erasure";
import { healthDeleteBy } from "@/server/modules/privacy/retention-rules";
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
    <details className="group -mt-1" data-optional>
      <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-2 font-mono text-[0.8125rem] uppercase tracking-[0.12em] text-ink-2 hover:text-ink">
        Verlauf ({entry.history.length})
      </summary>
      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {entry.history.map((h, i) => (
          <li key={i} className="grid gap-1 py-3 text-sm sm:grid-cols-[10rem_1fr]">
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
  const deleteBy = withdrawnAt ? healthDeleteBy(withdrawnAt) : null;

  return (
    <div className="flex flex-col gap-10">
      <SettingsHeader
        current="privatsphaere"
        title="Privatsphäre und Einwilligungen"
        description="Jede Entscheidung ist getrennt, nichts ist vorausgewählt. Du kannst sie jederzeit selbst ändern – ohne Support."
        back={viewer.accountSuspended ? { href: "/konto/gesperrt", label: "Zurück zur Übersicht" } : undefined}
        showNav={!viewer.accountSuspended}
      />

      {/* Die eine tiefe Fläche dieser Seite: wer was sieht (PRI01) */}
      <section aria-labelledby="who-title" className="rounded-[28px] bg-deep p-6 text-on-deep sm:p-10">
        <div className="mb-8 flex flex-col gap-3">
          <span aria-hidden="true" className="font-mono text-[0.8125rem] font-medium tracking-[0.12em] text-deep-accent">
            01
          </span>
          <h2 id="who-title" className="display-md !text-on-deep">
            Wer sieht was
          </h2>
        </div>
        <WhoSeesWhat tone="deep" />
      </section>

      <SettingsSections>
        <SettingsSection
          id="consents-title"
          index="02"
          title="Zwecke und Entscheidungen"
          description="Mit Textfassung, Zeitpunkt und Kanal jeder Entscheidung."
          wide
        >
          <ul className="flex flex-col border-t border-ink">
            {entries.map((entry) => {
              const meta = PURPOSE[entry.purpose];
              return (
                <li key={entry.purpose} className="flex flex-col gap-4 border-b border-line py-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <h3 className="font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-ink">{meta.title}</h3>
                    <span className="shrink-0">
                      <Status entry={entry} />
                    </span>
                  </div>
                  <p className="max-w-2xl text-base text-ink-2">{meta.text}</p>
                  {entry.latest && (
                    <p className="text-sm text-ink-2">
                      Zuletzt am {formatDateTime(entry.latest.decidedAt, tz)} · Fassung{" "}
                      <span className="font-mono">{entry.latest.textVersion}</span> · {CHANNEL[entry.latest.channel] ?? entry.latest.channel}
                      {entry.latest.textVersion !== entry.currentVersion && " · Es gibt eine neuere Fassung."}
                    </p>
                  )}
                  {entry.purpose === "health_area" && (
                    <div className="flex max-w-2xl flex-col gap-4">
                      {withdrawnAt && hasHealthData && deleteBy && (
                        <p className="border-l-2 border-accent pl-4 text-base text-ink">
                          Deine bisherigen Gesundheitsdaten werden spätestens am {formatDate(deleteBy, tz)} gelöscht, wenn du
                          den Bereich bis dahin nicht wieder aktivierst. Bis dahin kannst du sie{" "}
                          <Link href="/konto/daten" className="link-quiet font-medium">
                            exportieren oder selbst löschen
                          </Link>
                          .
                        </p>
                      )}
                      <HealthConsentForm active={viewer.healthActive} />
                    </div>
                  )}
                  {entry.purpose === "analytics" && <AnalyticsConsentForm active={entry.latest?.decision === "granted"} />}
                  {meta.link && (
                    <Link href={meta.link.href} className="group link-quiet inline-flex w-fit items-center gap-1.5 font-semibold text-ink">
                      {meta.link.label}
                      <Icon name="arrow-right" className="nudge size-4" />
                    </Link>
                  )}
                  <History entry={entry} tz={tz} />
                </li>
              );
            })}
          </ul>
        </SettingsSection>

        <SettingsSection id="rights-title" index="03" title="Deine Rechte">
          <p className="text-base text-ink-2">
            Auskunft, Export und Löschung findest du unter{" "}
            <Link href="/konto/daten" className="link-quiet font-medium text-ink">
              Daten und Konto
            </Link>
            . Diese Rechte bleiben auch bei einer Einschränkung deines Kontos verfügbar.
          </p>
        </SettingsSection>
      </SettingsSections>
    </div>
  );
}
