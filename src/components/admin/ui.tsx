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

/* ───────────── Kennzahlen ─────────────
 * Kennzahlen stehen in einem Haarlinien-Raster (DESIGN «Raster statt Kästchen»): Wert in Mono und
 * tabellarischen Ziffern, Beschriftung darüber, Hinweis darunter. Status nie nur über Farbe – Warn-
 * und Gefahrenwerte tragen zusätzlich ein Symbol, der Hinweistext nennt den Stand.
 */

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
      <span className="flex items-start justify-between gap-2 min-[360px]:min-h-[2.75rem]">
        <span className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-snug text-ink-2">
          {icon && <Icon name={icon} className="mt-0.5 size-4 shrink-0 text-ink-3" />}
          <span className="min-w-0 hyphens-auto">{label}</span>
        </span>
        {href && <Icon name="arrow-right" className="nudge mt-0.5 size-4 shrink-0 text-ink-3 group-hover:text-ink" />}
      </span>
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "tabular font-mono text-[2rem] font-medium leading-none tracking-[-0.03em]",
            tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink",
          )}
        >
          {value}
        </span>
        {tone !== "neutral" && (
          <Icon name={tone === "danger" ? "alert" : "warning"} className={cn("size-5 shrink-0", tone === "danger" ? "text-danger" : "text-warning")} />
        )}
      </span>
      {hint && <span className="text-sm leading-snug text-ink-2">{hint}</span>}
    </>
  );
  const cls = "flex h-full flex-col gap-3 border-l border-t border-line px-4 pb-5 pt-4 sm:px-5";
  if (!href) return <div className={cls}>{body}</div>;
  return (
    <Link href={href} data-focus-inset className={cn(cls, "group transition-colors duration-150 hover:bg-raised")}>
      {body}
    </Link>
  );
}

/** Raster der Kennzahlen: kräftige Linie oben, Haarlinien zwischen den Zellen (kein Kartenraster). */
export function StatGrid({ children, className, cols = 4 }: { children: ReactNode; className?: string; cols?: 2 | 3 | 4 }) {
  const lg = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[cols];
  return (
    <div className={cn("overflow-hidden border-b border-t border-b-line border-t-ink", className)}>
      <div className={cn("-ml-px -mt-px grid grid-cols-1 min-[360px]:grid-cols-2", lg)}>{children}</div>
    </div>
  );
}

/* ───────────── Sektionen ───────────── */

export function AdminSectionBlock({
  id,
  title,
  description,
  action,
  index,
  layout = "stack",
  children,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Optionale Ziffer «01» (Mono, Glut) über dem Titel – Orientierung in langen Übersichten */
  index?: string;
  /** «split»: Titelspalte links, Inhalt rechts (ab lg), beide Spalten mit gemeinsamer Linie */
  layout?: "stack" | "split";
  children: ReactNode;
}) {
  const head = <AdminHeading id={id} title={title} description={description} index={index} />;
  if (layout === "split") {
    return (
      <section aria-labelledby={id} className="grid gap-x-10 gap-y-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-4 lg:border-t lg:border-ink lg:pt-4">
          {head}
          {action}
        </div>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </section>
    );
  }
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {head}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Abschnittstitel der Verwaltung: sachliche Sans-Überschrift (Serif bleibt dem Seitentitel vorbehalten),
 * optional mit Mono-Ziffer. Für eigene <section aria-labelledby>-Blöcke.
 */
export function AdminHeading({
  id,
  title,
  description,
  index,
  className,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  index?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {index && (
        <span className="font-mono text-[0.8125rem] font-medium tracking-[0.12em] text-accent-ink" aria-hidden="true">
          {index}
        </span>
      )}
      <h2 id={id} className="text-xl font-[650] leading-snug tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {description && <div className="max-w-2xl text-base text-ink-2">{description}</div>}
    </div>
  );
}

/**
 * Ruhiger Seitenblock für Randspalten (Fallangaben, Zuweisung, Status): kräftige Linie oben,
 * Überschrift als Mono-Eyebrow. Ersetzt gestapelte Karten in Fallansichten.
 */
export function SidePanel({
  title,
  id,
  children,
  className,
}: {
  title: ReactNode;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-3 border-t border-ink pt-4", className)}>
      <h2 id={id} className="eyebrow !text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Haarlinien-Protokoll (Belege, Meldungen, Verlauf, Quellen): nummerierte Zeilen mit Mono-Ziffer
 * statt gestapelter Karten. `as="ol"` für Reihenfolgen mit Bedeutung.
 */
export function LedgerList({ as: As = "ol", className, children }: { as?: "ol" | "ul"; className?: string; children: ReactNode }) {
  return <As className={cn("border-t border-line", className)}>{children}</As>;
}

export function LedgerItem({
  index,
  id,
  tone = "plain",
  className,
  children,
}: {
  index?: string;
  id?: string;
  /** «attention»: Zeile wartet auf eine Handlung (z. B. zweite Freigabe) – vertiefte Fläche, Glut-Strich */
  tone?: "plain" | "attention";
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      id={id}
      className={cn(
        "relative grid gap-x-5 border-b border-line py-5",
        index ? "grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2.5rem_minmax(0,1fr)]" : "grid-cols-1",
        tone === "attention" && "bg-sunk px-4 before:absolute before:inset-y-4 before:left-0 before:w-[3px] before:rounded-full before:bg-accent sm:px-5",
        className,
      )}
    >
      {index && (
        <span aria-hidden="true" className="pt-0.5 font-mono text-sm font-medium tracking-[0.08em] text-ink-3">
          {index}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </li>
  );
}

/** «01», «02» … für Ledger- und Indexzeilen */
export function pad(n: number) {
  return String(n).padStart(2, "0");
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
    <span className="tabular font-mono text-sm tracking-[0.04em] text-ink-2" title={id}>
      {id.slice(0, 8)}
    </span>
  );
}

/** Kleine Filterleiste als GET-Formular (ohne JavaScript bedienbar). */
export function FilterForm({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} method="get" className="flex flex-col gap-3 rounded-[20px] bg-sunk p-4 sm:flex-row sm:flex-wrap sm:items-end">
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

/** KeyValue in schmalen Randspalten (ab xl 22rem): Begriff über Wert statt zwei enger Spalten. */
export const SIDE_KV = "xl:[&>div]:grid-cols-1 xl:[&>div]:gap-0.5";

/**
 * Leerer Zustand der Verwaltung: sachliche Haarlinien-Zeile statt grosser Serif-Karte – im
 * Arbeitswerkzeug ist «nichts offen» eine Statusmeldung, kein Moment (Symbol + Text, nie nur Farbe).
 */
export function AdminEmpty({
  icon = "check-circle",
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
    <div className={cn("flex items-start gap-3 border-y border-line py-5", className)}>
      <Icon name={icon} className="mt-0.5 size-5 shrink-0 text-ink-3" />
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className="font-semibold text-ink">{title}</p>
        {children && <div className="text-base text-ink-2">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
