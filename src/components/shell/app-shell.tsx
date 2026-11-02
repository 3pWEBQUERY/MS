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
      <div className="flex flex-col gap-1">
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

async function MobileCounts() {
  const viewer = await getViewer();
  if (!viewer?.verified) return null;
  const counts = await getShellCounts(viewer);
  const total = counts.notifications;
  return (
    <Link
      href="/mitteilungen"
      className="relative inline-flex size-10 items-center justify-center rounded-[10px] text-ink hover:bg-sunk"
      aria-label={total > 0 ? `Mitteilungen, ${total} ungelesen` : "Mitteilungen"}
    >
      <Icon name="bell" className="size-5" />
      {total > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent" aria-hidden="true" />}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      {/* Seitenleiste – Desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="px-1 pb-6">
          <Logo href="/heute" />
        </div>
        <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col">
          <ul className="flex flex-col gap-1">
            {MAIN_NAV.map((n) => (
              <li key={n.href}>
                <SideNavLink href={n.href} icon={n.icon as NavIcon}>
                  {n.label}
                </SideNavLink>
              </li>
            ))}
          </ul>
          <div className="my-5 border-t border-line" />
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-bg px-4 lg:hidden">
          <Logo href="/heute" />
          <div className="flex items-center gap-1">
            <Link
              href="/sicherheit"
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              <Icon name="lifebuoy" className="size-5" />
              <span className="sr-only sm:not-sr-only">Akute Hilfe</span>
            </Link>
            <Suspense fallback={<div className="size-10" />}>
              <MobileCounts />
            </Suspense>
            <Suspense fallback={<div className="size-10 rounded-[10px] bg-sunk" />}>
              <ShellUser placement="topbar" />
            </Suspense>
          </div>
        </header>

        <main id="inhalt" className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-12 lg:pb-16 lg:pt-12">
          {children}
        </main>
      </div>

      {/* Untere Navigation – Mobil */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 lg:hidden"
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
