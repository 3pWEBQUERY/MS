import "server-only";
import { eq } from "drizzle-orm";
import { CANTONS, INTERESTS, ONBOARDING_GOALS } from "@/lib/catalog";
import type { Viewer } from "../../auth/viewer";
import { db } from "../../db";
import { communityProfiles } from "../../db/schema";

/**
 * Sparsames Community-Profil (ACC06, «Profilgrenze» PRD 05): Pseudonym, Interessen aus
 * kontrollierter Liste, optional Kanton. Keine Biografie, kein Bild, keine Verlaufsangaben.
 */
export const PSEUDONYM_MIN = 2;
export const PSEUDONYM_MAX = 40;

const INTEREST_CODES = new Set<string>(INTERESTS.map(([c]) => c));
const CANTON_CODES = new Set<string>(CANTONS.map(([c]) => c));
const GOAL_CODES = new Set<string>(ONBOARDING_GOALS.map(([c]) => c));

/** Für Vergleiche: Diakritika entfernt, Kleinschreibung, einfache Leerzeichen. */
function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Eindeutigkeit unabhängig von Gross-/Kleinschreibung und Akzenten («Bergsee» = «bérgsee»). */
export function normalizePseudonym(value: string): string {
  return fold(value.normalize("NFKC"));
}

export function tidyPseudonym(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * ACC06: Namen dürfen keine verifizierte Fachrolle vortäuschen. Längere Begriffe werden als
 * Wortbestandteil erkannt («Neurologin», «Pflegefachfrau»), kurze nur als ganzes Wort («Dr»).
 */
const ROLE_PARTS = [
  "arzt",
  "aerzt",
  "doktor",
  "moderat",
  "admin",
  "redaktion",
  "neurolog",
  "pflege",
  "support",
  "offiziell",
  "therapeut",
  "psycholog",
  "datenschutz",
  "verwaltung",
];
const ROLE_WORDS = ["dr", "prof", "team", "mod", "med", "staff"];

export function impersonatesRole(value: string): boolean {
  const f = fold(value);
  const compact = f.replace(/[^a-z0-9]/g, "");
  if (ROLE_PARTS.some((p) => compact.includes(p))) return true;
  const words = f.split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((w) => ROLE_WORDS.includes(w));
}

/** Liefert eine verständliche Fehlermeldung oder null. */
export function pseudonymProblem(raw: string, opts: { allowRoleWords?: boolean } = {}): string | null {
  const value = tidyPseudonym(raw);
  if (value.length < PSEUDONYM_MIN) return `Bitte wähle ein Pseudonym mit mindestens ${PSEUDONYM_MIN} Zeichen.`;
  if (value.length > PSEUDONYM_MAX) return `Bitte verwende höchstens ${PSEUDONYM_MAX} Zeichen.`;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]*$/u.test(value))
    return "Bitte verwende Buchstaben, Ziffern, Leerzeichen sowie . _ ' oder - und beginne mit einem Buchstaben oder einer Ziffer.";
  if (!opts.allowRoleWords && impersonatesRole(value))
    return "Pseudonyme dürfen keine Fach- oder Plattformrolle andeuten (z. B. «Dr», «Ärztin», «Moderation», «Team»). Bitte wähle einen anderen Namen.";
  return null;
}

export function cleanInterests(values: string[]): string[] {
  return [...new Set(values.filter((v) => INTEREST_CODES.has(v)))];
}

export function cleanCanton(value: string | null): string | null {
  return value && CANTON_CODES.has(value) ? value : null;
}

export function cleanGoal(value: string | null): string | null {
  return value && GOAL_CODES.has(value) ? value : null;
}

/** Ist das Pseudonym frei? (eigener Datensatz zählt nicht als Konflikt) */
export async function pseudonymAvailable(raw: string, accountId: string): Promise<boolean> {
  const [row] = await db
    .select({ accountId: communityProfiles.accountId })
    .from(communityProfiles)
    .where(eq(communityProfiles.pseudonymNormalized, normalizePseudonym(raw)))
    .limit(1);
  return !row || row.accountId === accountId;
}

export type OwnProfile = {
  pseudonym: string;
  interests: string[];
  canton: string | null;
  discoverable: boolean;
  onboardingGoal: string | null;
  version: number;
};

/** Eigenes Profil (S09) – nur für den Inhaber. */
export async function getOwnProfile(viewer: Viewer): Promise<OwnProfile | null> {
  const [row] = await db
    .select({
      pseudonym: communityProfiles.pseudonym,
      interests: communityProfiles.interests,
      canton: communityProfiles.canton,
      discoverable: communityProfiles.discoverable,
      onboardingGoal: communityProfiles.onboardingGoal,
      version: communityProfiles.version,
    })
    .from(communityProfiles)
    .where(eq(communityProfiles.accountId, viewer.accountId))
    .limit(1);
  return row ?? null;
}

/** Postgres-Fehler «unique_violation» (z. B. gleichzeitige Vergabe desselben Pseudonyms) */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
