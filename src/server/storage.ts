import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "./env";

/**
 * Railway Bucket (S3-kompatibel, privat). Medien werden über /medien/[...key]
 * ausgeliefert, Exporte ausschliesslich authentifiziert über die API (PRI03).
 * Railway Buckets unterstützen kein serverseitiges SSE: Exporte werden vor dem Upload
 * anwendungsseitig verschlüsselt (src/server/crypto.ts).
 */
let client: S3Client | null = null;

export function storageConfigured(): boolean {
  return Boolean(env.bucket.name() && env.bucket.endpoint() && env.bucket.accessKeyId());
}

function s3(): S3Client {
  if (!storageConfigured()) throw new Error("Objektablage ist nicht konfiguriert (BUCKET, ENDPOINT, ACCESS_KEY_ID)");
  client ??= new S3Client({
    region: env.bucket.region(),
    endpoint: env.bucket.endpoint(),
    forcePathStyle: env.bucket.forcePathStyle(),
    credentials: { accessKeyId: env.bucket.accessKeyId(), secretAccessKey: env.bucket.secretAccessKey() },
  });
  return client;
}

export const PREFIX = {
  media: "media/",
  exports: "exports/",
  evidence: "evidence/",
} as const;

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: env.bucket.name(), Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: env.bucket.name(), Key: key }));
    if (!res.Body) return null;
    return {
      body: await res.Body.transformToByteArray(),
      contentType: res.ContentType ?? "application/octet-stream",
    };
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: env.bucket.name(), Key: key }));
}

export async function storageHealthy(): Promise<boolean> {
  if (!storageConfigured()) return false;
  try {
    await s3().send(new HeadBucketCommand({ Bucket: env.bucket.name() }));
    return true;
  } catch {
    return false;
  }
}
