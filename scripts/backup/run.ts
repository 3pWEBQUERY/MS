/**
 * Stündliche, verschlüsselte Datenbanksicherung (NFR07 «RPO ≤ 1 h», PRD 11 «Backups ≤ 35 Tage»).
 * Läuft als Railway-Cron-Service «backup» (ops/backup/Dockerfile, Zeitplan stündlich) und beendet sich.
 *
 *  1. `pg_dump --format=custom` der Datenbank BACKUP_DATABASE_URL in eine temporäre Datei
 *  2. AES-256-GCM mit BACKUP_ENCRYPTION_KEY (scripts/backup/format.ts), Upload in den eigenen
 *     Bucket BACKUP_BUCKET (getrennt vom Medien-Bucket)
 *  3. Prüfung: Objekt lesen, Tag prüfen, Kennung des Dumps («PGDMP») kontrollieren
 *  4. Aufbewahrung: Objekte älter als BACKUP_RETENTION_DAYS (Standard 35) löschen
 *
 * Log nur mit Zahlen und Codes, nie mit Inhalten (NFR15). Schlägt ein Schritt fehl:
 * «[alarm] code=backup_failed» und Exit-Code 1 (Railway markiert den Lauf als fehlgeschlagen).
 * Offline-Kopie ohne Bucket: `npm run backup:run -- --local <datei>`.
 * Wiederherstellung: `npm run backup:restore` (scripts/backup/restore.ts) und Runbook R4.
 */
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { MAGIC, PREFIX, RETENTION_DAYS, backupBucket, backupKey, decrypt, newCipher, objectKey } from "./format";
import { recordBackupRun } from "./journal";

const started = new Date();
const log = (msg: string) => console.log(`[backup] ${msg}`);

async function dump(file: string) {
  const url = process.env.BACKUP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw Object.assign(new Error("BACKUP_DATABASE_URL fehlt"), { code: "config" });
  await new Promise<void>((resolve, reject) => {
    const p = spawn("pg_dump", ["--format=custom", "--compress=6", "--no-owner", "--no-privileges", "--file", file, url], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", reject);
    p.on("exit", (code) =>
      // stderr kann Verbindungsdaten enthalten: nur die erste Zeile ohne URL ausgeben
      code === 0 ? resolve() : reject(Object.assign(new Error(`pg_dump ${code}: ${err.split("\n")[0].replace(/postgres(ql)?:\/\/\S+/g, "<url>")}`), { code: "pg_dump" })),
    );
  });
}

async function encrypt(src: string, dst: string, key: Buffer) {
  const { iv, cipher } = newCipher(key);
  const out = createWriteStream(dst);
  out.write(MAGIC);
  out.write(iv);
  await pipeline(createReadStream(src), cipher, out, { end: false });
  await new Promise<void>((r, j) => out.end(cipher.getAuthTag(), (e?: Error | null) => (e ? j(e) : r())));
}

async function prune(bucket: ReturnType<typeof backupBucket>) {
  const cutoff = Date.now() - RETENTION_DAYS * 86_400_000;
  let token: string | undefined;
  let removed = 0;
  do {
    const page = await bucket.client.send(new ListObjectsV2Command({ Bucket: bucket.name, Prefix: PREFIX, ContinuationToken: token }));
    const old = (page.Contents ?? []).filter((o) => o.Key && o.LastModified && o.LastModified.getTime() < cutoff);
    if (old.length > 0) {
      await bucket.client.send(new DeleteObjectsCommand({ Bucket: bucket.name, Delete: { Objects: old.map((o) => ({ Key: o.Key! })) } }));
      removed += old.length;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return removed;
}

async function main() {
  const key = backupKey();
  const localOut = process.argv.includes("--local") ? process.argv[process.argv.indexOf("--local") + 1] : undefined;
  const dir = await mkdtemp(join(tmpdir(), "ms-backup-"));
  try {
    const raw = join(dir, "db.dump");
    const enc = localOut ?? join(dir, "db.dump.enc");
    await dump(raw);
    await encrypt(raw, enc, key);
    if (localOut) {
      // Offline-Kopie (z. B. vor Wartung): nur lokal verschlüsselt ablegen, kein Upload
      log(`ok lokal groesse=${(await stat(enc)).size}`);
      return;
    }
    const bucket = backupBucket();
    const size = (await stat(enc)).size;
    const name = objectKey(started);
    await bucket.client.send(
      new PutObjectCommand({ Bucket: bucket.name, Key: name, Body: createReadStream(enc), ContentLength: size, ContentType: "application/octet-stream" }),
    );

    // Kontrolle: zurücklesen, entschlüsseln (prüft den GCM-Tag) und Dump-Kennung prüfen
    const back = await bucket.client.send(new GetObjectCommand({ Bucket: bucket.name, Key: name }));
    const plain = decrypt(key, Buffer.from(await back.Body!.transformToByteArray()));
    if (plain.subarray(0, 5).toString("latin1") !== "PGDMP") throw Object.assign(new Error("Dump-Kennung fehlt"), { code: "verify" });

    const removed = await prune(bucket);
    log(`ok objekt=${name} groesse=${size} dauer_s=${((Date.now() - started.getTime()) / 1000).toFixed(1)} geloescht=${removed}`);
    await recordBackupRun({ ok: true, objectKey: name, sizeBytes: size, durationMs: Date.now() - started.getTime() });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch(async (err) => {
  const code = (err as { code?: string }).code ?? (err instanceof Error ? err.name : "error");
  console.error(`[backup] fehlgeschlagen (${code}): ${err instanceof Error ? err.message.slice(0, 200) : ""}`);
  console.error("[alarm] code=backup_failed");
  // Lokale Offline-Kopien (--local) nicht protokollieren
  if (!process.argv.includes("--local")) await recordBackupRun({ ok: false, errorCode: String(code).slice(0, 40), durationMs: Date.now() - started.getTime() });
  process.exit(1);
});
