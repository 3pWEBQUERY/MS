import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id gemäss OWASP Password Storage Cheat Sheet (NFR11, Q11):
 * m = 19 MiB, t = 2, p = 1. Parameter vor Produktivbetrieb fachlich prüfen.
 */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 /* Argon2id */ } as const;

export { PASSWORD_MAX, PASSWORD_MIN, passwordProblem } from "./password-policy";

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
