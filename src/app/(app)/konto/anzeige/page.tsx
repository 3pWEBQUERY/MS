import type { Metadata } from "next";
import { Suspense } from "react";
import { DisplaySettings } from "@/components/account/display-settings";
import { SettingsHeader } from "@/components/account/settings-layout";
import { PageSkeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";

export const metadata: Metadata = { title: "Anzeige und Bedienung", robots: { index: false } };

/** S13 für Mitglieder (HOM06): geräteübergreifend gespeichert, sofortige Vorschau. */
export default function MemberDisplayPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <MemberDisplay />
    </Suspense>
  );
}

async function MemberDisplay() {
  const viewer = await requireViewer({ allowSuspended: true });
  const p = viewer.prefs;
  return (
    <div className="flex flex-col gap-10">
      <SettingsHeader
        current="anzeige"
        title="Anzeige und Bedienung"
        description="Schrift, Farbschema, Bewegung und einfache Ansicht. Jede Änderung siehst du sofort."
        back={viewer.accountSuspended ? { href: "/konto/gesperrt", label: "Zurück zur Übersicht" } : undefined}
        showNav={!viewer.accountSuspended}
      />
      <DisplaySettings mode="member" initial={{ theme: p.theme, textScale: p.textScale, motion: p.motion, simple: p.simpleView }} />
    </div>
  );
}
