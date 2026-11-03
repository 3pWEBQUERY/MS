/**
 * Automatische Linkprüfung (CON05 «ergänzend», QA06) – reine Hilfsfunktionen ohne Serverabhängigkeiten.
 * Geprüft werden nur öffentliche https-Adressen; interne Hosts und private Adressbereiche sind
 * ausgeschlossen (NFR12, SSRF). Ein Fehlschlag setzt nur einen Prüfhinweis – nie eine Publikation.
 */

const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

export function isCheckableUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !PRIVATE_V4.some((re) => re.test(host));
  if (host.startsWith("[")) return false; // IPv6-Literale nicht prüfen
  return true;
}

/** Nur eindeutige Fehler führen zu einem Hinweis; vorübergehende Störungen (5xx, Zeitüberschreitung) nicht. */
export function linkProblem(result: { status?: number; error?: string }): string | null {
  if (result.error === "dns") return "Adresse nicht auflösbar";
  if (result.status === 404 || result.status === 410) return `Seite nicht gefunden (HTTP ${result.status})`;
  return null;
}
