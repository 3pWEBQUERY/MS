import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/time";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge, type Tone } from "@/components/ui/primitives";

/* ───────────── Zeitangaben ───────────── */

/** «2 h 15 Min.», «40 Min.», «3 Tagen» – ruhig, ohne Sekunden. */
export function formatSpan(ms: number): string {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60000));
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 48) {
    const rest = min % 60;
    return rest > 0 && h < 6 ? `${h} h ${rest} Min.` : `${h} h`;
  }
  const d = Math.floor(h / 24);
  return `${d} Tagen`;
}

export function deadlineInfo(dueAt: Date, now: Date, total?: number): { tone: Tone; text: string; overdue: boolean } {
  const diff = dueAt.getTime() - now.getTime();
  if (diff < 0) return { tone: "danger", text: `überfällig seit ${formatSpan(diff)}`, overdue: true };
  const soon = total ? diff < total * 0.25 : diff < 60 * 60 * 1000;
  return { tone: soon ? "warning" : "success", text: `fällig in ${formatSpan(diff)}`, overdue: false };
}

/**
 * Frist mit Ampel – Farbe nie allein: der Text nennt immer den Stand (DESIGN Regel 5, SAF03).
 */
export function Deadline({ dueAt, now, total, done }: { dueAt: Date; now: Date; total?: number; done?: boolean }) {
  if (done) {
    return <span className="text-sm text-ink-2">Frist erledigt</span>;
  }
  const info = deadlineInfo(dueAt, now, total);
  const dot = { danger: "bg-danger", warning: "bg-warning", success: "bg-success" }[info.tone as "danger" | "warning" | "success"];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span className={cn("size-2.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      <span className={cn("font-semibold", info.overdue ? "text-danger" : "text-ink")}>{info.text}</span>
      <span className="sr-only">, Frist {formatDateTime(dueAt)}</span>
    </span>
  );
}

export function DateTime({ date, className }: { date: Date | null | undefined; className?: string }) {
  if (!date) return <span className={cn("text-ink-3", className)}>–</span>;
  return (
    <time dateTime={date.toISOString()} className={cn("tabular whitespace-nowrap", className)}>
      {formatDateTime(date)}
    </time>
  );
}

/* ───────────── Kennzahlen ───────────── */

export function StatTile({
  label,
  value,
  href,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number | string;
  href?: string;
  hint?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
  icon?: IconName;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-semibold text-ink-2">
        {icon && <Icon name={icon} className="size-4" />}
        {label}
      </span>
      <span
        className={cn(
          "tabular text-3xl font-[650] tracking-[-0.02em]",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink",
        )}
      >
        {value}
      </span>
      {hint && <span className="text-sm text-ink-2">{hint}</span>}
    </>
  );
  const cls = "flex h-full flex-col gap-2 rounded-[20px] border border-line bg-surface p-5";
  if (!href) return <div className={cls}>{body}</div>;
  return (
    <Link href={href} className={cn(cls, "transition-colors duration-150 hover:border-line-2 hover:bg-raised")}>
      {body}
    </Link>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

/* ───────────── Sektionen ───────────── */

export function AdminSectionBlock({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="text-xl font-[650] text-ink">
            {title}
          </h2>
          {description && <div className="text-base text-ink-2">{description}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ tone, children, icon }: { tone: Tone; children: ReactNode; icon?: IconName }) {
  return (
    <Badge tone={tone} icon={icon}>
      {children}
    </Badge>
  );
}

/** Kurze, nicht erratbare ID-Anzeige (erste 8 Zeichen). */
export function ShortId({ id }: { id: string }) {
  return (
    <span className="tabular font-mono text-sm text-ink-2" title={id}>
      {id.slice(0, 8)}
    </span>
  );
}

/** Kleine Filterleiste als GET-Formular (ohne JavaScript bedienbar). */
export function FilterForm({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} method="get" className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end">
      {children}
      <Button type="submit" variant="secondary" icon={<Icon name="filter" className="size-5" />}>
        Filter anwenden
      </Button>
    </form>
  );
}

export function FilterLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
      {children}
    </label>
  );
}

export function PlainSelect({
  id,
  name,
  defaultValue,
  options,
  label,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div className="flex min-w-44 flex-col gap-1.5">
      <FilterLabel htmlFor={id}>{label}</FilterLabel>
      <Select id={id} name={name} defaultValue={defaultValue}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function PlainInput({
  id,
  name,
  defaultValue,
  label,
  type = "text",
  placeholder,
  hint,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex min-w-44 flex-col gap-1.5">
      <FilterLabel htmlFor={id}>{label}</FilterLabel>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Link «Mehr laden» (Cursor-Paginierung, kein Endlos-Scroll). */
export function MoreLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <ButtonLink href={href} variant="secondary" className="w-fit" iconRight={<Icon name="arrow-right" className="size-5" />}>
      Weitere Einträge laden
    </ButtonLink>
  );
}
