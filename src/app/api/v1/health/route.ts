import { sql as dsql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { correlationId } from "../_lib/http";

/**
 * Technischer Statusendpunkt für Railway-Healthcheck und externe Prüfung (NFR06, NFR16).
 * Prüft nur die Web-Bereitschaft (Datenbank); der Arbeiter hat /api/v1/health/worker.
 */
export async function GET(req: NextRequest) {
  const id = correlationId(req);
  const headers = { "Cache-Control": "no-store", "X-Request-Id": id };
  try {
    await db.execute(dsql`select 1`);
    return NextResponse.json({ status: "ok" }, { headers });
  } catch {
    return NextResponse.json({ status: "degraded", correlationId: id }, { status: 503, headers });
  }
}
