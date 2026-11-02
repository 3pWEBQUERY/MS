"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { keepAliveAction } from "@/server/modules/account/auth-actions";

/**
 * Vorwarnung vor automatischer Abmeldung nach 60 Minuten Inaktivität (ACC03).
 * Nach Ablauf werden geschützte Ansichten verworfen und es erscheint S61.
 */
const IDLE_MS = 60 * 60 * 1000;
const WARN_BEFORE_MS = 5 * 60 * 1000;

export function SessionWatch() {
  const router = useRouter();
  const pathname = usePathname();
  const lastActivity = useRef(0);
  const [warn, setWarn] = useState(false);
  const [pending, startTransition] = useTransition();

  // Jede Navigation ist eine Serveranfrage und verlängert die Sitzung.
  useEffect(() => {
    lastActivity.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    lastActivity.current = Date.now();
    const onSubmit = () => (lastActivity.current = Date.now());
    document.addEventListener("submit", onSubmit, true);
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) {
        window.clearInterval(timer);
        window.location.assign("/api/v1/auth/expire");
      } else if (idle >= IDLE_MS - WARN_BEFORE_MS) {
        setWarn(true);
      }
    }, 15_000);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [router]);

  return (
    <Dialog
      open={warn}
      onClose={() => setWarn(false)}
      title="Du wirst bald abgemeldet"
      description="Zu deinem Schutz endet die Sitzung nach 60 Minuten ohne Aktivität. Nicht gespeicherte Eingaben gehen dabei verloren."
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => window.location.assign("/api/v1/auth/expire")}>
          Jetzt abmelden
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await keepAliveAction();
              lastActivity.current = Date.now();
              setWarn(false);
            })
          }
        >
          Angemeldet bleiben
        </Button>
      </div>
    </Dialog>
  );
}
