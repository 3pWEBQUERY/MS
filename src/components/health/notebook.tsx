import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Notizbuch-Bausteine für Mein MS (docs/DESIGN.md «Raster statt Kästchen»).
 * Ohne Hooks und ohne Serverabhängigkeiten – in Server- und Client-Komponenten nutzbar.
 */

export const two = (i: number) => String(i + 1).padStart(2, "0");

/**
 * Ein Abschnitt eines Formulars als Notizbuchzeile: Haarlinie oben, Mono-Ziffer «01» am Rand.
 * Die Ziffer ist rein visuell (aria-hidden), die Beschriftung bleibt in Legend/Label.
 */
export function FormStep({
  index,
  children,
  className,
  strong = false,
  first = false,
}: {
  index?: string;
  /** Erster Abschnitt direkt unter dem Seitenkopf: keine zweite Linie */
  first?: boolean;
  children: ReactNode;
  className?: string;
  /** Kräftige Linie (Tinte) für den Abschluss eines Formulars */
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-3 sm:grid-cols-[2.5rem_minmax(0,1fr)]",
        first ? "pt-0" : "border-t pt-6 sm:pt-8",
        strong ? "border-ink" : "border-line",
        className,
      )}
    >
      <span aria-hidden="true" className="hidden pt-1 font-mono text-sm font-medium tracking-[0.08em] text-accent-ink sm:block">
        {index}
      </span>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  );
}

/**
 * Selbst dokumentierte Werte als ruhige Zeile mit Haarlinien (DIA07): Bezeichnung in Mono,
 * Wert in der Display-Serif. Keine Farben, keine Einordnung – «nicht erfasst» nur gedämpft.
 */
export function ValueStrip({ items, className }: { items: { label: string; value: string; empty?: boolean }[]; className?: string }) {
  return (
    <dl className={cn("grid border-t border-ink sm:grid-cols-3", className)}>
      {items.map((i) => (
        <div
          key={i.label}
          className="flex flex-col gap-2 border-b border-line py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:py-6 sm:first:pl-0 sm:last:border-r-0"
        >
          <dt className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-2">{i.label}</dt>
          <dd className={cn("tabular font-display text-[1.75rem] leading-tight tracking-[-0.015em]", i.empty ? "text-ink-2" : "text-ink")}>
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Überschrift eines Formular-/Detailabschnitts in der Display-Serif (≥ 24px) */
export const stepTitle = "font-display text-[1.5rem] font-normal leading-tight tracking-[-0.015em] text-ink";
