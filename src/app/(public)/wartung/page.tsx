import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Eingeschränkter Betrieb", robots: { index: false } };

/** S61 Wartung / Teilbetrieb (HOM08): Hilfe bleibt erreichbar. */
export default function MaintenancePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-20">
      <h1 className="text-4xl font-[650] tracking-[-0.03em]">Einige Funktionen sind gerade eingeschränkt.</h1>
      <p className="text-lg text-ink-2">
        Wir arbeiten an einer Störung. Bestehende Daten bleiben erhalten. Es werden keine Aktionen angenommen, die nicht
        tatsächlich gespeichert werden können.
      </p>
      <Notice tone="danger" title="Akute Hilfe ist immer erreichbar">
        <Link href="/sicherheit">Sicherheit und akute Hilfe öffnen</Link> – ohne Anmeldung.
      </Notice>
    </div>
  );
}
