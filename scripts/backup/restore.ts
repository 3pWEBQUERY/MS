/**
 * Wiederherstellung aus der verschlüsselten Sicherung (NFR07, NFR08, Runbook R4).
 *
 *   npm run backup:restore -- --list                         # verfügbare Sicherungen
 *   npm run backup:restore -- --latest --out db.dump         # neueste entschlüsseln
 *   npm run backup:restore -- --key postgres/…​.dump.enc --out db.dump
 *   npm run backup:restore -- --file lokal.dump.enc --out db.dump   # ohne Bucket (Offline-Kopie)
 *
 * Danach in eine NEUE, leere Datenbank einspielen (nie über die laufende):
 *   pg_restore --no-owner --no-privileges --dbname "$ZIEL_URL" db.dump
 * und anschliessend das Löschjournal anwenden: `npx tsx scripts/apply-deletion-journal.ts` (R4, AT09).
 */
import { readFile, writeFile } from "node:fs/promises";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PREFIX, backupBucket, backupKey, decrypt } from "./format";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function listAll() {
  const bucket = backupBucket();
  const items: { key: string; size: number; at: Date }[] = [];
  let token: string | undefined;
  do {
    const page = await bucket.client.send(new ListObjectsV2Command({ Bucket: bucket.name, Prefix: PREFIX, ContinuationToken: token }));
    for (const o of page.Contents ?? []) if (o.Key) items.push({ key: o.Key, size: o.Size ?? 0, at: o.LastModified ?? new Date(0) });
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

async function main() {
  if (process.argv.includes("--list")) {
    for (const i of await listAll()) console.log(`${i.key}  ${(i.size / 1024).toFixed(0)} KiB`);
    return;
  }
  const out = arg("--out");
  if (!out) throw new Error("--out <datei> fehlt");
  const key = backupKey();
  let file: Buffer;
  const local = arg("--file");
  if (local) {
    file = await readFile(local);
  } else {
    const bucket = backupBucket();
    const name = process.argv.includes("--latest") ? (await listAll()).at(-1)?.key : arg("--key");
    if (!name) throw new Error("Keine Sicherung gefunden (--latest oder --key <objekt>)");
    const res = await bucket.client.send(new GetObjectCommand({ Bucket: bucket.name, Key: name }));
    file = Buffer.from(await res.Body!.transformToByteArray());
    console.log(`Sicherung ${name} geladen`);
  }
  const plain = decrypt(key, file);
  if (plain.subarray(0, 5).toString("latin1") !== "PGDMP") throw new Error("Entschlüsselt, aber kein pg_dump-Format");
  await writeFile(out, plain, { mode: 0o600 });
  console.log(`Entschlüsselt nach ${out} (${(plain.length / 1024).toFixed(0)} KiB). Weiter mit pg_restore in eine neue Datenbank.`);
}

main().catch((err) => {
  console.error(`Wiederherstellung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
