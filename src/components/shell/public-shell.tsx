import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PUBLIC_NAV, site } from "@/lib/site";
import { getViewer } from "@/server/auth/viewer";
import { TopNavLink } from "./nav-link";
import { DemoBanner } from "./demo-banner";
import { PublicMobileMenu } from "./public-mobile-menu";

async function HeaderAuth() {
  const viewer = await getViewer();
  if (viewer) {
    return (
      <ButtonLink href="/heute" size="sm" variant="primary" iconRight={<Icon name="arrow-right" className="size-4" />}>
        Zu «Heute»
      </ButtonLink>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:contents">
        <ButtonLink href="/anmelden" size="sm" variant="ghost">
          Anmelden
        </ButtonLink>
      </span>
      <ButtonLink href="/registrieren" size="sm" variant="primary">
        Registrieren
      </ButtonLink>
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Hauptbereiche" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {PUBLIC_NAV.map((n) => (
                <li key={n.href}>
                  <TopNavLink href={n.href}>{n.label}</TopNavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sicherheit"
            className="hidden h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-danger hover:bg-danger-soft md:inline-flex"
          >
            <Icon name="lifebuoy" className="size-4" />
            Akute Hilfe
          </Link>
          <Suspense fallback={<div className="h-10 w-36 rounded-[10px] bg-sunk" aria-hidden="true" />}>
            <HeaderAuth />
          </Suspense>
          <Suspense fallback={<div className="size-10 lg:hidden" />}>
            <PublicMobileMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const groups = [
    {
      title: "Plattform",
      links: [
        ["/wissen", "Wissen"],
        ["/hilfe", "Hilfe finden"],
        ["/registrieren", "Mitglied werden"],
        ["/anmelden", "Anmelden"],
      ],
    },
    {
      title: "Sicherheit",
      links: [
        ["/sicherheit", "Sicherheit und akute Hilfe"],
        ["/regeln", "Community-Regeln"],
        ["/barrierefreiheit", "Barrierefreiheit"],
        ["/anzeige", "Anzeige und Bedienung"],
      ],
    },
    {
      title: "Rechtliches",
      links: [
        ["/datenschutz", "Datenschutz"],
        ["/bedingungen", "Nutzungsbedingungen"],
        ["/impressum", "Impressum"],
        ["/kontakt", "Kontakt und Fehler melden"],
      ],
    },
  ];
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="flex max-w-sm flex-col gap-4">
          <Logo />
          <p className="text-base text-ink-2">{site.description}</p>
          <p className="text-sm text-ink-2">
            Kein Notfalldienst. Bei akuter Gefahr: Sanitätsnotruf <strong className="text-ink">144</strong>.
          </p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title} className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">{g.title}</p>
            <ul className="flex flex-col gap-1">
              {g.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-9 items-center text-base text-ink hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-ink-2 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 {site.name} · Deutschschweiz</p>
          <p>Keine Werbung. Kein Datenverkauf. Keine Tracker.</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <PublicHeader />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
