/**
 * Serverseitige Instrumentierung (Next.js instrumentation.ts): zählt Serverfehler für die
 * Fehlerquote (NFR16) und startet das minütliche Wegschreiben der Zähler. Keine Inhalte, keine
 * Pfade mit Parametern – nur Anzahlen (NFR15).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startRequestMetrics } = await import("./server/ops/request-metrics");
    startRequestMetrics();
  }
}

export async function onRequestError() {
  const { countServerError } = await import("./lib/request-counter");
  countServerError();
}
