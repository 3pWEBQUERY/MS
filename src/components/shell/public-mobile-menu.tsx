"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PUBLIC_NAV } from "@/lib/site";

export function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="lg:hidden">
      <IconButton
        label={open ? "Menü schliessen" : "Menü öffnen"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        size="sm"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "x" : "menu"} className="size-5" />
      </IconButton>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[72px] z-40 border-b border-line bg-bg px-4 pb-6 pt-2">
          <nav aria-label="Hauptbereiche (mobil)">
            <ul className="flex flex-col gap-1">
              {[...PUBLIC_NAV, { href: "/anmelden", label: "Anmelden" }].map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="flex h-12 items-center justify-between rounded-[12px] px-3 text-lg font-semibold text-ink hover:bg-sunk"
                  >
                    {n.label}
                    <Icon name="chevron-right" className="size-5 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
