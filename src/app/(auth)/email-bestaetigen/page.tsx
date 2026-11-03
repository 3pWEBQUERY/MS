import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice, Skeleton } from "@/components/ui/primitives";
import { getViewer } from "@/server/auth/viewer";
import { inspectToken } from "@/server/modules/account/tokens";
import { ResendForm, VerifyForm } from "./forms";

export const metadata: Metadata = { title: "E-Mail bestätigen", robots: { index: false } };

/** S03 E-Mail bestätigen (ACC02): Token prüfen, erneut senden; abgelaufen oder bereits verwendet */
export default function VerifyEmailPage({ searchParams }: PageProps<"/email-bestaetigen">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-[20px]" />}>
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyContent({ searchParams }: { searchParams: PageProps<"/email-bestaetigen">["searchParams"] }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : null;

  if (token) {
    const state = await inspectToken(token);
    if (state === "valid") {
      return (
        <>
          <AuthHeading eyebrow="Letzter Schritt" title="E-Mail-Adresse bestätigen">
            Mit einem Klick bestätigst du, dass diese Adresse dir gehört. Wir prüfen dabei weder Diagnose noch Identität.
          </AuthHeading>
          <VerifyForm token={token} />
        </>
      );
    }
    return (
      <>
        <AuthHeading title={state === "used" ? "Link bereits verwendet" : "Link nicht mehr gültig"}>
          {state === "used"
            ? "Diese Adresse wurde vermutlich schon bestätigt. Du kannst dich direkt anmelden."
            : "Bestätigungslinks sind 24 Stunden gültig. Fordere einfach einen neuen an."}
        </AuthHeading>
        <div className="flex flex-col gap-6">
          {state === "used" && (
            <ButtonLink href="/anmelden" size="lg" className="w-full">
              Zur Anmeldung
            </ButtonLink>
          )}
          <ResendForm askEmail />
        </div>
      </>
    );
  }

  const viewer = await getViewer();
  return (
    <>
      {/* Ruhiges Zeichen statt Icon-Kachel: Mono-Auszeichnung mit Symbol (dekorativ) */}
      <p aria-hidden="true" className="mb-6 flex items-center gap-3 border-t border-ink pt-4 text-accent-ink">
        <Icon name="mail" className="size-6" />
      </p>
      <AuthHeading title="Schau in dein Postfach">
        Wir haben dir einen Bestätigungslink gesendet, sofern zu dieser Adresse noch kein Konto besteht. Der Link ist 24
        Stunden gültig. Danach meldest du dich mit E-Mail-Adresse und Passwort an.
      </AuthHeading>
      <div className="flex flex-col gap-6">
        <Notice tone="neutral" title="Keine E-Mail erhalten?">
          Prüfe den Spam-Ordner. Du kannst höchstens drei neue Links pro Stunde anfordern. Unbestätigte Konten werden nach
          sieben Tagen automatisch gelöscht.
        </Notice>
        <ResendForm askEmail={!viewer || viewer.verified} />
      </div>
    </>
  );
}
