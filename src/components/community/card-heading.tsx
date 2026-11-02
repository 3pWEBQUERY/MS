import type { ReactNode } from "react";

/** Überschrift innerhalb einer Karte mit Flex-Abstand (ohne eigenen Aussenabstand). */
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
    <div className="flex flex-col gap-1">
      <As id={id} className={As === "h2" ? "text-xl font-[650] text-ink" : "text-lg font-[650] text-ink"}>
        {title}
      </As>
      {description && <p className="text-base text-ink-2">{description}</p>}
    </div>
  );
}
