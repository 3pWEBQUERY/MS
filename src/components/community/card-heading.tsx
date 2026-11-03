import type { ReactNode } from "react";

/**
 * Überschrift innerhalb einer Karte oder eines Haarlinien-Abschnitts (ohne eigenen Aussenabstand).
 * h2 in der Display-Serif (≥ 24px), h3 als ruhiger Zwischentitel.
 */
export function CardHeading({
  title,
  description,
  id,
  as: As = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  id?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <As id={id} className={
          As === "h2"
            ? "font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-ink"
            : "text-lg font-[650] text-ink"
        }>
        {title}
      </As>
      {description && <p className="max-w-2xl text-base text-ink-2">{description}</p>}
    </div>
  );
}
