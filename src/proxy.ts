import { NextResponse, type NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !request.cookies.has(COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/anmelden";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ms-path", pathname + search);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

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
