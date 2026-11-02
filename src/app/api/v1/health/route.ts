import { sql as dsql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

/** Technischer Statusendpunkt für Railway-Healthcheck und externe Prüfung (NFR06, NFR16). */
export async function GET() {
  try {
    await db.execute(dsql`select 1`);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
