"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DISCARD_DRAFTS_EVENT } from "@/components/ui/form";
import { keepAliveAction } from "@/server/modules/account/auth-actions";

/**
 * Vorwarnung vor automatischer Abmeldung nach 60 Minuten Inaktivität (ACC03).
 * Nach Ablauf werden geschützte Ansichten verworfen und es erscheint S61.
 */
const IDLE_MS = 60 * 60 * 1000;

/**
 * Abmelden ohne Rückfrage zu Entwürfen: Auf einem öffentlichen Gerät dürfen private Eingaben nach
 * Ablauf nicht sichtbar bleiben (PRD 04). Die harte Navigation zum Route Handler verwirft
 * zusätzlich alle geschützten Ansichten im Client-Cache.
 */
function expireNow() {
  document.dispatchEvent(new Event(DISCARD_DRAFTS_EVENT));
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/api/v1/auth/expire");
}
const WARN_BEFORE_MS = 5 * 60 * 1000;

export function SessionWatch() {
  const router = useRouter();
  const pathname = usePathname();
  const lastActivity = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const [warn, setWarn] = useState(false);
  const [pending, startTransition] = useTransition();

  // Aktivität in einem Tab gilt für alle Tabs derselben Sitzung: sonst würde ein ruhender Tab
  // die Sitzung beenden, während in einem anderen gearbeitet wird. Übertragen wird nur «aktiv».
  const touch = () => {
    lastActivity.current = Date.now();
    channel.current?.postMessage("active");
  };

  // Jede Navigation ist eine Serveranfrage und verlängert die Sitzung.
  useEffect(() => {
    touch();
  }, [pathname]);

  useEffect(() => {
    lastActivity.current = Date.now();
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("ms-session-activity");
      channel.current.onmessage = () => {
        lastActivity.current = Date.now();
        setWarn(false);
      };
    }
    const onSubmit = () => touch();
    document.addEventListener("submit", onSubmit, true);
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) {
        window.clearInterval(timer);
        expireNow();
      } else if (idle >= IDLE_MS - WARN_BEFORE_MS) {
        setWarn(true);
      }
    }, 15_000);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("submit", onSubmit, true);
      channel.current?.close();
      channel.current = null;
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
        <Button variant="secondary" onClick={expireNow}>
          Jetzt abmelden
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await keepAliveAction();
              touch();
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
