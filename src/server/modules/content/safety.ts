import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "../../db";
import { safetyContacts } from "../../db/schema";

/**
 * Sicherheitsseite S49 (SAF06): muss ohne Login, ohne JavaScript und bei Community-Störung
 * lesbar sein. Daten aus content.safety_contacts (nur aktiv), gecacht; ist die Datenbank nicht
 * erreichbar, gilt die statische Liste unten. Die Seite rendert vollständig auf dem Server.
 */

export { STATIC_SAFETY_CONTACTS, telHref, type SafetyContact } from "@/lib/safety-static";
import { STATIC_SAFETY_CONTACTS, type SafetyContact } from "@/lib/safety-static";

export type SafetyData = { source: "database" | "fallback"; contacts: SafetyContact[] };

/** Gecacht mit Tag «safety»; bei Datenbankfehler kurzlebiger Rückfall statt Abbruch. */
export async function getSafetyContacts(): Promise<SafetyData> {
  "use cache";
  cacheTag("safety");
  try {
    const rows = await db
      .select({
        id: safetyContacts.id,
        name: safetyContacts.name,
        description: safetyContacts.description,
        phone: safetyContacts.phone,
        url: safetyContacts.url,
        availability: safetyContacts.availability,
        region: safetyContacts.region,
        verifiedAt: safetyContacts.verifiedAt,
        verifiedBy: safetyContacts.verifiedBy,
      })
      .from(safetyContacts)
      .where(eq(safetyContacts.active, true))
      .orderBy(asc(safetyContacts.sort), asc(safetyContacts.name));
    if (rows.length === 0) {
      cacheLife("minutes");
      return { source: "fallback", contacts: STATIC_SAFETY_CONTACTS };
    }
    cacheLife("hours");
    return {
      source: "database",
      contacts: rows.map((r) => ({ ...r, verifiedAt: r.verifiedAt?.toISOString() ?? null })),
    };
  } catch {
    // SAF06/AT10: Die Hilfeseite bleibt auch bei Datenbankstörung lesbar.
    cacheLife("minutes");
    return { source: "fallback", contacts: STATIC_SAFETY_CONTACTS };
  }
}

