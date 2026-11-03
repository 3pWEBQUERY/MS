import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/primitives";
import { AccountNav, type AccountSection } from "./account-nav";

/**
 * Editorial-Raster für Konto und Einstellungen (S11–S16, docs/DESIGN.md «Raster statt Kästchen»):
 * Seitenkopf mit Unterstrich-Tabs, darunter Abschnitte als Haarlinien-Zeilen –
 * links Mono-Ziffer und Serif-Titel, rechts der Inhalt. Keine Kartenstapel.
 */
export function SettingsHeader({
  current,
  title,
  description,
  eyebrow = "Einstellungen",
  back,
  showNav = true,
}: {
  current: AccountSection;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
  showNav?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* Die Haarlinie trägt hier die Tab-Leiste; der Kopf selbst bleibt ohne eigene Linie */}
      <PageHeader eyebrow={eyebrow} title={title} description={description} back={back} className="!mb-0 !border-b-0 !pb-0" />
      {showNav && <AccountNav current={current} />}
    </div>
  );
}

/** Abschnittsfolge mit Haarlinien dazwischen; der erste Abschnitt schliesst direkt an. */
export function SettingsSections({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col divide-y divide-line [&>*:first-child]:pt-0", className)}>{children}</div>;
}

export function SettingsSection({
  id,
  index,
  title,
  description,
  children,
  tone = "default",
  wide = false,
  className,
}: {
  id: string;
  /** Mono-Ziffer «01» (dekorativ, für Screenreader ausgeblendet) */
  index?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** «danger»: unwiderrufliche Aktionen – Ziffer und Titel in Gefahrton, sonst gleich ruhig */
  tone?: "default" | "danger";
  /** Inhalt über die volle Spaltenbreite statt max. 42rem (z. B. Listen, Tabellen) */
  wide?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "grid grid-cols-1 gap-x-10 gap-y-6 py-10 sm:py-12 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2.5">
        {index && (
          <span
            aria-hidden="true"
            className={cn(
              "font-mono text-[0.8125rem] font-medium tracking-[0.12em]",
              tone === "danger" ? "text-danger" : "text-accent-ink",
            )}
          >
            {index}
          </span>
        )}
        <h2 id={id} className={cn("display-sm hyphens-manual", tone === "danger" && "!text-danger")}>
          {title}
        </h2>
        {description && <p className="max-w-2xl text-base text-ink-2">{description}</p>}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-6", !wide && "max-w-2xl")}>{children}</div>
    </section>
  );
}

/** Ruhige Aufzählung mit Haarlinien und kleinem Symbol (Folgen, Fristen, Merkmale). */
export function RuledList({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cn("flex flex-col border-t border-line", className)}>{children}</ul>;
}

export function RuledItem({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-4 border-b border-line py-4 text-base text-ink">
      {icon && <span className="mt-0.5 shrink-0 text-ink-2">{icon}</span>}
      <span className="min-w-0">{children}</span>
    </li>
  );
}
