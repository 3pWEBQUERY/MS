import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { DisplaySync } from "@/components/shell/display";
import { SessionWatch } from "@/components/shell/session-watch";
import { Icon } from "@/components/ui/icon";
import { getViewer } from "@/server/auth/viewer";
import { logoutAction } from "@/server/modules/account/auth-actions";
import { openP0Count } from "@/server/modules/moderation/cases";
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
  const moderation = viewer.roles.includes("moderator") || viewer.roles.includes("moderation_lead");
  const p0 = moderation ? await openP0Count(viewer) : 0;
  const items: AdminNavItem[] = sectionsFor(viewer.roles).map((s) => ({
    href: s.href,
    label: s.label,
    icon: s.icon,
    exact: s.exact,
    group: s.group,
    alert: s.href === "/verwaltung/moderation" && p0 > 0 ? { count: p0, label: p0 === 1 ? "offener Fall mit akuter Gefahr" : "offene Fälle mit akuter Gefahr" } : undefined,
  }));
  return { items, pseudonym: viewer.pseudonym ?? "Mitarbeitende Person", roles: viewer.roles };
}

function LogoutButton({ compact }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          compact
            ? "inline-flex h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[11px] px-2.5 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink"
            : "flex h-12 w-full items-center gap-3 rounded-[12px] px-3 text-base font-semibold text-ink-2 transition-colors duration-150 hover:bg-sunk/60 hover:text-ink"
        }
      >
        <Icon name="logout" className="size-5 shrink-0" />
        <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Abmelden</span>
      </button>
    </form>
  );
}

function SidebarExtras({ nav }: { nav: NonNullable<Awaited<ReturnType<typeof loadNav>>> }) {
  return (
    <>
      <SessionWatch />
      <AdminNavList items={nav.items} />
      <div className="mt-auto flex flex-col gap-0.5 pt-8">
        <div className="mb-3 border-t border-line px-3 pt-4">
          <p className="truncate text-sm font-semibold text-ink">{nav.pseudonym}</p>
          <p className="text-sm text-ink-2">{nav.roles.map((r) => ROLE_LABEL[r]).join(", ")}</p>
        </div>
        <Link
          href="/heute"
          className="group flex h-12 items-center gap-3 rounded-[12px] px-3 text-base font-semibold text-ink-2 transition-colors duration-150 hover:bg-sunk/60 hover:text-ink"
        >
          <Icon name="arrow-left" className="size-5 shrink-0" />
          Zur Plattform
        </Link>
        <LogoutButton />
      </div>
    </>
  );
}

function MobileExtras({ nav }: { nav: NonNullable<Awaited<ReturnType<typeof loadNav>>> }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/heute"
        className="inline-flex h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[11px] px-2.5 text-sm font-semibold text-ink-2 hover:bg-sunk hover:text-ink"
      >
        <Icon name="arrow-left" className="size-5" />
        <span className="sr-only md:not-sr-only">Zur Plattform</span>
      </Link>
      <LogoutButton compact />
      <AdminMobileNav items={nav.items} />
    </div>
  );
}

/**
 * Seitenleiste (Desktop) und Kopfzeile (Mobil) entstehen aus EINER Suspense-Grenze und
 * einer Datenabfrage. So ist die Streaming-Reihenfolge deterministisch (keine
 * Hydration-Abweichung durch parallel aufgelöste Grenzen).
 */
function Chrome({ nav }: { nav: Awaited<ReturnType<typeof loadNav>> | undefined }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-bg px-4 py-6 lg:flex">
        <div className="px-1 pb-8">
          <Brand />
        </div>
        <nav aria-label="Verwaltungsbereiche" className="flex flex-1 flex-col">
          {nav === undefined ? (
            <div className="flex flex-col gap-1 pt-7" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-[12px] bg-sunk/60" />
              ))}
            </div>
          ) : nav ? (
            <SidebarExtras nav={nav} />
          ) : null}
        </nav>
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg px-4 lg:hidden">
        <Brand />
        {nav === undefined ? <div className="size-10" /> : nav ? <MobileExtras nav={nav} /> : null}
      </header>
    </>
  );
}

async function LoadedChrome() {
  const nav = await loadNav();
  return <Chrome nav={nav} />;
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
    // WCAG 2.5.3: Der zugängliche Name enthält die sichtbare Beschriftung (kein abweichendes aria-label).
    <Link href="/verwaltung" className="inline-flex h-11 items-center gap-2.5 rounded-[12px] pr-2 text-ink">
      <LogoMark />
      <span className="flex flex-col gap-0.5 leading-tight">
        <span className="text-[1.0625rem] font-bold tracking-[-0.02em]">MS Plattform</span>
        <span className="sr-only"> </span>
        <span className="font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.14em] text-accent-ink">Verwaltung</span>
        <span className="sr-only"> – Übersicht</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <Suspense fallback={<Chrome nav={undefined} />}>
        <LoadedChrome />
      </Suspense>

      <div className="flex min-w-0 flex-col">
        <Suspense fallback={null}>
          <Display />
        </Suspense>
        <div className="border-b border-line px-4 py-2.5 sm:px-6 lg:px-12">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <Icon name="lock" className="size-4 shrink-0 text-accent-ink" />
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
