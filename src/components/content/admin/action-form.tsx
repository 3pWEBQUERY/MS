"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { idle, type ActionState } from "@/lib/action-state";

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Versteckte Felder – nur Kennungen und Versionen, keine sensiblen Werte. */
export function HiddenFields({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
    </>
  );
}

/**
 * Einzelne Statusaktion (Prüfauftrag, Publikation, Aktivierung …) als Formular.
 * Mit `confirm` öffnet sich zuerst ein Bestätigungsdialog. Erfolg erst nach Serverbestätigung (HOM07).
 */
export function StatusAction({
  action,
  fields,
  label,
  pendingText = "Wird ausgeführt …",
  variant = "secondary",
  size = "md",
  confirm,
  icon,
}: {
  action: FormAction;
  fields: Record<string, string | number>;
  label: string;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  confirm?: { title: string; body: ReactNode; confirmLabel: string; variant?: ButtonVariant };
  icon?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, idle);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <form action={formAction}>
      <HiddenFields fields={fields} />
      <div className="flex flex-col items-start gap-2">
        {confirm ? (
          <Button ref={trigger} type="button" variant={variant} size={size} icon={icon} onClick={() => setOpen(true)}>
            {label}
          </Button>
        ) : (
          <SubmitButton variant={variant} size={size} pendingText={pendingText} icon={icon}>
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
