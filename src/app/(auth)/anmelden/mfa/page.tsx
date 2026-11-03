import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionButton } from "@/components/account/action-button";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Notice, Skeleton } from "@/components/ui/primitives";
import { getViewer, safeNext } from "@/server/auth/viewer";
import { requestMfaRecoveryAction } from "@/server/modules/privacy/mfa-recovery-actions";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Zweiter Faktor" };

/** S06 MFA und Wiederherstellung (ACC05): Code, einmalige Recovery-Codes, geprüfte Wiederherstellung */
export default function MfaPage({ searchParams }: PageProps<"/anmelden/mfa">) {
  return (
    <>
      <AuthHeading eyebrow="Zusätzliche Sicherheit" title="Anmeldung bestätigen">
        Dein Konto ist mit einem zweiten Faktor geschützt.
      </AuthHeading>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-[20px]" />}>
        <MfaGate searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MfaGate({ searchParams }: { searchParams: PageProps<"/anmelden/mfa">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const viewer = await getViewer();
  if (!viewer) redirect(`/anmelden?next=${encodeURIComponent(next)}`);
  if (!viewer.mfaEnabled) {
    if (viewer.isStaff) redirect("/konto/sicherheit?mfa=pflicht");
    redirect(next);
  }
  if (viewer.mfaVerified) redirect(next);
  return (
    <div className="flex flex-col gap-6">
      <MfaForm next={next} />
      <Notice tone="neutral" title="Faktor und Codes verloren?">
        <p>
          Dann kannst du hier eine geprüfte Wiederherstellung anfordern. Die Datenschutzstelle meldet sich über deine
          bestätigte E-Mail-Adresse und prüft deine Identität – nie allein über eine Profilangabe und ohne Ausweiskopie.
          Bis dahin bleibt alles unverändert.
        </p>
        <div className="mt-4">
          <ActionButton action={requestMfaRecoveryAction} variant="secondary" size="sm" pendingText="Wird gesendet …">
            Wiederherstellung anfordern
          </ActionButton>
        </div>
        <p className="mt-3 text-sm text-ink-2">
          Fragen? <Link href="/kontakt?kategorie=konto" className="font-medium underline underline-offset-4">Kontakt aufnehmen</Link>
        </p>
      </Notice>
    </div>
  );
}
