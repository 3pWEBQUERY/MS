/**
 * Eigenständiger Hilfe-Dienst (NFR20, SAF06, AT10): liefert die Sicherheitsseite als statisches
 * HTML aus – unabhängig von Next.js, ohne Anmeldung, ohne JavaScript im Browser.
 *
 * Eigener Railway-Service «hilfe» (Start: `npm run help:serve`). Die gepflegten Kontakte werden
 * beim Start und danach alle 10 Minuten LESEND aus content.safety_contacts geladen; ist die
 * Datenbank nicht erreichbar oder leer, gilt die statische Notrufliste. Die zuletzt erfolgreich
 * geladene Liste bleibt bei späteren Störungen bestehen.
 */
import { createServer } from "node:http";
import postgres from "postgres";
import { STATIC_SAFETY_CONTACTS, type SafetyContact } from "@/lib/safety-static";
import { site } from "@/lib/site";
import { renderHelpPage } from "./render";

const PORT = Number(process.env.PORT ?? 3300);
const REFRESH_MS = 10 * 60 * 1000;
const platformUrl = process.env.PLATFORM_URL ?? process.env.APP_URL ?? null;

let current: { html: string; source: "database" | "fallback" } = render(STATIC_SAFETY_CONTACTS, "fallback");

function render(contacts: SafetyContact[], source: "database" | "fallback") {
  return {
    source,
    html: renderHelpPage({ contacts, source, moderationHours: site.moderationHours, platformUrl, generatedAt: new Date() }),
  };
}

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 30, connect_timeout: 5, onnotice: () => {} })
  : null;

async function refresh() {
  if (!sql) return;
  try {
    const rows = await sql<
      { id: string; name: string; description: string; phone: string | null; url: string | null; availability: string; region: string; verified_at: Date | null; verified_by: string | null }[]
    >`select id, name, description, phone, url, availability, region, verified_at, verified_by
      from content.safety_contacts where active = true order by sort, name`;
    if (rows.length === 0) {
      // Nur auf den Rückfall wechseln, wenn noch nie eine gepflegte Liste geladen wurde.
      if (current.source !== "database") current = render(STATIC_SAFETY_CONTACTS, "fallback");
      return;
    }
    current = render(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        phone: r.phone,
        url: r.url,
        availability: r.availability,
        region: r.region,
        verifiedAt: r.verified_at ? r.verified_at.toISOString() : null,
        verifiedBy: r.verified_by,
      })),
      "database",
    );
  } catch (err) {
    // Datenbankstörung: zuletzt bekannte Liste behalten (nur Fehlercode protokollieren, NFR15).
    console.error(`[hilfe] Aktualisierung fehlgeschlagen: ${(err as { code?: string }).code ?? "error"}`);
  }
}

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

const server = createServer((req, res) => {
  const path = (req.url ?? "/").split("?")[0];
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  if (path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify({ status: "ok", source: current.source }));
    return;
  }
  if (path === "/" || path === "/sicherheit") {
    res.writeHead(200, HEADERS).end(req.method === "HEAD" ? undefined : current.html);
    return;
  }
  res.writeHead(302, { Location: "/" }).end();
});

void refresh();
const timer = setInterval(() => void refresh(), REFRESH_MS);

server.listen(PORT, () => console.log(`[hilfe] bereit auf Port ${PORT}`));

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    clearInterval(timer);
    server.close();
    void sql?.end({ timeout: 2 });
  });
}
