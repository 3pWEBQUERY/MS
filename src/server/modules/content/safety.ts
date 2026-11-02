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

export type SafetyContact = {
  id: string;
  name: string;
  description: string;
  phone: string | null;
  url: string | null;
  availability: string;
  region: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

/**
 * Statischer Rückfall: nur allgemein bekannte, offizielle Schweizer Nummern.
 * Vor Produktivbetrieb fachlich zu verifizieren (PRD 10 «Krisen und medizinische Grenzen»).
 */
export const STATIC_SAFETY_CONTACTS: SafetyContact[] = [
  {
    id: "static-144",
    name: "Sanitätsnotruf 144",
    description: "Bei akuter Lebensgefahr, schweren Verletzungen oder plötzlichen starken Beschwerden.",
    phone: "144",
    url: null,
    availability: "Rund um die Uhr",
    region: "Ganze Schweiz",
    verifiedAt: null,
    verifiedBy: null,
  },
  {
    id: "static-112",
    name: "Euronotruf 112",
    description: "Allgemeine europäische Notrufnummer, auch aus dem Ausland oder ohne SIM-Guthaben erreichbar.",
    phone: "112",
    url: null,
    availability: "Rund um die Uhr",
    region: "Ganze Schweiz",
    verifiedAt: null,
    verifiedBy: null,
  },
  {
    id: "static-117",
    name: "Polizeinotruf 117",
    description: "Wenn du oder andere bedroht werden oder eine Straftat geschieht.",
    phone: "117",
    url: null,
    availability: "Rund um die Uhr",
    region: "Ganze Schweiz",
    verifiedAt: null,
    verifiedBy: null,
  },
  {
    id: "static-143",
    name: "Die Dargebotene Hand 143",
    description: "Anonymes Gespräch, wenn dich etwas belastet oder du nicht mehr weiterweisst.",
    phone: "143",
    url: "https://www.143.ch",
    availability: "Rund um die Uhr",
    region: "Ganze Schweiz",
    verifiedAt: null,
    verifiedBy: null,
  },
  {
    id: "static-145",
    name: "Tox Info Suisse 145",
    description: "Bei Vergiftungen oder Verdacht auf Vergiftung, auch durch Medikamente.",
    phone: "145",
    url: "https://www.toxinfo.ch",
    availability: "Rund um die Uhr",
    region: "Ganze Schweiz",
    verifiedAt: null,
    verifiedBy: null,
  },
];

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

/** Nur Ziffern und führendes «+» für tel:-Links. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
