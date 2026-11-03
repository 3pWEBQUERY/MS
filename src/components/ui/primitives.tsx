import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

/* ───────────────────────── Karten ─────────────────────────
 * Karte: Radius 20px, Rand 1px, Innenabstand 24px (mobil 20px).
 * Verschachtelte Elemente mit 8px Abstand zum Rand erhalten 12px (20 − 8).
 */
export function Card({
  className,
  padded = true,
  tone = "surface",
  ...props
}: { padded?: boolean; tone?: "surface" | "sunk" | "accent" | "verified" | "ink" } & ComponentProps<"div">) {
  const tones = {
    surface: "border border-line bg-surface",
    sunk: "border border-transparent bg-sunk",
    accent: "border border-transparent bg-accent-soft",
    verified: "border border-transparent bg-verified-soft",
    ink: "border border-transparent bg-ink text-ink-inverse",
  };
  return <div className={cn("rounded-[20px]", tones[tone], padded && "p-5 sm:p-6", className)} {...props} />;
}

/** Klickbare Karte als Link – ganze Fläche aktiv, Hover nur über Rand und Fläche */
export function CardLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group block rounded-[20px] border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-2 hover:bg-raised sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

/* ───────────────────────── Badges ───────────────────────── */
export type Tone = "neutral" | "accent" | "verified" | "success" | "warning" | "danger" | "info" | "outline";

const toneClass: Record<Tone, string> = {
  neutral: "bg-sunk text-ink-2",
  accent: "bg-accent-soft text-accent-ink",
  verified: "bg-verified-soft text-verified",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  outline: "border border-line-2 text-ink-2",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 text-sm font-semibold",
        toneClass[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} className="size-4" />}
      {children}
    </span>
  );
}

/* ───────────────────────── Hinweise ───────────────────────── */
export function Notice({
  tone = "info",
  title,
  children,
  icon,
  className,
  role,
  action,
}: {
  tone?: "info" | "success" | "warning" | "danger" | "neutral" | "accent";
  title?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  className?: string;
  role?: "status" | "alert" | "note";
  action?: ReactNode;
}) {
  const map = {
    info: { bg: "bg-info-soft", fg: "text-info", icon: "info" as IconName },
    success: { bg: "bg-success-soft", fg: "text-success", icon: "check-circle" as IconName },
    warning: { bg: "bg-warning-soft", fg: "text-warning", icon: "warning" as IconName },
    danger: { bg: "bg-danger-soft", fg: "text-danger", icon: "alert" as IconName },
    neutral: { bg: "bg-sunk", fg: "text-ink-2", icon: "info" as IconName },
    accent: { bg: "bg-accent-soft", fg: "text-accent-ink", icon: "info" as IconName },
  }[tone];
  return (
    <div role={role} className={cn("flex gap-3 rounded-[16px] p-4 sm:p-5", map.bg, className)}>
      <Icon name={icon ?? map.icon} className={cn("mt-0.5 size-5 shrink-0", map.fg)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className="text-base text-ink-2 [&_a]:font-medium [&_a]:text-ink [&_a]:underline">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/* ───────────────────────── Seitenkopf ───────────────────────── */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 pb-8 sm:pb-10", className)}>
      {back && <BackLink href={back.href}>{back.label}</BackLink>}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-3">
          {eyebrow && <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">{eyebrow}</p>}
          <h1 className="text-3xl font-[650] tracking-[-0.025em] text-ink break-words hyphens-auto sm:text-[2.5rem] sm:leading-[1.08]">{title}</h1>
          {description && <div className="text-lg text-ink-2">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  as: As = "h2",
  id,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        <As id={id} className={cn("font-[650] text-ink", As === "h2" ? "text-xl" : "text-lg")}>
          {title}
        </As>
        {description && <p className="text-base text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-fit items-center gap-1.5 rounded-[10px] pr-2 text-base font-medium text-ink-2 transition-colors hover:text-ink"
    >
      <Icon name="arrow-left" className="size-5" />
      {children}
    </Link>
  );
}

/* ───────────────────────── Leere Zustände ───────────────────────── */
export function EmptyState({
  icon = "sparkles",
  title,
  children,
  action,
  className,
}: {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-[20px] border border-dashed border-line-2 bg-surface p-6 sm:p-8",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-[12px] bg-sunk text-ink-2">
        <Icon name={icon} className="size-6" />
      </span>
      <div className="flex max-w-xl flex-col gap-1.5">
        <p className="text-lg font-semibold text-ink">{title}</p>
        {children && <div className="text-base text-ink-2">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/* ───────────────────────── Platzhalter beim Laden ───────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Inhalt wird geladen</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Definitionslisten ───────────────────────── */
export function KeyValue({ items, className }: { items: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6">
          <dt className="text-sm font-semibold text-ink-2">{k}</dt>
          <dd className="text-base text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────────────────────── Tabellen ───────────────────────── */
/**
 * Breite Tabellen scrollen in ihrem eigenen Container (A02). Der Container ist per Tastatur
 * erreichbar (WCAG 2.1.1, axe «scrollable-region-focusable») und positioniert, damit
 * visuell verborgene Texte (sr-only) nicht aus dem Container herausragen.
 */
export function Table({ className, scrollLabel = "Tabelle", ...props }: ComponentProps<"table"> & { scrollLabel?: string }) {
  return (
    <div
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
      className="relative overflow-x-auto rounded-[16px] border border-line bg-surface"
    >
      <table
        className={cn(
          "w-full border-collapse text-left text-base [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_th]:bg-raised [&_th]:px-4 [&_th]:py-3 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-ink-2",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/* ───────────────────────── Monogramm (keine Profilbilder im MVP) ───────────────────────── */
const MONO_TONES = [
  "bg-accent-soft text-accent-ink",
  "bg-verified-soft text-verified",
  "bg-info-soft text-info",
  "bg-warning-soft text-warning",
  "bg-sunk text-ink-2",
];

export function Monogram({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const letters = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const dims = { sm: "size-8 rounded-[8px] text-xs", md: "size-10 rounded-[10px] text-sm", lg: "size-14 rounded-[14px] text-lg" }[
    size
  ];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center font-bold", dims, MONO_TONES[hash % MONO_TONES.length])}
    >
      {letters}
    </span>
  );
}

/* ───────────────────────── Segmentnavigation (Tabs als Links) ───────────────────────── */
export function SegmentNav({
  items,
  label,
  className,
}: {
  items: { href: string; label: string; active?: boolean; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("relative -mx-1 overflow-x-auto px-1", className)}>
      <ul className="flex w-max gap-1 rounded-[14px] bg-sunk p-1">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={i.active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors",
                i.active ? "bg-surface text-ink" : "text-ink-2 hover:text-ink",
              )}
            >
              {i.label}
              {i.count !== undefined && (
                <span className="tabular rounded-[6px] bg-sunk px-1.5 text-xs text-ink-2">{i.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Externer Link – als solcher erkennbar, ohne Weitergabe von Parametern (CON04) */
export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      referrerPolicy="no-referrer"
      className={cn("inline-flex items-center gap-1 font-medium text-accent-ink underline underline-offset-4", className)}
    >
      {children}
      <Icon name="external" className="size-4" />
      <span className="sr-only">(externer Link, öffnet in neuem Tab)</span>
    </a>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

/** Text ohne HTML-Interpretation, mit erkennbaren, nicht automatisch geöffneten Links (COM02, MSG03) */
export function PlainText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            referrerPolicy="no-referrer"
            className="break-all font-medium text-accent-ink underline underline-offset-4"
          >
            {p}
            <span className="sr-only"> (externer Link)</span>
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}
