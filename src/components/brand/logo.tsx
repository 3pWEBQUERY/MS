import Link from "next/link";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

/**
 * Bildmarke: Quadrat mit Radius 9 (bei 36px ≈ Höhe/4), darin ein ruhender Punkt
 * («Mein Moment») und ein offener Bogen. Flach, ohne Verlauf.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={cn("size-9 shrink-0", className)} aria-hidden="true">
      <rect width="36" height="36" rx="9" className="fill-ink" />
      <path
        d="M10.5 22.5a7.5 7.5 0 0 1 15 0"
        fill="none"
        className="stroke-ink-inverse"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="18" cy="13" r="3.2" className="fill-accent" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex h-11 items-center gap-2.5 rounded-[12px] pr-2 text-ink", className)}
      aria-label={`${site.name} – Startseite`}
    >
      <LogoMark />
      <span className="whitespace-nowrap text-[1.125rem] font-bold tracking-[-0.02em]">
        MS<span className="font-medium text-ink-2 max-[359px]:sr-only"> Plattform</span>
      </span>
    </Link>
  );
}
