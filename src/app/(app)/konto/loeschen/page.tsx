import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { RuledItem, RuledList, SettingsSection, SettingsSections } from "@/components/account/settings-layout";
import { Icon, type IconName } from "@/components/ui/icon";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { hasRecentAuth, requireViewer } from "@/server/auth/viewer";
import { DeleteAccountForm } from "./delete-account-form";

export const metadata: Metadata = { title: "Konto löschen", robots: { index: false } };

/** S16 Löschbestätigung (PRI05, F07, AT09): Folgen und Fristen, erneute Anmeldung, Beleg. */
export default function DeleteAccountPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <DeleteAccount />
    </Suspense>
  );
}

const NOW: { icon: IconName; text: string }[] = [
  { icon: "lock", text: "Dein Konto wird deaktiviert und alle Geräte werden abgemeldet. Eine spätere Anmeldung reaktiviert es nicht." },
  { icon: "users", text: "Kontakte, Gruppenmitgliedschaften und offene Anfragen werden beendet. Du bist nicht mehr auffindbar." },
  { icon: "message", text: "Deine Beiträge, Antworten und Nachrichtentexte verschwinden für alle – auch aus der Ansicht deiner Gesprächspartner." },
  { icon: "bell", text: "Geplante Hinweise und E-Mails an dich werden gestoppt." },
];

const LATER: { icon: IconName; text: string }[] = [
  { icon: "clock", text: "Innerhalb von 30 Tagen wird alles aus den aktiven Systemen gelöscht: Profil, Einstellungen, Gesundheitsdaten, Texte und Exportdateien." },
  { icon: "archive", text: "Sicherungskopien werden rollierend überschrieben – spätestens 65 Tage nach dem Auftrag ist nichts mehr vorhanden." },
  { icon: "check-circle", text: "Nach Abschluss erhältst du einen Beleg an deine bestätigte E-Mail-Adresse, ohne Inhalte." },
];

const KEEP: string[] = [
  "Wo andere auf deine Beiträge geantwortet haben, bleibt ein neutraler Platzhalter ohne Text und ohne Namen, damit ihre Antworten verständlich bleiben.",
  "Nachrichten, die andere dir geschrieben haben, bleiben deren Daten.",
  "Meldungen an die Moderation werden ohne Bezug zu deinem Konto nur so lange aufbewahrt, wie es der Fall erfordert.",
  "Screenshots oder Kopien, die andere angefertigt haben, können wir nicht zurückholen.",
];

async function DeleteAccount() {
  const viewer = await requireViewer({ allowSuspended: true });
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        back={{ href: "/konto/daten", label: "Daten und Konto" }}
        eyebrow="Daten und Konto"
        title="Konto löschen"
        description="Bitte lies die Folgen in Ruhe. Möchtest du nur deine Gesundheitsdaten entfernen, geht das auch ohne Kontolöschung."
        className="!mb-0"
      />

      <SettingsSections>
        <SettingsSection id="now-title" index="01" title="Sofort">
          <RuledList>
            {NOW.map((i) => (
              <RuledItem key={i.text} icon={<Icon name={i.icon} className="size-5" />}>
                {i.text}
              </RuledItem>
            ))}
          </RuledList>
        </SettingsSection>

        <SettingsSection id="later-title" index="02" title="Danach">
          <RuledList>
            {LATER.map((i) => (
              <RuledItem key={i.text} icon={<Icon name={i.icon} className="size-5" />}>
                {i.text}
              </RuledItem>
            ))}
          </RuledList>
        </SettingsSection>

        <SettingsSection id="keep-title" index="03" title="Was bestehen bleibt">
          <RuledList>
            {KEEP.map((t) => (
              <li key={t} className="border-b border-line py-4 text-base text-ink-2">
                {t}
              </li>
            ))}
          </RuledList>
          <p className="text-base text-ink-2">
            Tipp: Mit einem{" "}
            <Link href="/konto/daten" className="link-quiet font-medium text-ink">
              Export
            </Link>{" "}
            kannst du deine Daten vorher sichern.
          </p>
        </SettingsSection>

        <div className="grid grid-cols-1 gap-x-12 py-10 sm:py-12 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <span aria-hidden="true" className="hidden font-mono text-[0.8125rem] font-medium tracking-[0.12em] text-danger xl:block">
            04
          </span>
          <div className="max-w-2xl">
            {hasRecentAuth(viewer) ? (
              <DeleteAccountForm />
            ) : (
              <ReauthNotice next="/konto/loeschen">Zur Sicherheit bestätige bitte dein Passwort, bevor du dein Konto löschst.</ReauthNotice>
            )}
          </div>
        </div>
      </SettingsSections>
    </div>
  );
}
