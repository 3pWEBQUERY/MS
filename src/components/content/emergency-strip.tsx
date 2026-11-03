import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Notruf-Hinweis im Stil des 144-Blocks der Startseite (SAF06): grosse Serif-Ziffer als Signal,
 * daneben Titel und Text. Die Ziffer ist dekorativ – die Nummer steht immer auch im Text.
 */
export function EmergencyStrip({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-[20px] bg-danger-soft p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-6",
        className,
      )}
    >
      <p className="font-display text-[3.25rem] leading-none tracking-[-0.04em] text-danger tabular sm:text-[3.75rem]" aria-hidden="true">
        144
      </p>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-lg font-semibold text-ink">{title}</p>
        <div className="text-base text-ink-2 [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4">{children}</div>
      </div>
    </div>
  );
}
