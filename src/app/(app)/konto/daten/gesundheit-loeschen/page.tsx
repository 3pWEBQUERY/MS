import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import { hasRecentAuth, requireViewer } from "@/server/auth/viewer";
import { healthScope } from "@/server/modules/privacy/erasure";
import { getOwnRequestByReceipt } from "@/server/modules/privacy/requests";
import { EraseHealthForm } from "./erase-health-form";

export const metadata: Metadata = { title: "Gesundheitsdaten löschen", robots: { index: false } };

/** PRI04 (S15 → S16): Umfang, ausdrückliche Bestätigung, sichtbares Ergebnis. Community-Konto bleibt. */
export default function EraseHealthPage({ searchParams }: PageProps<"/konto/daten/gesundheit-loeschen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <EraseHealth searchParams={searchParams} />
    </Suspense>
  );
}

async function EraseHealth({ searchParams }: { searchParams: PageProps<"/konto/daten/gesundheit-loeschen">["searchParams"] }) {
  const viewer = await requireViewer({ allowSuspended: true });
  const sp = await searchParams;
  const tz = viewer.prefs.timezone;
  const back = { href: "/konto/daten", label: "Daten und Konto" };

  if (typeof sp.beleg === "string") {
    const req = await getOwnRequestByReceipt(viewer.accountId, sp.beleg);
    if (req && req.type === "erasure_health") {
      return (
        <div className="flex max-w-2xl flex-col gap-8">
          <PageHeader back={back} eyebrow="Erledigt" title="Deine Gesundheitsdaten sind gelöscht" className="pb-0 sm:pb-0" />
          <Notice tone="success" role="status" title="Sofort nicht mehr nutzbar">
            Check-ins, Tagebucheinträge, Symptome, Notizen und eigene Bezeichnungen wurden am {formatDateTime(req.createdAt, tz)}{" "}
            entfernt. Zugehörige Exportdateien werden gerade aus der Ablage gelöscht.
          </Notice>
          <Card tone="sunk" className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-ink-2">Beleg</p>
            <p className="tabular font-mono text-xl font-semibold text-ink">{req.receiptNumber}</p>
          </Card>
          <ul className="flex flex-col gap-2 text-base text-ink-2">
            <li>Dein Community-Konto, deine Beiträge und Gespräche bleiben unverändert.</li>
            <li>
              Der Gesundheitsbereich bleibt {viewer.healthActive ? "aktiviert – du kannst neu beginnen oder ihn unter " : "wie bisher eingestellt – siehe "}
              <Link href="/konto/privatsphaere" className="font-medium text-ink underline underline-offset-4">
                Privatsphäre
              </Link>
              {viewer.healthActive ? " widerrufen." : "."}
            </li>
            <li>Letzte Sicherungskopien werden spätestens nach 65 Tagen überschrieben und nicht produktiv genutzt.</li>
          </ul>
          <ButtonLink href="/konto/daten" variant="secondary" className="w-fit">
            Zurück zu Daten und Konto
          </ButtonLink>
        </div>
      );
    }
  }

  const scope = await healthScope(viewer.accountId);
  const total = scope.checkIns + scope.entries + scope.definitions + scope.exports;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        back={back}
        eyebrow="Daten und Konto"
        title="Gesundheitsdaten löschen"
        description="Entfernt deinen gesamten Gesundheitsbereich. Dein Community-Konto bleibt bestehen."
        className="pb-0 sm:pb-0"
      />
      {total === 0 ? (
        <EmptyState icon="notebook" title="Es sind keine Gesundheitsdaten gespeichert">
          Du hast keine Check-ins, Tagebucheinträge oder eigenen Symptombezeichnungen. Es gibt nichts zu löschen.
        </EmptyState>
      ) : (
        <>
          <Card className="flex flex-col gap-4">
            <p className="font-semibold text-ink">Diese Daten werden endgültig gelöscht</p>
            <ul className="flex flex-col divide-y divide-line">
              {[
                ["Check-ins (Energie, Stimmung, Fatigue, Notizen)", scope.checkIns],
                ["Tagebucheinträge mit Notizen und Schlafbeobachtungen", scope.entries],
                ["Symptomangaben in diesen Einträgen", scope.observations],
                ["Eigene Symptombezeichnungen", scope.definitions],
                ["Laufende oder bereitgestellte Exporte", scope.exports],
              ].map(([label, n]) => (
                <li key={label as string} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-base text-ink">{label}</span>
                  <span className="tabular shrink-0 font-semibold text-ink">{n as number}</span>
                </li>
              ))}
            </ul>
          </Card>
          <ul className="flex flex-col gap-2 text-base text-ink-2">
            <li>Die Löschung wirkt sofort und lässt sich nicht rückgängig machen. Es gibt keine verdeckte Wiederherstellung.</li>
            <li>Aus aktiven Systemen ist alles spätestens nach 30 Tagen entfernt, aus Sicherungskopien spätestens nach 65 Tagen.</li>
            <li>Nachrichten und Beiträge – auch von anderen Mitgliedern – werden durch diese Aktion nicht verändert.</li>
            <li>
              Möchtest du die Daten vorher sichern?{" "}
              <Link href="/konto/daten" className="font-medium text-ink underline underline-offset-4">
                Erstelle zuerst einen Export
              </Link>
              .
            </li>
          </ul>
          {hasRecentAuth(viewer) ? (
            <EraseHealthForm />
          ) : (
            <ReauthNotice next="/konto/daten/gesundheit-loeschen">Bevor du löschst, bestätige bitte dein Passwort.</ReauthNotice>
          )}
        </>
      )}
    </div>
  );
}
