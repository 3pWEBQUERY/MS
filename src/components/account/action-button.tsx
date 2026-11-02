"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";
import { idle, type ActionState } from "@/lib/action-state";

/**
 * Formular mit genau einem Button für einfache Server Actions (HOM07):
 * Ladezustand, Fehler und bestätigter Erfolg werden unterschieden und angekündigt.
 */
export function ActionButton({
  action,
  fields,
  children,
  pendingText = "Wird ausgeführt …",
  variant = "secondary",
  size = "md",
  className,
  reauthNext,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields?: Record<string, string>;
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Ziel nach erneuter Anmeldung, falls die Aktion sie verlangt */
  reauthNext?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form action={formAction} className={className ?? "flex flex-col items-start gap-3"}>
      {Object.entries(fields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size} pendingText={pendingText}>
        {children}
      </SubmitButton>
      <FormMessage state={state} className="w-full" />
      {state.data?.auth === "reauth" && reauthNext && (
        <Link
          href={`/konto/bestaetigen?next=${encodeURIComponent(reauthNext)}`}
          className="text-base font-medium text-ink underline underline-offset-4"
        >
          Jetzt mit Passwort bestätigen
        </Link>
      )}
    </form>
  );
}
