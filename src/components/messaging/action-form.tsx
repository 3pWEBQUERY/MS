"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/cn";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Formular mit einer einzigen Absende-Schaltfläche (z. B. «Annehmen»). Erfolg und Fehler
 * werden erst nach Serverbestätigung angezeigt (HOM07).
 */
export function ActionForm({
  action,
  fields,
  label,
  pendingText = "Wird ausgeführt …",
  variant = "primary",
  size = "sm",
  icon,
  className,
  showSuccess = true,
}: {
  action: FormAction;
  fields?: Record<string, string>;
  label: string;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  showSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form action={formAction} className={cn("flex flex-col gap-2", className)}>
      {Object.entries(fields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size} pendingText={pendingText} icon={icon}>
        {label}
      </SubmitButton>
      {(state.status === "error" || showSuccess) && <FormMessage state={state} />}
    </form>
  );
}

/**
 * Aktion mit Bestätigungsdialog, der die Folgen erklärt (z. B. «Kontakt beenden»,
 * «Blockierung aufheben»). Fokus kehrt beim Schliessen zum Auslöser zurück.
 */
export function ConfirmAction({
  action,
  fields,
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerIcon,
  title,
  children,
  confirmLabel,
  confirmVariant = "danger",
  pendingText = "Wird ausgeführt …",
}: {
  action: FormAction;
  fields?: Record<string, string>;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: ReactNode;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  pendingText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, idle);
  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} icon={triggerIcon} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <div className="flex flex-col gap-4 text-base text-ink-2">{children}</div>
        <form action={formAction} className="flex flex-col gap-4">
          {Object.entries(fields ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <FormMessage state={state} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <SubmitButton variant={confirmVariant} pendingText={pendingText}>
              {confirmLabel}
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
