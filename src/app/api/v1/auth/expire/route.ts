import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/server/auth/session";

/**
 * Beendet die Sitzung serverseitig nach Inaktivität und verwirft geschützte Ansichten (ACC03).
 * Nur aus der eigenen Anwendung (SessionWatch); fremde Seiten können niemanden abmelden.
 */
export async function GET(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }
  await destroyCurrentSession();
  const res = NextResponse.redirect(new URL("/sitzung-abgelaufen", request.url), 303);
  res.headers.set("Clear-Site-Data", '"cache"');
  return res;
}
