import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Anwendungsseitige Verschlüsselung (AES-256-GCM) für Freitexte in Tagebuch,
 * Nachrichten, Belegen und Exporten (MSG05, NFR09). Format: v1.<iv>.<tag>.<ciphertext> (base64url).
 */
const deriveKey = (b64: string) => {
  const raw = Buffer.from(b64, "base64");
  return raw.length === 32 ? raw : createHash("sha256").update(raw).digest();
};

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (cachedKey) return cachedKey;
  cachedKey = deriveKey(env.dataKey());
  return cachedKey;
}

/**
 * Schlüsselrotation (NFR10, Runbook R9): Solange OLD_DATA_ENCRYPTION_KEY gesetzt ist, wird beim
 * Lesen ersatzweise der alte Schlüssel versucht. Geschrieben wird immer mit dem neuen Schlüssel;
 * scripts/rotate-data-key.ts verschlüsselt den Bestand um. Danach wird die Variable entfernt.
 */
let cachedOld: Buffer | null | undefined;
function oldKey(): Buffer | null {
  if (cachedOld !== undefined) return cachedOld;
  const raw = env.oldDataKey();
  cachedOld = raw ? deriveKey(raw) : null;
  return cachedOld;
}

function withFallback<T>(fn: (k: Buffer) => T): T {
  try {
    return fn(key());
  } catch (err) {
    const old = oldKey();
    if (!old) throw err;
    return fn(old);
  }
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || ct === undefined) throw new Error("Ungültiges Chiffrat");
  return withFallback((k) => {
    const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
  });
}

export const encryptOptional = (v: string | null | undefined) => (v && v.length > 0 ? encrypt(v) : null);
export const decryptOptional = (v: string | null | undefined) => (v ? decrypt(v) : null);

/** Binärdaten (Exportdateien) */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from("MSE1"), iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(data: Buffer): Buffer {
  if (data.subarray(0, 4).toString() !== "MSE1") throw new Error("Ungültiges Format");
  const iv = data.subarray(4, 16);
  const tag = data.subarray(16, 32);
  // Exportdateien unter dem alten Schlüssel bleiben bis zu ihrem Ablauf (≤ 24 h) lesbar.
  return withFallback((k) => {
    const decipher = createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data.subarray(32)), decipher.final()]);
  });
}

export const sha256 = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Kurze, gut lesbare Belegnummer, z. B. «M-7K4Q-2XPA» */
export function receiptNumber(prefix: string): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}
