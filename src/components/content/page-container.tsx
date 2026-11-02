import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Inhaltsbreite für öffentliche Seiten innerhalb der PublicShell. */
export function PageContainer({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return (
    <div className={cn("mx-auto w-full px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8", narrow ? "max-w-4xl" : "max-w-7xl", className)}>
      {children}
    </div>
  );
}
