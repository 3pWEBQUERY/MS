"use client";

import { useActionState, type ReactNode } from "react";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";
import { Checkbox, FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { idle, type ActionState } from "@/lib/action-state";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Kleines Formular für eine einzelne Aktion (beitreten, zurückziehen, Regeln bestätigen …).
 * Erfolg und Fehler erst nach Serverantwort, per Live-Region angekündigt (HOM07, A04).
 */
export function ActionForm({
  action,
  hidden,
  submitLabel,
  pendingText = "Wird gesendet …",
  variant = "primary",
  size = "md",
  icon,
  checkbox,
  children,
  className,
}: {
  action: Action;
  hidden?: Record<string, string>;
  submitLabel: string;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  checkbox?: { name: string; label: ReactNode; description?: ReactNode };
  children?: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form action={formAction} className={cn("flex flex-col gap-4", className)} noValidate>
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {checkbox && (
        <Checkbox
          name={checkbox.name}
          label={checkbox.label}
          description={checkbox.description}
          error={state.fieldErrors?.[checkbox.name]}
        />
      )}
      <FormMessage state={state} />
      <div>
        <SubmitButton
          variant={variant}
          size={size}
          pendingText={pendingText}
          icon={icon ? <Icon name={icon} className="size-5" /> : undefined}
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
