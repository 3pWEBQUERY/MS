import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { RequestResetForm } from "./request-form";

export const metadata: Metadata = { title: "Passwort zurücksetzen" };

/** S05 Passwort zurücksetzen – Anfrage mit neutralem Versandstatus (ACC04) */
export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading eyebrow="Passwort vergessen" title="Neues Passwort festlegen">
        Gib die E-Mail-Adresse deines Kontos ein. Du erhältst einen Link, der 30 Minuten gültig ist.
      </AuthHeading>
      <RequestResetForm />
      <p className="mt-6 text-center text-base text-ink-2">
        <Link href="/anmelden" className="font-semibold text-ink underline underline-offset-4">
          Zurück zur Anmeldung
        </Link>
      </p>
    </>
  );
}
