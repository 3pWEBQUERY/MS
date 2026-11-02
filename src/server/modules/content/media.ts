import "server-only";
import { randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { audit } from "../../audit";
import { db } from "../../db";
import { articleVersions, mediaAssets } from "../../db/schema";
import { PREFIX, putObject } from "../../storage";
import { cleanText } from "../../action";

/**
 * Medienbibliothek (Railway Bucket). Nur Rasterbilder (kein SVG – Skriptgefahr), höchstens 5 MB,
 * Inhalt anhand der Magic Bytes geprüft, Schlüssel media/<uuid>.<ext>, Alt-Text Pflicht (A01).
 */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const MEDIA_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;
export type MediaType = keyof typeof MEDIA_TYPES;

/** Erkennt den Bildtyp ausschliesslich am Inhalt, nicht an Dateiname oder Client-Angabe. */
export function sniffImageType(buf: Buffer): MediaType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("latin1");
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/** Bildmasse aus dem Dateikopf (für stabile Platzhalter); null, wenn nicht ermittelbar. */
export function imageSize(buf: Buffer, type: MediaType): { width: number; height: number } | null {
  try {
    if (type === "image/png" && buf.length >= 24) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (type === "image/jpeg") {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        // SOF0–SOF15 ohne DHT (C4), JPG (C8), DAC (CC)
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
      return null;
    }
    if (type === "image/webp" && buf.length >= 30) {
      const chunk = buf.subarray(12, 16).toString("latin1");
      if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Dateiname nur zur Anzeige: ohne Pfad, Steuerzeichen und Sonderzeichen, gekürzt. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "bild";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 120);
  return cleaned || "bild";
}

export type UploadResult = { ok: true; id: string } | { ok: false; code: "type" | "size" | "alt" | "empty" | "storage" };

/** Gemeinsame Upload-Logik für den Route Handler (Rechte prüft der Aufrufer). */
export async function storeMedia(input: { actorId: string; actorRole: string; file: File; altText: string }): Promise<UploadResult> {
  const alt = cleanText(input.altText).replace(/\s+/g, " ").slice(0, 300);
  if (alt.length < 3) return { ok: false, code: "alt" };
  if (input.file.size === 0) return { ok: false, code: "empty" };
  if (input.file.size > MEDIA_MAX_BYTES) return { ok: false, code: "size" };
  const buf = Buffer.from(await input.file.arrayBuffer());
  if (buf.length > MEDIA_MAX_BYTES) return { ok: false, code: "size" };
  const type = sniffImageType(buf);
  if (!type) return { ok: false, code: "type" };
  const key = `${PREFIX.media}${randomUUID()}.${MEDIA_TYPES[type]}`;
  try {
    await putObject(key, buf, type);
  } catch {
    return { ok: false, code: "storage" };
  }
  const size = imageSize(buf, type);
  const [row] = await db
    .insert(mediaAssets)
    .values({
      objectKey: key,
      filename: sanitizeFilename(input.file.name),
      contentType: type,
      sizeBytes: buf.length,
      width: size?.width ?? null,
      height: size?.height ?? null,
      altText: alt,
      uploadedBy: input.actorId,
    })
    .returning({ id: mediaAssets.id });
  await audit({ actorId: input.actorId, actorRole: input.actorRole, action: "media.uploaded", objectType: "media_asset", objectId: row.id });
  return { ok: true, id: row.id };
}

export type MediaListItem = {
  id: string;
  objectKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string;
  createdAt: Date;
  usage: number;
};

export async function listMedia(limit = 100): Promise<MediaListItem[]> {
  const rows = await db
    .select({
      id: mediaAssets.id,
      objectKey: mediaAssets.objectKey,
      filename: mediaAssets.filename,
      contentType: mediaAssets.contentType,
      sizeBytes: mediaAssets.sizeBytes,
      width: mediaAssets.width,
      height: mediaAssets.height,
      altText: mediaAssets.altText,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(Math.min(limit, 100));
  const usage = await db
    .select({ id: articleVersions.coverMediaId, c: count() })
    .from(articleVersions)
    .groupBy(articleVersions.coverMediaId);
  const map = new Map(usage.map((u) => [u.id, Number(u.c)]));
  return rows.map((r) => ({ ...r, usage: map.get(r.id) ?? 0 }));
}

/** Für die Auslieferung: nur registrierte Objekte unter PREFIX.media. */
export async function findMediaByKey(key: string): Promise<{ contentType: string } | null> {
  if (!key.startsWith(PREFIX.media) || key.includes("..") || !/^media\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(key)) return null;
  const [row] = await db
    .select({ contentType: mediaAssets.contentType })
    .from(mediaAssets)
    .where(eq(mediaAssets.objectKey, key))
    .limit(1);
  if (!row || !(row.contentType in MEDIA_TYPES)) return null;
  return row;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString("de-CH", { maximumFractionDigits: 0 })} KB`;
  return `${(n / 1024 / 1024).toLocaleString("de-CH", { maximumFractionDigits: 1 })} MB`;
}
