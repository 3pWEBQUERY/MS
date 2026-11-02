import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
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
    <div className="flex max-w-2xl flex-col gap-10">
      <PageHeader
        back={{ href: "/konto/daten", label: "Daten und Konto" }}
        eyebrow="Daten und Konto"
        title="Konto löschen"
        description="Bitte lies die Folgen in Ruhe. Möchtest du nur deine Gesundheitsdaten entfernen, geht das auch ohne Kontolöschung."
        className="pb-0 sm:pb-0"
      />

      <section aria-labelledby="now-title" className="flex flex-col gap-4">
        <SectionHeader id="now-title" title="Sofort" className="mb-0" />
        <ul className="flex flex-col gap-3">
          {NOW.map((i) => (
            <li key={i.text} className="flex gap-3 text-base text-ink">
              <Icon name={i.icon} className="mt-1 size-5 shrink-0 text-ink-2" />
              {i.text}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="later-title" className="flex flex-col gap-4">
        <SectionHeader id="later-title" title="Danach" className="mb-0" />
        <ul className="flex flex-col gap-3">
          {LATER.map((i) => (
            <li key={i.text} className="flex gap-3 text-base text-ink">
              <Icon name={i.icon} className="mt-1 size-5 shrink-0 text-ink-2" />
              {i.text}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="keep-title" className="flex flex-col gap-4">
        <SectionHeader id="keep-title" title="Was bestehen bleibt" className="mb-0" />
        <Card tone="sunk">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-base text-ink-2">
            {KEEP.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
        <p className="text-base text-ink-2">
          Tipp: Mit einem{" "}
          <Link href="/konto/daten" className="font-medium text-ink underline underline-offset-4">
            Export
          </Link>{" "}
          kannst du deine Daten vorher sichern.
        </p>
      </section>

      {hasRecentAuth(viewer) ? (
        <DeleteAccountForm />
      ) : (
        <ReauthNotice next="/konto/loeschen">Zur Sicherheit bestätige bitte dein Passwort, bevor du dein Konto löschst.</ReauthNotice>
      )}
    </div>
  );
}
