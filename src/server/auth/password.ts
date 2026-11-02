import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id gemäss OWASP Password Storage Cheat Sheet (NFR11, Q11):
 * m = 19 MiB, t = 2, p = 1. Parameter vor Produktivbetrieb fachlich prüfen.
 */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 /* Argon2id */ } as const;

export const PASSWORD_MIN = 15;
export const PASSWORD_MAX = 128;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain.normalize("NFKC"), OPTIONS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain.normalize("NFKC"));
  } catch {
    return false;
  }
}

/** Ein gültiger Hash für konstante Laufzeit bei unbekannten Konten (keine Kontoaufzählung). */
let dummy: string | null = null;
export async function burnPasswordCheck(plain: string) {
  dummy ??= await hashPassword("dummy-password-for-timing-safety");
  await verifyPassword(dummy, plain);
}

/** Häufige oder kompromittierte Passwörter (Auszug; ergänzbar durch geprüften Dienst). */
const COMMON = new Set(
  [
    "passwortpasswort",
    "passwordpassword",
    "123456789012345",
    "1234567890123456",
    "qwertzuiopasdfgh",
    "qwertyuiopasdfgh",
    "iloveyouiloveyou",
    "aaaaaaaaaaaaaaa",
    "passwort1234567",
    "password1234567",
    "hallohallohallo",
    "schweizschweiz",
    "multiplesklerose",
    "multiplesklerose1",
    "willkommen12345",
    "letmeinletmein1",
    "abcdefghijklmnop",
    "zurich1234567890",
    "zuerich123456789",
    "qwertz123456789",
    "123qweasdzxc1234",
    "trustno1trustno1",
    "monkeymonkey1234",
    "dragondragon1234",
    "football12345678",
    "sommer2026sommer",
    "winter2026winter",
  ].map((p) => p.toLowerCase()),
);

export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN) return `Bitte verwende mindestens ${PASSWORD_MIN} Zeichen.`;
  if (password.length > PASSWORD_MAX) return `Bitte verwende höchstens ${PASSWORD_MAX} Zeichen.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "Dieses Passwort ist zu bekannt. Bitte wähle ein anderes.";
  if (/^(.)\1+$/.test(password)) return "Bitte verwende nicht nur ein einziges Zeichen.";
  if (/^(0123456789|1234567890|abcdefghij)/.test(lower) && new Set(lower).size < 8)
    return "Bitte verwende keine einfache Zeichenfolge.";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Das Passwort darf deine E-Mail-Adresse nicht enthalten.";
  return null;
}
