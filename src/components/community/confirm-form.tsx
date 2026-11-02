"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon, type IconName } from "@/components/ui/icon";
import { idle, type ActionState } from "@/lib/action-state";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Aktion mit ausdrücklicher Bestätigung der Folgen (S32 Löschfolgen, Austritt, Entfernen).
 * Der Dialog wird nur bei Bedarf gerendert; der Fokus kehrt zum Auslöser zurück (A03).
 */
export function ConfirmForm({
  action,
  hidden,
  triggerLabel,
  triggerVariant = "quiet-danger",
  triggerSize = "sm",
  triggerIcon = "trash",
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  pendingText = "Wird ausgeführt …",
}: {
  action: Action;
  hidden: Record<string, string>;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerIcon?: IconName;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  pendingText?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.status === "success") close();
    return result;
  }, idle);

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={trigger}
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setOpen(true)}
        icon={<Icon name={triggerIcon} className="size-4" />}
        aria-haspopup="dialog"
      >
        {triggerLabel}
      </Button>
      {!open && state.status === "success" && <FormMessage state={state} />}
      {open && (
        <Dialog open onClose={close} title={title} description={description}>
          <form action={formAction} className="flex flex-col gap-4">
            {Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            {state.status === "error" && <FormMessage state={state} />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={close}>
                Abbrechen
              </Button>
              <SubmitButton variant={confirmVariant} pendingText={pendingText}>
                {confirmLabel}
              </SubmitButton>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
