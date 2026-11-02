import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ButtonLink } from "@/components/ui/button";
import { Notice, Skeleton } from "@/components/ui/primitives";
import { getViewer } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

/** S02 Registrierung (ACC01–02) */
export default function RegisterPage() {
  return (
    <>
      <AuthHeading eyebrow="Mitglied werden" title="Konto anlegen">
        Kostenlos, ohne Werbung. Du entscheidest selbst, was du teilst und festhältst.
      </AuthHeading>
      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-[20px]" />}>
        <RegisterGate />
      </Suspense>
    </>
  );
}

async function RegisterGate() {
  const [viewer, open] = await Promise.all([getViewer(), isEnabled("registration")]);
  if (viewer) {
    // Kein unbemerktes Zweitkonto auf einem angemeldeten Gerät (S02-Navigationsregel)
    return (
      <Notice tone="info" title={`Du bist bereits angemeldet${viewer.pseudonym ? ` als ${viewer.pseudonym}` : ""}.`}>
        <p>Für ein weiteres Konto melde dich bitte zuerst ab.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/heute" size="sm">
            Zu «Heute»
          </ButtonLink>
        </div>
      </Notice>
    );
  }
  if (!open) {
    return (
      <Notice tone="warning" title="Registrierungen sind im Moment pausiert">
        Wissen, Hilfsangebote und die Sicherheitsseite bleiben ohne Konto erreichbar.
      </Notice>
    );
  }
  return <RegisterForm />;
}
