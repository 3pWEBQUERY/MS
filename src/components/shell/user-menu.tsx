"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import { Monogram } from "@/components/ui/primitives";
import { logoutAction } from "@/server/modules/account/auth-actions";

/**
 * Profilmenü: Konto, Privatsphäre, Anzeige (PRD 04). Aufklappbereich mit Links (Disclosure,
 * kein ARIA-Menü): aria-expanded/aria-controls, Escape schliesst und gibt den Fokus zurück (A03).
 */
export function UserMenu({
  pseudonym,
  isStaff,
  notifications,
  placement,
}: {
  pseudonym: string;
  isStaff: boolean;
  notifications: number;
  placement: "sidebar" | "topbar";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const menuId = useId();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: { href: string; label: string; icon: IconName }[] = [
    { href: "/profil", label: "Mein Profil", icon: "user" },
    { href: "/konto", label: "Konto und Sicherheit", icon: "key" },
    { href: "/konto/privatsphaere", label: "Privatsphäre und Einwilligungen", icon: "shield" },
    { href: "/konto/mitteilungen", label: "Benachrichtigungen", icon: "bell" },
    { href: "/konto/anzeige", label: "Anzeige und Bedienung", icon: "type" },
    { href: "/konto/daten", label: "Daten und Konto", icon: "download" },
    { href: "/meldungen", label: "Meine Meldungen", icon: "flag" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-3 rounded-[12px] text-left transition-colors hover:bg-sunk",
          placement === "sidebar" ? "h-14 w-full px-2" : "size-[44px] justify-center",
        )}
        aria-label={placement === "topbar" ? `Profilmenü für ${pseudonym}` : undefined}
      >
        <Monogram name={pseudonym} size={placement === "sidebar" ? "md" : "sm"} />
        {placement === "sidebar" && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold text-ink">{pseudonym}</span>
              <span className="text-sm text-ink-2">Profil und Einstellungen</span>
            </span>
            <Icon name="chevron-down" className={cn("size-5 text-ink-2 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
      {open && (
        <div
          id={menuId}
          className={cn(
            "absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-[20px] border border-line-2 bg-surface p-2",
            placement === "sidebar" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2",
          )}
        >
          <ul className="flex flex-col">
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-base font-medium text-ink hover:bg-sunk"
                >
                  <Icon name={i.icon} className="size-5 text-ink-2" />
                  {i.label}
                </Link>
              </li>
            ))}
            {placement === "topbar" && (
              <li>
                <Link
                  href="/gespeichert"
                  className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-base font-medium text-ink hover:bg-sunk"
                >
                  <Icon name="bookmark" className="size-5 text-ink-2" />
                  Gespeichert
                </Link>
              </li>
            )}
            {placement === "topbar" && notifications > 0 && (
              <li className="px-3 py-1 text-sm text-ink-2">{notifications} ungelesene Hinweise</li>
            )}
            {isStaff && (
              <li className="mt-1 border-t border-line pt-1">
                <Link
                  href="/verwaltung"
                  className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-base font-medium text-ink hover:bg-sunk"
                >
                  <Icon name="settings" className="size-5 text-ink-2" />
                  Verwaltung
                </Link>
              </li>
            )}
            <li className="mt-1 border-t border-line pt-1">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-base font-medium text-ink hover:bg-sunk"
                >
                  <Icon name="logout" className="size-5 text-ink-2" />
                  Abmelden
                </button>
              </form>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
