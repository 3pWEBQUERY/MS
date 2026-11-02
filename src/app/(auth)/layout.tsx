import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ConnectionWeb } from "@/components/three";
import { Icon } from "@/components/ui/icon";

/**
 * Konto-Einstieg (S02–S06): eine Hauptaktion pro Ansicht, ruhige Fläche.
 * Die Visualisierung ist rein dekorativ und auf schmalen Bildschirmen ausgeblendet.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col">
        <header className="flex h-[72px] items-center justify-between px-4 sm:px-8">
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
        <footer className="flex flex-wrap gap-x-5 gap-y-2 px-4 pb-6 text-sm text-ink-2 sm:px-8">
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
        <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-[28px] bg-sunk">
          <div className="absolute inset-0">
            <ConnectionWeb className="size-full" />
          </div>
          <div className="relative m-3 flex flex-col gap-2 rounded-[20px] bg-surface p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">Austausch mit Zustimmung</p>
            <p className="text-xl font-[650] leading-snug text-ink">
              Nachrichten erst nach gegenseitiger Freigabe. Dein Tagebuch sieht nur du.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
