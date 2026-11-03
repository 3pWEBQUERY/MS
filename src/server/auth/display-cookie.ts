import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { DISPLAY_COOKIE, DISPLAY_COOKIE_MAX_AGE, serializeDisplayCookie, type DisplayPrefs } from "@/lib/display-prefs";
import { db } from "../db";
import { userPreferences } from "../db/schema";
import { env } from "../env";

/**
 * HOM06 «geräteübergreifend»: Anzeigepräferenzen des Mitglieds als nicht sensibles Cookie, das
 * das Boot-Skript schon vor der Hydration liest. Nicht HttpOnly (muss im Browser lesbar sein),
 * SameSite=Lax, Secure in Produktion. Enthält nur theme/textScale/motion/simple.
 */
export async function setDisplayCookie(p: DisplayPrefs): Promise<void> {
  (await cookies()).set(DISPLAY_COOKIE, serializeDisplayCookie(p), {
    httpOnly: false,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: DISPLAY_COOKIE_MAX_AGE,
  });
}

/** Beim Login: gespeicherte Präferenzen des Kontos auf dieses Gerät übernehmen. */
export async function setDisplayCookieFor(accountId: string): Promise<void> {
  const [p] = await db
    .select({ theme: userPreferences.theme, textScale: userPreferences.textScale, motion: userPreferences.motion, simple: userPreferences.simpleView })
    .from(userPreferences)
    .where(eq(userPreferences.accountId, accountId))
    .limit(1);
  if (!p) return;
  await setDisplayCookie({ theme: p.theme as DisplayPrefs["theme"], textScale: p.textScale, motion: p.motion as DisplayPrefs["motion"], simple: p.simple });
}

/**
 * Beim Abmelden löschen: Die Darstellung ist nicht sensibel, ein Gerät kann aber geteilt sein –
 * die nächste Person soll nicht die Präferenzen des vorherigen Kontos erben.
 */
export async function clearDisplayCookie(): Promise<void> {
  (await cookies()).delete(DISPLAY_COOKIE);
}
