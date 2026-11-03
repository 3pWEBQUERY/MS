import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FiberField } from "@/components/three";
import { Icon } from "@/components/ui/icon";

/**
 * Konto-Einstieg (S02–S06): eine Hauptaktion pro Ansicht, ruhige Fläche.
 * Die Visualisierung ist rein dekorativ und auf schmalen Bildschirmen ausgeblendet.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col">
        <header className="flex h-[76px] items-center justify-between px-4 sm:px-8 lg:px-12">
          <Logo />
          <Link
            href="/sicherheit"
            className="inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <Icon name="lifebuoy" className="size-4" />
            Akute Hilfe
          </Link>
        </header>
        <main id="inhalt" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:px-8 sm:pt-12 lg:items-center lg:pt-0">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>
        <footer className="flex flex-wrap gap-x-5 gap-y-2 px-4 pb-6 text-sm text-ink-2 sm:px-8 lg:px-12">
          <Link href="/datenschutz" className="hover:text-ink hover:underline">
            Datenschutz
          </Link>
          <Link href="/bedingungen" className="hover:text-ink hover:underline">
            Nutzungsbedingungen
          </Link>
          <Link href="/wissen" className="hover:text-ink hover:underline">
            Wissen ohne Konto lesen
          </Link>
          <Link href="/kontakt" className="hover:text-ink hover:underline">
            Kontakt
          </Link>
        </footer>
      </div>
      <aside className="sticky top-0 hidden h-dvh p-3 lg:block" aria-hidden="true">
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] bg-deep p-10 text-on-deep xl:p-14">
          <p className="eyebrow relative !text-on-deep-2">
            <span className="index !text-deep-accent">MS</span> Austausch mit Zustimmung
          </p>
          <div className="absolute inset-x-0 top-1/2 h-[46%] -translate-y-1/2">
            <FiberField tone="deep" className="size-full" />
          </div>
          <p className="display-md relative max-w-lg !text-on-deep [&_em]:!text-deep-accent">
            Nachrichten erst nach gegenseitiger Freigabe. Dein Tagebuch sieht <em>nur du.</em>
          </p>
        </div>
      </aside>
    </div>
  );
}
