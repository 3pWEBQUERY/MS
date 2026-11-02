import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { logoutAction } from "@/server/modules/account/auth-actions";

export const metadata: Metadata = { title: "Konto eingeschränkt", robots: { index: false } };

/**
 * Ansicht bei Kontosperre (ACC08, PRD 03): Community-Sanktionen entziehen keine
 * Datenschutzrechte – Auskunft, Export, Löschung und Einspruch bleiben erreichbar.
 */
export default function SuspendedPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Suspended />
    </Suspense>
  );
}

const LINKS: { href: string; title: string; text: string; icon: IconName }[] = [
  { href: "/meldungen", title: "Entscheid ansehen und Einspruch erheben", text: "Begründung, Dauer und dein Weg zur unabhängigen Prüfung.", icon: "scale" },
  { href: "/konto/daten", title: "Daten und Konto", text: "Auskunft anfordern, Daten exportieren oder löschen.", icon: "download" },
  { href: "/konto/privatsphaere", title: "Privatsphäre und Einwilligungen", text: "Einwilligungen ansehen und widerrufen.", icon: "shield" },
  { href: "/sicherheit", title: "Akute Hilfe und Sicherheit", text: "Notfallnummern und Beratungsstellen – ohne Anmeldung.", icon: "lifebuoy" },
];

async function Suspended() {
  const viewer = await requireViewer({ allowSuspended: true, allowNoProfile: true });
  if (!viewer.accountSuspended) redirect("/heute");
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader
        eyebrow="Konto"
        title="Dein Konto ist vorübergehend eingeschränkt"
        description="Community, Gespräche und Gruppen sind im Moment nicht verfügbar. Deine Rechte an deinen Daten bleiben vollständig erhalten."
        className="pb-0 sm:pb-0"
      />
      <Notice tone="neutral" icon="info">
        Die Einschränkung wurde von der Moderation ausgesprochen. Unter «Meine Meldungen» findest du die Begründung und kannst
        Einspruch erheben. Eine andere Person prüft ihn.
      </Notice>
      <ul className="flex flex-col gap-3">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-start gap-4 rounded-[20px] border border-line bg-surface p-5 transition-colors hover:border-line-2 hover:bg-raised"
            >
              <Icon name={l.icon} className="mt-0.5 size-6 shrink-0 text-ink" />
              <span className="flex flex-col gap-1">
                <span className="font-semibold text-ink">{l.title}</span>
                <span className="text-sm text-ink-2">{l.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <form action={logoutAction}>
        <Button type="submit" variant="secondary" icon={<Icon name="logout" className="size-5" />}>
          Abmelden
        </Button>
      </form>
    </div>
  );
}
