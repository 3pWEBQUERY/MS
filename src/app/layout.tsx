import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { displayBootScript } from "@/lib/display-prefs";
import { site } from "@/lib/site";
import "./globals.css";

/** Atkinson Hyperlegible Next – entwickelt für bessere Lesbarkeit bei Sehbeeinträchtigung. */
const atkinson = localFont({
  src: [
    { path: "./fonts/ahn-latin.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/ahn-latin-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-atkinson",
  // NFR03: «optional» statt «swap» – kein nachträglicher Schriftwechsel, der Text verschiebt (CLS).
  // Die Schrift wird vorgeladen; nur bei sehr langsamem Erstaufruf bleibt die metrisch angepasste
  // Ersatzschrift, ab dem nächsten Seitenaufruf gilt Atkinson aus dem Cache (Mobil-Labortest: CLS 0,25 → 0).
  display: "optional",
});

const atkinsonMono = localFont({
  src: [
    { path: "./fonts/ahm-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ahm-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-atkinson-mono",
  display: "optional",
});

export const metadata: Metadata = {
  title: { default: `${site.name} – Leben mit MS in der Schweiz`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1012" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de-CH" className={`${atkinson.variable} ${atkinsonMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: displayBootScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#inhalt"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-[12px] bg-ink px-4 py-3 font-semibold text-ink-inverse focus-visible:translate-y-0"
        >
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
