import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Skeleton } from "@/components/ui/primitives";
import { requireViewer, safeNext } from "@/server/auth/viewer";
import { ReauthForm } from "./reauth-form";

export const metadata: Metadata = { title: "Aktion bestätigen", robots: { index: false } };

/** Erneute Authentifizierung vor sensiblen Aktionen (ACC07, PRI03–PRI05, S16) */
export default function ReauthPage({ searchParams }: PageProps<"/konto/bestaetigen">) {
  return (
    <>
      <AuthHeading eyebrow="Zu deinem Schutz" title="Bitte bestätige, dass du es bist">
        Für Export, Löschung und Kontoänderungen fragen wir dein Passwort erneut ab. Die Bestätigung gilt 10 Minuten.
      </AuthHeading>
      <Suspense fallback={<Skeleton className="h-56 w-full rounded-[20px]" />}>
        <ReauthGate searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ReauthGate({ searchParams }: { searchParams: PageProps<"/konto/bestaetigen">["searchParams"] }) {
  const sp = await searchParams;
  const viewer = await requireViewer({ allowSuspended: true, allowNoProfile: true, allowUnverified: true });
  return <ReauthForm next={safeNext(typeof sp.next === "string" ? sp.next : null, "/konto")} withCode={viewer.mfaEnabled} />;
}
