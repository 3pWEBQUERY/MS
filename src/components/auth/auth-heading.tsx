import type { ReactNode } from "react";

export function AuthHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-4">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="display-md">{title}</h1>
      {children && <div className="text-lg leading-relaxed text-ink-2">{children}</div>}
    </div>
  );
}
