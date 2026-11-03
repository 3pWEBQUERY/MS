import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Gemeinsame Hilfen der versionierten API (PRD 14 «API-Vertrag»). Privater Ordner (_lib) –
 * erzeugt keine Route.
 */

/** CSRF-Schutz für Route Handler: Origin muss zum Host passen. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Korrelations-ID aus dem Proxy (X-Request-Id) oder neu erzeugt – für Fehlermeldungen ohne private Details. */
export function correlationId(req: Pick<NextRequest, "headers">): string {
  const id = req.headers.get("x-request-id");
  return id && /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : randomUUID();
}
