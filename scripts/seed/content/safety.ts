/** Sicherheitskontakte S49 (SAF06). Teil des Startbestands (CON08), siehe scripts/seed/content/run.ts. */

/**
 * Nur allgemein bekannte, offizielle Schweizer Nummern. PRD 10 verlangt eine fachliche
 * Verifikation vor dem Launch – im Demo-Seed ausdrücklich als ausstehend gekennzeichnet.
 * Prüfung vor Produktivbetrieb erforderlich.
 */
export const SAFETY_VERIFIER = "Demo – fachliche Prüfung ausstehend";
export const SAFETY_CONTACTS = [
  { sort: 10, name: "Sanitätsnotruf 144", phone: "144", url: null, availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Bei akuter Lebensgefahr, schweren Verletzungen oder plötzlichen starken Beschwerden wie Lähmungen oder Sprachstörungen." },
  { sort: 20, name: "Euronotruf 112", phone: "112", url: null, availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Allgemeine europäische Notrufnummer. Sie wird an die zuständige Notrufzentrale weitergeleitet." },
  { sort: 30, name: "Polizeinotruf 117", phone: "117", url: null, availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Wenn du oder andere bedroht werden oder eine Straftat geschieht." },
  { sort: 40, name: "Die Dargebotene Hand 143", phone: "143", url: "https://www.143.ch", availability: "Rund um die Uhr, auch per Chat und E-Mail", region: "Ganze Schweiz", description: "Anonymes Gespräch, wenn dich etwas belastet, du in einer Krise bist oder an Suizid denkst." },
  { sort: 50, name: "Tox Info Suisse 145", phone: "145", url: "https://www.toxinfo.ch", availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Bei Vergiftungen oder Verdacht auf Vergiftung, auch durch Medikamente. Bei Bewusstlosigkeit direkt 144 anrufen." },
];

