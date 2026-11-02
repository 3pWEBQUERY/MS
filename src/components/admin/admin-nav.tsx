"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SideNavLink } from "@/components/shell/nav-link";
import { IconButton } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

export type AdminNavItem = { href: string; label: string; icon: IconName; exact?: boolean };

/** Seitenleisten-Navigation (Desktop). aria-current über SideNavLink. */
export function AdminNavList({ items }: { items: AdminNavItem[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((i) => (
        <li key={i.href}>
          <SideNavLink href={i.href} icon={i.icon} exact={i.exact}>
            {i.label}
          </SideNavLink>
        </li>
      ))}
    </ul>
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
        <div id="verwaltung-mobile-nav" className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-bg px-4 pb-6 pt-3">
          <nav aria-label="Verwaltungsbereiche (mobil)">
            {current && <p className="mb-2 px-1 text-sm text-ink-2">Aktuell: {current.label}</p>}
            <AdminNavList items={items} />
          </nav>
        </div>
      )}
    </div>
  );
}
