import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Buttons: Radius = Höhe / 4 (sm 40px → 10px, md 48px → 12px, lg 56px → 14px).
 * Primäre Touchfläche ≥ 44 × 44 CSS-Pixel (A03). Keine Schatten, keine Verläufe.
 */
export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "quiet-danger";
export type ButtonSize = "sm" | "md" | "lg";

/*
 * Reflow (A02, WCAG 1.4.10): Unter 640 CSS-Pixel (z. B. 320 px oder 200 % Zoom) darf die
 * Beschriftung umbrechen; die Höhe ist deshalb eine Mindesthöhe.
 */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap max-sm:whitespace-normal max-sm:text-center font-semibold tracking-[-0.005em] transition-colors duration-150 ease-[var(--ease-calm)] disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-ink-inverse hover:bg-ink/85",
  accent: "bg-accent text-white hover:bg-accent-hover dark:text-ink-inverse",
  secondary: "border border-line-2 bg-surface text-ink hover:border-field hover:bg-raised",
  ghost: "text-ink hover:bg-sunk",
  danger: "bg-danger text-white hover:bg-danger/90 dark:text-ink-inverse",
  "quiet-danger": "border border-line-2 bg-surface text-danger hover:border-danger hover:bg-danger-soft",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-[10px] px-3.5 py-1.5 text-sm",
  md: "min-h-12 rounded-[12px] px-5 py-2 text-base",
  lg: "min-h-14 rounded-[14px] px-6 py-2 text-lg",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; iconRight?: ReactNode };

export function Button({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  type = "button",
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

/** Quadratischer Icon-Button mit zugänglichem Namen */
export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  className,
  children,
  type = "button",
  ...props
}: { label: string; size?: ButtonSize; variant?: ButtonVariant } & ComponentProps<"button">) {
  const dims = { sm: "size-10 rounded-[10px]", md: "size-12 rounded-[12px]", lg: "size-14 rounded-[14px]" }[size];
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], dims, "px-0", className)}
      {...props}
    >
      {children}
    </button>
  );
}
