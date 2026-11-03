import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

/** S61 Neutraler 404 – verrät keine Existenz privater Objekte (PRD 04). */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[72px] items-center px-4 sm:px-8">
        <Logo />
      </header>
      <main id="inhalt" className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="flex max-w-lg flex-col items-start gap-6">
          <p className="tabular font-mono text-sm font-medium text-ink-3">404</p>
          <h1 className="display-md">Diese Seite ist nicht verfügbar.</h1>
          <p className="text-lg text-ink-2">
            Der Inhalt existiert nicht, wurde entfernt oder ist für dein Konto nicht zugänglich.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/heute">Zu «Heute»</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Zur Startseite
            </ButtonLink>
          </div>
          <Link href="/sicherheit" className="text-base font-medium text-danger underline underline-offset-4">
            Sicherheit und akute Hilfe
          </Link>
        </div>
      </main>
    </div>
  );
}
