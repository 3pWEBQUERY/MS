import { NextResponse, type NextRequest } from "next/server";
import { countRequest } from "@/lib/request-counter";

/**
 * Optimistische Vorprüfung (nur Cookie-Existenz). Die verbindliche Rechteprüfung
 * erfolgt serverseitig nahe am Datenzugriff (src/server/auth/viewer.ts).
 */
const PROTECTED = [
  "/heute",
  "/willkommen",
  "/mein-ms",
  "/community",
  "/gespeichert",
  "/mitteilungen",
  "/profil",
  "/konto",
  "/melden",
  "/meldungen",
  "/verwaltung",
];

const COOKIE = process.env.NODE_ENV === "production" ? "__Host-ms_session" : "ms_session";

/** Korrelations-ID je Anfrage (PRD 14 «API-Vertrag»): übernommen, wenn gültig, sonst neu. */
function requestId(request: NextRequest): string {
  const incoming = request.headers.get("x-request-id");
  return incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
}

export function proxy(request: NextRequest) {
  countRequest(); // NFR16: Nenner der Fehlerquote (nur Anzahl)
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !request.cookies.has(COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/anmelden";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const rid = requestId(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ms-path", pathname + search);
  requestHeaders.set("x-request-id", rid);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Request-Id", rid);

  if (isProtected) {
    // Geschützte Inhalte nie in gemeinsam genutzten Caches (PRD 11, PRD 14).
    response.headers.set("Cache-Control", "private, no-store");
  }
  if (pathname.startsWith("/email-bestaetigen") || pathname.startsWith("/passwort-zuruecksetzen")) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|fonts/|medien/|api/v1/health).*)"],
};
