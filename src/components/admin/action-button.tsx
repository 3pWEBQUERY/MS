"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Zähler, der nach jedem bestätigten Erfolg steigt – als key für kontrollierte Felder, die geleert werden sollen. */
export function useSuccessKey(state: ActionState): number {
  const [gen, setGen] = useState(0);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") setGen((g) => g + 1);
  }
  return gen;
}

/** Versteckte Felder (nur IDs und Versionen, keine sensiblen Werte). */
export function Hidden({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
    </>
  );
}

/**
 * Einzelne Aktion als Formular mit Button. Mit `confirm` öffnet sich zuerst ein
 * Bestätigungsdialog (schwere Aktionen). Erfolg erscheint erst nach Serverbestätigung.
 */
export function ActionButton({
  action,
  fields,
  label,
  pendingText = "Wird ausgeführt …",
  variant = "secondary",
  size = "sm",
  confirm,
  className,
}: {
  action: FormAction;
  fields: Record<string, string | number>;
  label: string;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  confirm?: { title: string; body: ReactNode; confirmLabel: string; variant?: ButtonVariant };
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <form action={formAction} className={className} onSubmit={() => confirm && close()}>
      <Hidden fields={fields} />
      <div className="flex flex-col items-start gap-2">
        {confirm ? (
          <Button ref={trigger} type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
            {label}
          </Button>
        ) : (
          <SubmitButton variant={variant} size={size} pendingText={pendingText}>
            {label}
          </SubmitButton>
        )}
        <FormMessage state={state} />
      </div>
      {confirm && open && (
        <Dialog open={open} onClose={close} title={confirm.title}>
          <div className="text-base text-ink-2">{confirm.body}</div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant={confirm.variant ?? "primary"} pendingText={pendingText}>
              {confirm.confirmLabel}
            </SubmitButton>
            <Button type="button" variant="ghost" onClick={close}>
              Abbrechen
            </Button>
          </div>
        </Dialog>
      )}
    </form>
  );
}
