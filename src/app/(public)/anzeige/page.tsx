import type { Metadata } from "next";
import { DisplaySettings } from "@/components/account/display-settings";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Anzeige und Bedienung",
  description: "Schriftgrösse, Farbschema, Bewegung und einfache Ansicht – ohne Konto, direkt auf diesem Gerät.",
};

/** S13 für Gäste (HOM06): nur lokal auf dem Gerät, kein Konto nötig. */
export default function GuestDisplayPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        eyebrow="Für alle"
        title="Anzeige und Bedienung"
        description="Passe Schrift, Farbschema und Bewegung an. Die Änderungen gelten sofort und bleiben auf diesem Gerät gespeichert."
        className="pb-0 sm:pb-0"
      />
      <DisplaySettings mode="guest" />
    </div>
  );
}
