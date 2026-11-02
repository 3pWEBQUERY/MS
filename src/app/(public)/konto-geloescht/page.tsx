import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Konto gelöscht", robots: { index: false } };

/** Bestätigung nach S16 (PRI05): Konto deaktiviert, Löschauftrag läuft, Fristen verständlich erklärt. */
export default function AccountDeletedPage({ searchParams }: PageProps<"/konto-geloescht">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-6 px-4 py-20 sm:py-28">
      <span className="flex size-14 items-center justify-center rounded-[14px] bg-sunk">
        <Icon name="check-circle" className="size-7" />
      </span>
      <h1 className="text-4xl font-[650] tracking-[-0.03em]">Dein Konto ist deaktiviert.</h1>
      <p className="text-lg text-ink-2">
        Du bist abgemeldet. Deine Beiträge und Nachrichtentexte sind für niemanden mehr sichtbar. Die Löschung aus allen
        aktiven Systemen ist beauftragt und wird innerhalb von 30 Tagen abgeschlossen.
      </p>
      <Suspense fallback={<Skeleton className="h-20 w-full rounded-[16px]" />}>
        <Receipt searchParams={searchParams} />
      </Suspense>
      <ul className="flex flex-col gap-3 text-base text-ink-2">
        <li className="flex gap-3">
          <Icon name="mail" className="mt-1 size-5 shrink-0 text-ink" />
          Nach Abschluss erhältst du einen Beleg an deine bestätigte E-Mail-Adresse – ohne Inhalte.
        </li>
        <li className="flex gap-3">
          <Icon name="archive" className="mt-1 size-5 shrink-0 text-ink" />
          Letzte Sicherungskopien werden spätestens 65 Tage nach dem Auftrag überschrieben. Sie werden nicht produktiv genutzt.
        </li>
        <li className="flex gap-3">
          <Icon name="info" className="mt-1 size-5 shrink-0 text-ink" />
          Eine Anmeldung reaktiviert das Konto nicht. Für einen Neubeginn kannst du dich jederzeit neu registrieren.
        </li>
      </ul>
      <ButtonLink href="/" size="lg" variant="secondary">
        Zur Startseite
      </ButtonLink>
    </div>
  );
}

async function Receipt({ searchParams }: { searchParams: PageProps<"/konto-geloescht">["searchParams"] }) {
  const sp = await searchParams;
  const beleg = typeof sp.beleg === "string" && /^D-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(sp.beleg) ? sp.beleg : null;
  if (!beleg) return null;
  return (
    <div className="flex w-full flex-col gap-1 rounded-[16px] bg-sunk p-4 sm:p-5">
      <p className="text-sm font-semibold text-ink-2">Belegnummer deines Löschauftrags</p>
      <p className="tabular font-mono text-xl font-semibold text-ink">{beleg}</p>
      <p className="text-sm text-ink-2">Bitte notiere sie, falls du dich an die Datenschutzstelle wenden möchtest.</p>
    </div>
  );
}
