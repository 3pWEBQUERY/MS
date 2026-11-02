import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Sitzung beendet", robots: { index: false } };

/** S61 Sitzung abgelaufen: erneute Anmeldung, keine Speicherung privater Entwürfe. */
export default function SessionExpiredPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-6 px-4 py-20 sm:py-28">
      <span className="flex size-14 items-center justify-center rounded-[14px] bg-sunk">
        <Icon name="clock" className="size-7" />
      </span>
      <h1 className="text-4xl font-[650] tracking-[-0.03em]">Deine Sitzung wurde beendet.</h1>
      <p className="text-lg text-ink-2">
        Zu deinem Schutz melden wir dich nach 60 Minuten ohne Aktivität ab. Nicht gespeicherte Eingaben wurden verworfen und
        nicht auf diesem Gerät gespeichert.
      </p>
      <ButtonLink href="/anmelden" size="lg">
        Erneut anmelden
      </ButtonLink>
    </div>
  );
}
