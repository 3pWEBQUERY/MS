"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Aktualisiert den Status ruhig im Hintergrund (alle 5 Sekunden, höchstens 10 Minuten),
 * ohne Animation als Statusträger. Manuelles Aktualisieren bleibt möglich.
 */
export function ExportAutoRefresh() {
  const router = useRouter();
  const [stopped, setStopped] = useState(false);
  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > 10 * 60 * 1000) {
        clearInterval(t);
        setStopped(true);
        return;
      }
      router.refresh();
    }, 5000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-base text-ink-2">
        {stopped
          ? "Das dauert länger als üblich. Du kannst die Seite schliessen – der Export läuft weiter und erscheint unter «Daten und Konto»."
          : "Diese Seite aktualisiert sich selbst. Du kannst sie auch schliessen – der Export läuft weiter."}
      </p>
      <Button variant="ghost" icon={<Icon name="undo" className="size-5" />} onClick={() => router.refresh()}>
        Status aktualisieren
      </Button>
    </div>
  );
}
