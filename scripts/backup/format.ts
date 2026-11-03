/**
 * Verschlüsseltes Backup-Format (NFR07, NFR09): «MSBK1» | IV (12 Byte) | Chiffrat | GCM-Tag (16 Byte).
 * Inhalt ist ein `pg_dump --format=custom` (bereits komprimiert). Der Schlüssel BACKUP_ENCRYPTION_KEY
 * (32 Byte, base64) ist bewusst getrennt von DATA_ENCRYPTION_KEY und zusätzlich offline zu verwahren.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";

export const MAGIC = Buffer.from("MSBK1");
export const IV_LEN = 12;
export const TAG_LEN = 16;
export const PREFIX = "postgres/";
/** PRD 11: Backups höchstens 35 Tage aufbewahren. */
export const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 35);

export function backupKey(): Buffer {
  const raw = process.env.BACKUP_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY fehlt oder ist nicht 32 Byte (base64)");
  return key;
}

export function newCipher(key: Buffer) {
  const iv = randomBytes(IV_LEN);
  return { iv, cipher: createCipheriv("aes-256-gcm", key, iv) };
}

export function decrypt(key: Buffer, file: Buffer): Buffer {
  if (file.length < MAGIC.length + IV_LEN + TAG_LEN || !file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Keine MS-Backup-Datei (Kennung fehlt)");
  }
  const iv = file.subarray(MAGIC.length, MAGIC.length + IV_LEN);
  const tag = file.subarray(file.length - TAG_LEN);
  const body = file.subarray(MAGIC.length + IV_LEN, file.length - TAG_LEN);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]);
}

/** Objektname sortiert chronologisch: postgres/2026/11/03/2026-11-03T07-17-00Z.dump.enc */
export function objectKey(at: Date): string {
  const iso = at.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
  return `${PREFIX}${iso.slice(0, 4)}/${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso}.dump.enc`;
}

export function backupBucket() {
  const name = process.env.BACKUP_BUCKET ?? "";
  if (!name || !process.env.BACKUP_ENDPOINT || !process.env.BACKUP_ACCESS_KEY_ID) {
    throw new Error("BACKUP_BUCKET, BACKUP_ENDPOINT und BACKUP_ACCESS_KEY_ID sind nötig");
  }
  const client = new S3Client({
    region: process.env.BACKUP_REGION ?? "auto",
    endpoint: process.env.BACKUP_ENDPOINT,
    forcePathStyle: process.env.BACKUP_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.BACKUP_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.BACKUP_SECRET_ACCESS_KEY ?? "" },
  });
  return { name, client };
}
