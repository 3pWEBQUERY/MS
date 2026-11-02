import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { DisplaySync } from "@/components/shell/display";
import { SessionWatch } from "@/components/shell/session-watch";
import { Icon } from "@/components/ui/icon";
import { getViewer } from "@/server/auth/viewer";
import { logoutAction } from "@/server/modules/account/auth-actions";
import { AdminMobileNav, AdminNavList, type AdminNavItem } from "./admin-nav";
import { ROLE_LABEL, type StaffRoleKey } from "./labels";
import { sectionsFor } from "./sections";

/**
 * Eigenes, ruhiges Layout für den geschützten Verwaltungsbereich (S52–S60, PRD 05).
 * Kein gemeinsamer Admin-Login: jede Person arbeitet mit dem eigenen Konto und MFA.
 * Die Navigation zeigt nur berechtigte Bereiche; jede Seite prüft zusätzlich selbst.
 */
async function loadNav(): Promise<{ items: AdminNavItem[]; pseudonym: string; roles: StaffRoleKey[] } | null> {
  const viewer = await getViewer();
  // Ohne Rolle oder ohne bestätigte MFA wird keine Navigation gezeigt; die Seite leitet um bzw. antwortet neutral.
  if (!viewer || !viewer.isStaff || !viewer.mfaVerified) return null;
  const items = sectionsFor(viewer.roles).map((s) => ({ href: s.href, label: s.label, icon: s.icon, exact: s.exact }));
  return { items, pseudonym: viewer.pseudonym ?? "Mitarbeitende Person", roles: viewer.roles };
}

function LogoutButton({ compact }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          compact
            ? "inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink"
            : "flex h-12 w-full items-center gap-3 rounded-[12px] px-3 text-base font-semibold text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
        }
      >
        <Icon name="logout" className="size-5 shrink-0" />
        <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Abmelden</span>
      </button>
    </form>
  );
}

async function SidebarNav() {
  const nav = await loadNav();
  if (!nav) return null;
  return (
    <>
      <SessionWatch />
      <AdminNavList items={nav.items} />
      <div className="mt-auto flex flex-col gap-1 pt-6">
        <div className="mb-2 rounded-[12px] bg-sunk px-3 py-3">
          <p className="truncate text-sm font-semibold text-ink">{nav.pseudonym}</p>
          <p className="text-sm text-ink-2">{nav.roles.map((r) => ROLE_LABEL[r]).join(", ")}</p>
        </div>
        <Link
          href="/heute"
          className="flex h-12 items-center gap-3 rounded-[12px] px-3 text-base font-semibold text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
        >
          <Icon name="arrow-left" className="size-5 shrink-0" />
          Zur Plattform
        </Link>
        <LogoutButton />
      </div>
    </>
  );
}

async function MobileNav() {
  const nav = await loadNav();
  if (!nav) return null;
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/heute"
        className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink"
      >
        <Icon name="arrow-left" className="size-5" />
        <span className="sr-only sm:not-sr-only">Zur Plattform</span>
      </Link>
      <LogoutButton compact />
      <AdminMobileNav items={nav.items} />
    </div>
  );
}

async function Display() {
  const viewer = await getViewer();
  if (!viewer) return null;
  return (
    <DisplaySync
      prefs={{
        theme: viewer.prefs.theme,
        textScale: viewer.prefs.textScale,
        motion: viewer.prefs.motion,
        simple: viewer.prefs.simpleView,
      }}
    />
  );
}

function Brand() {
  return (
    <Link href="/verwaltung" className="inline-flex h-11 items-center gap-2.5 rounded-[12px] pr-2 text-ink" aria-label="Verwaltung – Übersicht">
      <LogoMark />
      <span className="flex flex-col leading-tight">
        <span className="text-[1.0625rem] font-bold tracking-[-0.02em]">MS Plattform</span>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">Verwaltung</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="px-1 pb-6">
          <Brand />
        </div>
        <nav aria-label="Verwaltungsbereiche" className="flex flex-1 flex-col">
          <Suspense
            fallback={
              <div className="flex flex-col gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-[12px] bg-sunk/60" />
                ))}
              </div>
            }
          >
            <SidebarNav />
          </Suspense>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <Suspense fallback={null}>
          <Display />
        </Suspense>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg px-4 lg:hidden">
          <Brand />
          <Suspense fallback={<div className="size-10" />}>
            <MobileNav />
          </Suspense>
        </header>
        <div className="border-b border-line bg-sunk px-4 py-2.5 sm:px-6 lg:px-12">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <Icon name="lock" className="size-4 shrink-0" />
            Geschützter Bereich – alle Zugriffe werden protokolliert.
          </p>
        </div>
        <main id="inhalt" className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-12 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
