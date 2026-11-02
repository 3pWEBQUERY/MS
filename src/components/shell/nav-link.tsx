"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";

export function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Seitenleisten-Eintrag (Desktop) – 48px hoch, Radius 12px */
export function SideNavLink({
  href,
  icon,
  children,
  badge,
  exact,
}: {
  href: string;
  icon: IconName;
  children: ReactNode;
  badge?: ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-12 items-center gap-3 rounded-[12px] px-3 text-base font-semibold transition-colors duration-150",
        active ? "bg-ink text-ink-inverse" : "text-ink-2 hover:bg-sunk hover:text-ink",
      )}
    >
      <Icon name={icon} className="size-5 shrink-0" />
      <span className="flex-1 truncate">{children}</span>
      {badge}
    </Link>
  );
}

/** Untere Navigation (Mobil) – Textbeschriftung immer sichtbar (PRD 04) */
export function BottomNavLink({ href, icon, children }: { href: string; icon: IconName; children: ReactNode }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[12px] text-xs font-semibold transition-colors",
        active ? "text-ink" : "text-ink-2 hover:text-ink",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
          active ? "bg-ink text-ink-inverse" : "",
        )}
      >
        <Icon name={icon} className="size-5" />
      </span>
      {children}
    </Link>
  );
}

/** Horizontale Navigation im öffentlichen Kopf */
export function TopNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center rounded-[10px] px-3.5 text-base font-semibold transition-colors",
        active ? "bg-sunk text-ink" : "text-ink-2 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
