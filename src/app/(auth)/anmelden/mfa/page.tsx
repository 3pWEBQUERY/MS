import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Notice, Skeleton } from "@/components/ui/primitives";
import { getViewer, safeNext } from "@/server/auth/viewer";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Zweiter Faktor" };

/** S06 MFA und Wiederherstellung (ACC05) */
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
      <Notice tone="neutral" title="Faktor verloren?">
        Ohne Code und Wiederherstellungscodes hilft dir unser Support über einen geprüften Prozess weiter – nie allein
        über eine Profilangabe. <Link href="/kontakt?kategorie=konto">Kontakt aufnehmen</Link>
      </Notice>
    </div>
  );
}
