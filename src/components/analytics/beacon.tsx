"use client";

import { useEffect } from "react";
import type { AnalyticsEvent } from "@/lib/analytics";

/**
 * Optionale Nutzungsstatistik (PRD 15). Sendet nur Ereignisname und erlaubte Parameter – nie
 * Pfad, Titel, Suchtext oder IDs. Der Server speichert nur mit gültiger Einwilligung; Fehler
 * bleiben ohne Wirkung auf die Bedienung.
 */
export function sendAnalytics(event: AnalyticsEvent): void {
  try {
    void fetch("/api/v1/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Ohne fetch (alte Browser) wird nichts erfasst.
  }
}

/** Meldet ein Ereignis einmal nach dem Anzeigen (nicht beim Vorabruf). */
export function AnalyticsBeacon({ event }: { event: AnalyticsEvent }) {
  const key = JSON.stringify(event);
  useEffect(() => {
    sendAnalytics(JSON.parse(key) as AnalyticsEvent);
  }, [key]);
  return null;
}
