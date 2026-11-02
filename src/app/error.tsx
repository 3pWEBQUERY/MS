"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** S61 Betriebsfehler: verständliche Ursache, Wiederholung, sicherer Rückweg. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="inhalt" className="flex min-h-[60dvh] items-center justify-center px-4 py-16">
      <div className="flex max-w-lg flex-col items-start gap-6">
        <h1 className="text-3xl font-[650] tracking-[-0.025em]">Etwas hat nicht funktioniert.</h1>
        <p className="text-lg text-ink-2">
          Die Seite konnte gerade nicht geladen werden. Es wurde nichts verändert. Bitte versuche es erneut.
        </p>
        {error.digest && <p className="text-sm text-ink-2">Referenz für den Support: {error.digest}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={reset}>Erneut versuchen</Button>
          <Link href="/sicherheit" className="inline-flex h-12 items-center rounded-[12px] px-4 font-semibold text-danger hover:bg-danger-soft">
            Sicherheit und akute Hilfe
          </Link>
        </div>
      </div>
    </main>
  );
}
