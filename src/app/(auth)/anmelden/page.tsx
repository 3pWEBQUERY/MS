import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Notice, Skeleton } from "@/components/ui/primitives";
import { getViewer, safeNext } from "@/server/auth/viewer";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

const STATUS: Record<string, { tone: "success" | "info"; text: string }> = {
  bestaetigt: { tone: "success", text: "Deine E-Mail-Adresse ist bestätigt. Du kannst dich jetzt anmelden." },
  passwort: { tone: "success", text: "Dein Passwort wurde geändert. Aus Sicherheitsgründen wurden alle Sitzungen beendet." },
  abgelaufen: { tone: "info", text: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." },
};

/** S04 Login (ACC03): neutraler Fehler, Rückkehr zum ursprünglichen Ziel */
export default function LoginPage({ searchParams }: PageProps<"/anmelden">) {
  return (
    <>
      <AuthHeading eyebrow="Willkommen zurück" title="Anmelden" />
      <Suspense fallback={<Skeleton className="h-[380px] w-full rounded-[20px]" />}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginGate({ searchParams }: { searchParams: PageProps<"/anmelden">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const viewer = await getViewer();
  if (viewer && (!viewer.mfaEnabled || viewer.mfaVerified)) redirect(next);
  const status = typeof sp.status === "string" ? STATUS[sp.status] : undefined;
  return (
    <div className="flex flex-col gap-6">
      {status && (
        <Notice tone={status.tone} role="status">
          {status.text}
        </Notice>
      )}
      <LoginForm next={next} />
    </div>
  );
}
