import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { inspectToken } from "@/server/modules/account/tokens";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Neues Passwort", robots: { index: false } };

/** S05 – neues Passwort mit einmaligem Token (30 min) */
export default function ResetPasswordPage({ searchParams }: PageProps<"/passwort-zuruecksetzen">) {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full rounded-[20px]" />}>
      <ResetContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetContent({ searchParams }: { searchParams: PageProps<"/passwort-zuruecksetzen">["searchParams"] }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const state = token ? await inspectToken(token) : "unknown";
  if (state !== "valid") {
    return (
      <>
        <AuthHeading title="Link nicht mehr gültig">
          Links zum Zurücksetzen sind 30 Minuten gültig und nur einmal verwendbar.
        </AuthHeading>
        <ButtonLink href="/passwort-vergessen" size="lg" className="w-full">
          Neuen Link anfordern
        </ButtonLink>
      </>
    );
  }
  return (
    <>
      <AuthHeading eyebrow="Passwort zurücksetzen" title="Neues Passwort festlegen">
        Nach dem Speichern werden alle Sitzungen beendet. Melde dich danach mit dem neuen Passwort an.
      </AuthHeading>
      <ResetForm token={token} />
    </>
  );
}
