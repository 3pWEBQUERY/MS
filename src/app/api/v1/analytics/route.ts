import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/server/auth/viewer";
import { track } from "@/server/modules/analytics/track";
import { consume } from "@/server/rate-limit";
import { correlationId, sameOrigin } from "../_lib/http";

/**
 * Optionale Nutzungsstatistik (PRD 15): nimmt nur die wenigen im Browser entstehenden Ereignisse
 * an (Mein-Moment-Weg, Artikel/Angebot geöffnet, Netzwerkfehler). Gespeichert wird nur mit
 * gültiger Einwilligung; die Antwort verrät nicht, ob etwas gespeichert wurde.
 */
const MAX_BYTES = 1024;

export async function POST(req: NextRequest) {
  const headers = { "Cache-Control": "no-store", "X-Request-Id": correlationId(req) };
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, correlationId: headers["X-Request-Id"] }, { status: 403, headers });
  const viewer = await getViewer();
  if (!viewer) return new NextResponse(null, { status: 204, headers });
  if (!(await consume(`analytics:${viewer.accountId}`, 120, 3600))) return new NextResponse(null, { status: 204, headers });

  let body: unknown = null;
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return NextResponse.json({ ok: false, correlationId: headers["X-Request-Id"] }, { status: 413, headers });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, correlationId: headers["X-Request-Id"] }, { status: 400, headers });
  }
  await track(viewer.accountId, body, "client");
  return new NextResponse(null, { status: 204, headers });
}
