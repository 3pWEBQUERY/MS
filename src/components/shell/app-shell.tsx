import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";
import { MAIN_NAV } from "@/lib/site";
import { getViewer } from "@/server/auth/viewer";
import { getShellCounts } from "@/server/modules/shell";
import { DemoBanner } from "./demo-banner";
import { DisplaySync } from "./display";
import { BottomNavLink, SideNavLink } from "./nav-link";
import { SessionWatch } from "./session-watch";
import { UserMenu } from "./user-menu";

type NavIcon = "home" | "users" | "notebook" | "book" | "lifebuoy";

function CountBadge({ value, label }: { value: number; label: string }) {
  if (value <= 0) return null;
  return (
    <span className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded-[8px] bg-accent px-1.5 text-xs font-bold text-white dark:text-ink-inverse">
      {value > 99 ? "99+" : value}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

/** Dynamischer Teil der Shell: Konto, Zähler, Anzeigepräferenzen, Sitzungswarnung. */
async function ShellUser({ placement }: { placement: "sidebar" | "topbar" }) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const counts = viewer.verified ? await getShellCounts(viewer) : { notifications: 0, conversations: 0 };
  const menu = (
    <UserMenu
      pseudonym={viewer.pseudonym ?? "Mitglied"}
      isStaff={viewer.isStaff}
      notifications={counts.notifications}
      placement={placement}
    />
  );
  if (placement === "topbar") return menu;
  return (
    <>
      <DisplaySync
        prefs={{
          theme: viewer.prefs.theme,
          textScale: viewer.prefs.textScale,
          motion: viewer.prefs.motion,
          simple: viewer.prefs.simpleView,
        }}
      />
      <SessionWatch />
      <div className="flex flex-col gap-0.5">
        <SideNavLink
          href="/community/gespraeche"
          icon="chat"
          badge={<CountBadge value={counts.conversations} label="Gespräche mit neuen Nachrichten" />}
        >
          Gespräche
        </SideNavLink>
        <SideNavLink
          href="/mitteilungen"
          icon="bell"
          badge={<CountBadge value={counts.notifications} label="ungelesene Hinweise" />}
        >
          Mitteilungen
        </SideNavLink>
        <SideNavLink href="/gespeichert" icon="bookmark">
          Gespeichert
        </SideNavLink>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-6">{menu}</div>
    </>
  );
}

/**
 * Mobil: Nachrichtenindikator führt direkt zu den Gesprächen, Glocke zu den Mitteilungen (PRD 04
 * «Informationsarchitektur»). Touchflächen 44 × 44px (A03); Anzahl als Text für Screenreader.
 */
async function MobileCounts() {
  const viewer = await getViewer();
  if (!viewer?.verified) return null;
  const counts = await getShellCounts(viewer);
  const items = [
    { href: "/community/gespraeche", icon: "chat" as const, count: counts.conversations, label: "Gespräche", unread: "mit neuen Nachrichten" },
    { href: "/mitteilungen", icon: "bell" as const, count: counts.notifications, label: "Mitteilungen", unread: "ungelesen" },
  ];
  return (
    <>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="relative inline-flex size-[44px] shrink-0 items-center justify-center rounded-[11px] text-ink hover:bg-sunk"
          aria-label={i.count > 0 ? `${i.label}, ${i.count} ${i.unread}` : i.label}
        >
          <Icon name={i.icon} className="size-5" />
          {i.count > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent" aria-hidden="true" />}
        </Link>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      {/* Seitenleiste – Desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-bg px-4 py-6 lg:flex">
        <div className="px-1 pb-8">
          <Logo href="/heute" />
        </div>
        <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col">
          <p className="eyebrow mb-2 px-3 !text-[0.75rem]" aria-hidden="true">Bereiche</p>
          <ul className="flex flex-col gap-0.5">
            {MAIN_NAV.map((n) => (
              <li key={n.href}>
                <SideNavLink href={n.href} icon={n.icon as NavIcon}>
                  {n.label}
                </SideNavLink>
              </li>
            ))}
          </ul>
          <p className="eyebrow mb-2 mt-8 px-3 !text-[0.75rem]" aria-hidden="true">Persönlich</p>
          <Suspense fallback={<div className="flex flex-col gap-1" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-[12px] bg-sunk/60" />)}</div>}>
            <ShellUser placement="sidebar" />
          </Suspense>
          <Link
            href="/sicherheit"
            className="mt-3 flex items-center gap-3 rounded-[12px] border border-line px-3 py-3 text-sm font-semibold text-danger hover:border-danger/40 hover:bg-danger-soft"
          >
            <Icon name="lifebuoy" className="size-5" />
            Sicherheit und akute Hilfe
          </Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <DemoBanner />
        {/* Kopfzeile – Mobil */}
        {/* Ab 320px ohne horizontales Scrollen (A02): Bedienelemente in festen 44px, Wortmarke weicht zuerst. */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-line bg-bg px-4 lg:hidden">
          <Logo href="/heute" className="min-w-0 shrink overflow-hidden max-[419px]:[&>span]:sr-only" />
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/sicherheit"
              className="inline-flex h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-[11px] px-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              <Icon name="lifebuoy" className="size-5" />
              <span className="sr-only sm:not-sr-only">Akute Hilfe</span>
            </Link>
            <Suspense fallback={<div className="h-[44px] w-[92px]" />}>
              <MobileCounts />
            </Suspense>
            <Suspense fallback={<div className="size-[44px] rounded-[11px] bg-sunk" />}>
              <ShellUser placement="topbar" />
            </Suspense>
          </div>
        </header>

        <main id="inhalt" className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-14 lg:pb-20 lg:pt-14">
          {children}
        </main>
      </div>

      {/* Untere Navigation – Mobil */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {MAIN_NAV.map((n) => (
            <li key={n.href} className="flex flex-1">
              <BottomNavLink href={n.href} icon={n.icon as NavIcon}>
                {n.label}
              </BottomNavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
