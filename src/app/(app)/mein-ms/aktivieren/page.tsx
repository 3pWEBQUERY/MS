import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HealthDecisionForms } from "@/components/health/action-forms";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { stepTitle, two } from "@/components/health/notebook";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { HEALTH_CONSENT_VERSION } from "@/lib/catalog";
import { requireViewer } from "@/server/auth/viewer";
import { decideHealthAction } from "@/server/modules/health/activation-actions";
import { healthReturnPath } from "@/server/modules/health/validation";

export const metadata: Metadata = { title: "Gesundheitsbereich aktivieren" };

/** S08 Gesundheitsbereich aktivieren (PRI01, US10, AT01): gesonderte, freiwillige Entscheidung. */
export default function ActivatePage({ searchParams }: PageProps<"/mein-ms/aktivieren">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Activate searchParams={searchParams} />
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

async function Activate({ searchParams }: { searchParams: PageProps<"/mein-ms/aktivieren">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const next = healthReturnPath(typeof sp.weiter === "string" ? sp.weiter : null);

  if (viewer.healthActive)
    return (
      <div className="flex max-w-2xl flex-col gap-8">
        <PageHeader eyebrow="Mein MS" title="Gesundheitsbereich ist aktiv" />
        <Notice tone="success" title="Du hast den Gesundheitsbereich bereits aktiviert">
          Widerrufen kannst du die Einwilligung unter <Link href="/konto/privatsphaere">Privatsphäre</Link>.
        </Notice>
        <ButtonLink href={next ?? "/mein-ms"} className="w-fit" iconRight={<Icon name="arrow-right" className="size-5" />}>
          {next ? "Weiter" : "Zu Mein MS"}
        </ButtonLink>
      </div>
    );

  const alreadyDeclined = viewer.healthDecided;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Mein MS"
        title="Möchtest du den Gesundheitsbereich nutzen?"
        description="Hier kannst du für dich festhalten, wie es dir geht. Das ist freiwillig – alle anderen Bereiche funktionieren auch ohne."
      />
      {/* Vier Punkte als nummeriertes Raster mit Haarlinien statt Symbolkacheln */}
      <ol className="grid border-t border-ink sm:grid-cols-2 sm:gap-x-10">
        {POINTS.map((p, i) => (
          <li key={p.title} className="flex flex-col gap-2 border-b border-line py-6">
            <span className="flex items-center gap-3 font-mono text-sm font-medium text-accent-ink">
              <span aria-hidden="true">{two(i)}</span>
              <Icon name={p.icon} className="size-4" />
            </span>
            <h2 className={stepTitle}>{p.title}</h2>
            <p className="text-base text-ink-2">{p.text}</p>
          </li>
        ))}
      </ol>
      <p className="text-base text-ink-2">
        Wenn du ablehnst, bleiben Community, Gespräche, Wissen und Hilfe vollständig nutzbar. Mehr dazu in der{" "}
        <Link href="/datenschutz" className="link-quiet font-medium text-ink">
          Datenschutzinformation
        </Link>
        .
      </p>
      {alreadyDeclined && (
        <Notice tone="neutral">Du hast den Gesundheitsbereich bisher nicht aktiviert. Du kannst das hier jederzeit ändern.</Notice>
      )}
      <HealthDecisionForms action={decideHealthAction} alreadyDeclined={alreadyDeclined} next={next} />
      <p className="font-display font-semibold text-xs uppercase tracking-[0.1em] text-ink-2">Textfassung: {HEALTH_CONSENT_VERSION}</p>
    </div>
  );
}
