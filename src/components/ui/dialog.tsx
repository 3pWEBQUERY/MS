"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";
import { Icon } from "./icon";

/**
 * Modaler Dialog auf Basis von <dialog> (A03): Fokus wird gefangen und beim Schliessen
 * an das auslösende Element zurückgegeben. Radius 28px, Innenabstand 24px.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      returnFocus.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[min(100%-2rem,32rem)] rounded-[28px] border border-line bg-surface p-0 text-ink backdrop:bg-ink/40",
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="dialog-title" className="text-xl font-[650]">
              {title}
            </h2>
            {description && <div className="text-base text-ink-2">{description}</div>}
          </div>
          <IconButton label="Dialog schliessen" size="sm" onClick={onClose} className="-mr-2 -mt-1">
            <Icon name="x" className="size-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
