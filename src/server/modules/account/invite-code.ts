import { createHash, randomBytes } from "node:crypto";

/**
 * Einladungscodes (PRD 17 «begrenzte Einladung»): 12 Zeichen aus einem Alphabet ohne leicht
 * verwechselbare Zeichen (kein 0/O, 1/I/L), angezeigt als «ABCD-EFGH-JKMN». Gespeichert wird
 * nur der SHA-256-Hash des vereinheitlichten Codes; der Klartext erscheint genau einmal.
 */
export const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 12;

/** Neuer zufälliger Code im Anzeigeformat (gleichverteilt, ohne Modulo-Verzerrung). */
export function generateInviteCode(): string {
  const out: string[] = [];
  while (out.length < LENGTH) {
    for (const b of randomBytes(32)) {
      // 248 = 8 × 31: nur Bytes darunter verwenden, damit jedes Zeichen gleich wahrscheinlich ist
      if (b < 248 && out.length < LENGTH) out.push(INVITE_ALPHABET[b % INVITE_ALPHABET.length]);
    }
  }
  const s = out.join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/**
 * Vereinheitlicht eine Eingabe (Kleinbuchstaben, Leerzeichen, Bindestriche aller Art).
 * Gibt null zurück, wenn die Form nicht stimmt – ohne zu verraten, ob ein Code existiert.
 */
export function normalizeInviteCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s‐-―-]/g, "");
  if (compact.length !== LENGTH) return null;
  for (const ch of compact) if (!INVITE_ALPHABET.includes(ch)) return null;
  return compact;
}

export const inviteCodeHash = (normalized: string) => createHash("sha256").update(`invite:${normalized}`).digest("hex");

/** Letzte vier Zeichen zur Wiedererkennung in der Verwaltungsliste. */
export const inviteCodeHint = (normalized: string) => normalized.slice(-4);
