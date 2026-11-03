/**
 * Sicherheitskontakte (S49, SAF06) ohne Abhängigkeit von Next.js – gemeinsam genutzt von der
 * Sicherheitsseite der Web-App und vom eigenständigen Hilfe-Dienst (NFR20, src/static-help).
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

/** Nur Ziffern und führendes «+» für tel:-Links. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
