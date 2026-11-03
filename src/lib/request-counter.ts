/**
 * Anfrage- und Fehlerzähler je Prozess (NFR16 «Fehlerquote»). Bewusst ohne Datenbank und ohne
 * Abhängigkeiten, damit ihn auch proxy.ts nutzen kann. Über globalThis geteilt, weil Proxy und
 * App in getrennten Bundles, aber im selben Node-Prozess laufen. Nur Zahlen, keine Pfade/Inhalte.
 */
type Counter = { requests: number; errors: number };

const store = globalThis as typeof globalThis & { __msRequestCounter?: Counter };

function counter(): Counter {
  store.__msRequestCounter ??= { requests: 0, errors: 0 };
  return store.__msRequestCounter;
}

export function countRequest() {
  counter().requests += 1;
}

export function countServerError() {
  counter().errors += 1;
}

/** Liefert den Stand seit dem letzten Aufruf und setzt zurück. */
export function takeCounts(): Counter {
  const c = counter();
  const out = { requests: c.requests, errors: c.errors };
  c.requests = 0;
  c.errors = 0;
  return out;
}

/** NFR16: Alarm bei mehr als 2 % Serverfehlern über das Fenster, erst ab einer Mindestmenge. */
export const ERROR_RATE_THRESHOLD = 0.02;
export const ERROR_RATE_MIN_REQUESTS = 50;

export function errorRatePercent(requests: number, errors: number): number | null {
  if (requests < ERROR_RATE_MIN_REQUESTS) return null;
  const rate = errors / requests;
  return rate > ERROR_RATE_THRESHOLD ? Math.round(rate * 1000) / 10 : null;
}
