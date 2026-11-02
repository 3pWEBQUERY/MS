import type { ReactNode } from "react";

export function AuthHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">{eyebrow}</p>}
      <h1 className="text-3xl font-[650] tracking-[-0.025em] text-ink sm:text-[2.25rem]">{title}</h1>
      {children && <div className="text-lg text-ink-2">{children}</div>}
    </div>
  );
}
