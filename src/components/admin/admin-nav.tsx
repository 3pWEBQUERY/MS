"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SideNavLink } from "@/components/shell/nav-link";
import { IconButton } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** Gruppenbeschriftung in der Seitenleiste (rein visuell, wie in der App-Seitenleiste) */
  group?: string;
  /** Deutliche Markierung, z. B. offene P0-Fälle (K01: Leitung alarmieren) */
  alert?: { count: number; label: string };
};

function AlertBadge({ alert }: { alert: NonNullable<AdminNavItem["alert"]> }) {
  return (
    <span className="tabular inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-[8px] bg-danger px-1.5 text-xs font-bold text-white dark:text-ink-inverse">
      {alert.count > 99 ? "99+" : alert.count}
      <span className="sr-only"> {alert.label}</span>
    </span>
  );
}

/** Aufeinanderfolgende Einträge derselben Gruppe zusammenfassen (Reihenfolge aus sections.ts). */
function grouped(items: AdminNavItem[]) {
  const groups: { label?: string; items: AdminNavItem[] }[] = [];
  for (const i of items) {
    const last = groups.at(-1);
    if (last && last.label === i.group) last.items.push(i);
    else groups.push({ label: i.group, items: [i] });
  }
  return groups;
}

/**
 * Seitenleisten-Navigation (Desktop) in der Sprache der App-Seitenleiste: Mono-Abschnittsbeschriftungen,
 * aktive Zeile vertieft mit Glut-Strich (über SideNavLink, inkl. aria-current).
 */
export function AdminNavList({ items }: { items: AdminNavItem[] }) {
  return (
    <div className="flex flex-col gap-6">
      {grouped(items).map((g, gi) => (
        <div key={g.label ?? gi} className="flex flex-col">
          {g.label && (
            <p className="eyebrow mb-2 px-3 !text-[0.75rem]" aria-hidden="true">
              {g.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((i) => (
              <li key={i.href}>
                <SideNavLink href={i.href} icon={i.icon} exact={i.exact} badge={i.alert && i.alert.count > 0 ? <AlertBadge alert={i.alert} /> : undefined}>
                  {i.label}
                </SideNavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Kompakte Navigation für schmale Bildschirme: aufklappbar, Escape schliesst. */
export function AdminMobileNav({ items }: { items: AdminNavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const current = items.find((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`)));

  return (
    <div>
      <IconButton
        label={open ? "Bereichsmenü schliessen" : "Bereichsmenü öffnen"}
        aria-expanded={open}
        aria-controls="verwaltung-mobile-nav"
        size="sm"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "x" : "menu"} className="size-5" />
      </IconButton>
      {open && (
        <div id="verwaltung-mobile-nav" className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-bg px-4 pb-8 pt-5">
          <nav aria-label="Verwaltungsbereiche (mobil)">
            {current && <p className="mb-5 border-b border-line px-3 pb-4 text-sm text-ink-2">Aktuell: <span className="font-semibold text-ink">{current.label}</span></p>}
            <AdminNavList items={items} />
          </nav>
        </div>
      )}
    </div>
  );
}
