import { NextResponse, type NextRequest } from "next/server";
import { currentAlarms, lastWorkerHeartbeat, WORKER_STALE_MS } from "@/server/modules/admin/ops-alarms";
import { correlationId } from "../../_lib/http";

/**
 * Betriebsalarme für den externen Prüfer (NFR16, NFR19, US26): 503, solange der Arbeiter kein
 * Lebenszeichen gibt oder eine Alarmschwelle verletzt ist. Nur Codes, keine Zähler oder Inhalte.
 * Nicht als Railway-Healthcheck des Web-Service verwenden (sonst blockiert ein Arbeiterproblem Deployments).
 */
export async function GET(req: NextRequest) {
  const id = correlationId(req);
  const headers = { "Cache-Control": "no-store", "X-Request-Id": id };
  try {
    const [beat, alarms] = await Promise.all([lastWorkerHeartbeat(), currentAlarms()]);
    const codes = alarms.map((a) => a.code);
    if (!beat || Date.now() - beat.beatAt.getTime() > WORKER_STALE_MS) codes.unshift("worker_inactive");
    const ok = codes.length === 0;
    return NextResponse.json({ status: ok ? "ok" : "alarm", alarms: codes }, { status: ok ? 200 : 503, headers });
  } catch {
    return NextResponse.json({ status: "degraded", correlationId: id }, { status: 503, headers });
  }
}
