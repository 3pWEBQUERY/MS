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
      {/* Reflow (A02): bei schmaler Breite oder vergrösserter Schrift nur im Menü */}
      <span className="hidden md:contents">
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
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
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
    <footer className="bg-deep text-on-deep">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <p className="display-lg max-w-4xl !text-on-deep [&_em]:!text-deep-accent">
          Ruhig. Freiwillig. <em>In deinem Tempo.</em>
        </p>
        <div className="mt-16 grid gap-10 border-t border-deep-line pt-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex max-w-sm flex-col gap-4">
            <p className="text-base text-on-deep-2">{site.description}</p>
            <p className="text-sm text-on-deep-2">
              Kein Notfalldienst. Bei akuter Gefahr: Sanitätsnotruf <strong className="text-on-deep">144</strong>.
            </p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title} className="flex flex-col gap-3">
              <p className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-on-deep-2">{g.title}</p>
              <ul className="flex flex-col gap-1">
                {g.links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-9 items-center text-base text-on-deep underline decoration-transparent underline-offset-[0.25em] transition-colors duration-150 hover:decoration-current"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-deep-line pt-6 font-display font-extrabold text-xs uppercase tracking-[0.1em] text-on-deep-2 sm:flex-row sm:justify-between">
          <p>© 2026 {site.name} · Deutschschweiz</p>
          <p>Keine Werbung · Kein Datenverkauf · Keine Tracker</p>
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
