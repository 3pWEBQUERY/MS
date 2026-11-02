import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HealthDecisionForms } from "@/components/health/action-forms";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { HEALTH_CONSENT_VERSION } from "@/lib/catalog";
import { requireViewer } from "@/server/auth/viewer";
import { decideHealthAction } from "@/server/modules/health/actions";

export const metadata: Metadata = { title: "Gesundheitsbereich aktivieren" };

/** S08 Gesundheitsbereich aktivieren (PRI01, US10, AT01): gesonderte, freiwillige Entscheidung. */
export default function ActivatePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Activate />
    </Suspense>
  );
}

const POINTS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "notebook",
    title: "Was gespeichert wird",
    text: "Nur, was du selbst einträgst: Check-ins zu Energie, Stimmung und Fatigue, Symptome mit Stärke und optionaler Dauer, Notizen. Notizen werden verschlüsselt.",
  },
  {
    icon: "lock",
    title: "Wer es sieht",
    text: "Nur du. Keine Freigabe an Kontakte, Community, Redaktion, Moderation oder Fachpersonen.",
  },
  {
    icon: "ban",
    title: "Keine Auswertung",
    text: "Keine Bewertung, keine Diagnose, keine Prognose, kein Score. Deine Einträge werden nicht für Empfehlungen oder Werbung genutzt.",
  },
  {
    icon: "undo",
    title: "Jederzeit änderbar",
    text: "Du kannst die Einwilligung jederzeit widerrufen. Deine Daten kannst du exportieren oder löschen – auch nach einem Widerruf.",
  },
];

async function Activate() {
  const viewer = await requireViewer();

  if (viewer.healthActive)
    return (
      <div className="flex max-w-2xl flex-col gap-8">
        <PageHeader eyebrow="Mein MS" title="Gesundheitsbereich ist aktiv" />
        <Notice tone="success" title="Du hast den Gesundheitsbereich bereits aktiviert">
          Widerrufen kannst du die Einwilligung unter <Link href="/konto/privatsphaere">Privatsphäre</Link>.
        </Notice>
        <ButtonLink href="/mein-ms" className="w-fit" iconRight={<Icon name="arrow-right" className="size-5" />}>
          Zu Mein MS
        </ButtonLink>
      </div>
    );

  const alreadyDeclined = viewer.healthDecided;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        eyebrow="Mein MS"
        title="Möchtest du den Gesundheitsbereich nutzen?"
        description="Hier kannst du für dich festhalten, wie es dir geht. Das ist freiwillig – alle anderen Bereiche funktionieren auch ohne."
      />
      <Card padded={false}>
        <ul className="divide-y divide-line">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-4 p-5 sm:p-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-sunk text-ink-2">
                <Icon name={p.icon} className="size-5" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-ink">{p.title}</h2>
                <p className="text-base text-ink-2">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-base text-ink-2">
        Wenn du ablehnst, bleiben Community, Gespräche, Wissen und Hilfe vollständig nutzbar. Mehr dazu in der{" "}
        <Link href="/datenschutz" className="font-medium text-ink underline underline-offset-4">
          Datenschutzinformation
        </Link>
        .
      </p>
      {alreadyDeclined && (
        <Notice tone="neutral">Du hast den Gesundheitsbereich bisher nicht aktiviert. Du kannst das hier jederzeit ändern.</Notice>
      )}
      <HealthDecisionForms action={decideHealthAction} alreadyDeclined={alreadyDeclined} />
      <p className="text-sm text-ink-2">Textfassung: {HEALTH_CONSENT_VERSION}</p>
    </div>
  );
}
