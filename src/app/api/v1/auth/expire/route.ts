import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/server/auth/session";

/** Beendet die Sitzung serverseitig nach Inaktivität und verwirft geschützte Ansichten (ACC03). */
export async function GET(request: Request) {
  await destroyCurrentSession();
  const res = NextResponse.redirect(new URL("/sitzung-abgelaufen", request.url), 303);
  res.headers.set("Clear-Site-Data", '"cache"');
  return res;
}
