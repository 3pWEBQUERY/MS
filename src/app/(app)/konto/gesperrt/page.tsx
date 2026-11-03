import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IndexList, IndexRow, Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
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

const LINKS: { href: string; title: string; text: string }[] = [
  { href: "/meldungen", title: "Entscheid ansehen und Einspruch erheben", text: "Begründung, Dauer und dein Weg zur unabhängigen Prüfung." },
  { href: "/konto/daten", title: "Daten und Konto", text: "Auskunft anfordern, Daten exportieren oder löschen." },
  { href: "/konto/privatsphaere", title: "Privatsphäre und Einwilligungen", text: "Einwilligungen ansehen und widerrufen." },
  { href: "/sicherheit", title: "Akute Hilfe und Sicherheit", text: "Notfallnummern und Beratungsstellen – ohne Anmeldung." },
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
        className="!mb-0"
      />
      <Notice tone="neutral" icon="info">
        Die Einschränkung wurde von der Moderation ausgesprochen. Unter «Meine Meldungen» findest du die Begründung und kannst
        Einspruch erheben. Eine andere Person prüft ihn.
      </Notice>
      <IndexList>
        {LINKS.map((l, i) => (
          <IndexRow key={l.href} href={l.href} index={String(i + 1).padStart(2, "0")} title={l.title}>
            {l.text}
          </IndexRow>
        ))}
      </IndexList>
      <form action={logoutAction}>
        <Button type="submit" variant="secondary" icon={<Icon name="logout" className="size-5" />}>
          Abmelden
        </Button>
      </form>
    </div>
  );
}
