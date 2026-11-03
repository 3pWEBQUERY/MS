import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Reine Hilfen für die Schlüsselrotation von DATA_ENCRYPTION_KEY (NFR10, Runbook R9).
 * Format wie src/server/crypto.ts: v1.<iv>.<tag>.<ciphertext> (AES-256-GCM, base64url).
 * Der GCM-Tag erkennt zuverlässig, mit welchem Schlüssel ein Wert verschlüsselt ist – darum ist
 * die Rotation ohne Schlüsselkennung im Chiffrat idempotent: Werte, die sich schon mit dem neuen
 * Schlüssel öffnen lassen, bleiben unverändert.
 */

/** Alle anwendungsseitig verschlüsselten Spalten (Schema: *_encrypted) und JSON-Nutzlasten. */
export const TEXT_COLUMNS: { table: string; columns: string[]; trigger?: string }[] = [
  { table: "identity.mfa_factors", columns: ["secret_encrypted"] },
  { table: "health.check_ins", columns: ["note_encrypted"] },
  { table: "health.diary_entries", columns: ["note_encrypted", "sleep_note_encrypted"] },
  { table: "messaging.messages", columns: ["body_encrypted"] },
  { table: "moderation.reports", columns: ["details_encrypted"] },
  // SAF02: Belege sind per Trigger unveränderlich – nur für die Umverschlüsselung (gleicher Klartext,
  // gleicher Hash) wird der Trigger innerhalb derselben Transaktion kurz ausgesetzt.
  { table: "moderation.evidence_items", columns: ["snapshot_encrypted"], trigger: "evidence_items_no_update" },
  { table: "moderation.appeals", columns: ["reason_encrypted"] },
  { table: "content.contact_messages", columns: ["message_encrypted", "reply_email_encrypted"] },
];

/** Outbox-Nutzlasten enthalten verschlüsselte Adressen und Links (z. B. «to», «link», «toEncrypted»). */
export const JSON_COLUMNS: { table: string; column: string }[] = [{ table: "ops.outbox_events", column: "payload" }];

export function deriveKey(b64: string): Buffer {
  const raw = Buffer.from(b64, "base64");
  if (raw.length === 0) throw new Error("Schlüssel leer oder nicht base64");
  return raw.length === 32 ? raw : createHash("sha256").update(raw).digest();
}

const CIPHERTEXT_RE = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]*$/;
export const isCiphertext = (v: unknown): v is string => typeof v === "string" && CIPHERTEXT_RE.test(v);

export function encryptWith(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptWith(key: Buffer, payload: string): string | null {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || ct === undefined) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export type RotateResult = { status: "current" } | { status: "rotated"; value: string } | { status: "unreadable" };

/** Einen Wert umverschlüsseln: bereits neu → unverändert; alt → neu; sonst «unreadable» (nie verändern). */
export function rotateValue(value: string, oldKey: Buffer, newKey: Buffer): RotateResult {
  if (decryptWith(newKey, value) !== null) return { status: "current" };
  const plain = decryptWith(oldKey, value);
  if (plain === null) return { status: "unreadable" };
  const next = encryptWith(newKey, plain);
  // Selbstprüfung: der neue Wert muss denselben Klartext liefern.
  if (decryptWith(newKey, next) !== plain) return { status: "unreadable" };
  return { status: "rotated", value: next };
}

export type Tally = { rotated: number; current: number; unreadable: number };
export const emptyTally = (): Tally => ({ rotated: 0, current: 0, unreadable: 0 });

/** JSON-Nutzlast rekursiv durchgehen und jede verschlüsselte Zeichenkette umverschlüsseln. */
export function rotateJson(value: unknown, oldKey: Buffer, newKey: Buffer, tally: Tally): { changed: boolean; value: unknown } {
  if (isCiphertext(value)) {
    const r = rotateValue(value, oldKey, newKey);
    tally[r.status] += 1;
    return r.status === "rotated" ? { changed: true, value: r.value } : { changed: false, value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const r = rotateJson(v, oldKey, newKey, tally);
      changed ||= r.changed;
      return r.value;
    });
    return { changed, value: out };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = rotateJson(v, oldKey, newKey, tally);
      changed ||= r.changed;
      out[k] = r.value;
    }
    return { changed, value: out };
  }
  return { changed: false, value };
}
