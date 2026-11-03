import "server-only";
import { and, desc, eq, inArray, lt, sql as dsql } from "drizzle-orm";
import { decryptBuffer, encryptBuffer } from "../../crypto";
import { db } from "../../db";
import { accounts, exportJobs } from "../../db/schema";
import { deleteObject, getObject, PREFIX, putObject, storageConfigured } from "../../storage";
import { buildExport } from "./export-build";

/**
 * Lebenszyklus der Exportaufträge (PRI03, PRD 11 «Exporte»): erzeugen, anwendungsseitig
 * verschlüsseln, im privaten Bucket ablegen, höchstens 24 Stunden bereitstellen, entfernen.
 */
export const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;
export const EXPORT_FILES = ["json", "csv"] as const;
export type ExportFile = (typeof EXPORT_FILES)[number];

export function exportBaseKey(accountId: string, jobId: string) {
  return `${PREFIX.exports}${accountId}/${jobId}`;
}

export function exportFileKey(objectKey: string, file: ExportFile) {
  return `${objectKey}.${file}`;
}

/** Worker «export.generate»: Status und Kontozustand erneut prüfen, dann erzeugen (ACC08, DIA08, PRI03). */
export async function generateExport(jobId: string, attempt: number): Promise<void> {
  const [job] = await db
    .select({ id: exportJobs.id, accountId: exportJobs.accountId, status: exportJobs.status })
    .from(exportJobs)
    .where(eq(exportJobs.id, jobId));
  if (!job || job.status === "ready" || job.status === "expired") return;
  if (job.status === "failed") return;

  const [acc] = await db.select({ status: accounts.status }).from(accounts).where(eq(accounts.id, job.accountId));
  if (!acc || acc.status === "deletion_pending" || acc.status === "deleted") {
    await db.update(exportJobs).set({ status: "failed", errorCode: "account_inactive" }).where(eq(exportJobs.id, jobId));
    return;
  }
  if (!storageConfigured()) {
    // Keine Ersatzablage in der Datenbank: klarer Fehlerzustand statt stiller Annahme.
    await db.update(exportJobs).set({ status: "failed", errorCode: "storage_not_configured" }).where(eq(exportJobs.id, jobId));
    return;
  }

  await db.update(exportJobs).set({ status: "running", errorCode: null }).where(eq(exportJobs.id, jobId));
  const objectKey = exportBaseKey(job.accountId, job.id);
  try {
    const files = await buildExport(job.accountId);
    const json = encryptBuffer(files.json);
    const csv = encryptBuffer(files.csv);
    await putObject(exportFileKey(objectKey, "json"), json, "application/octet-stream");
    await putObject(exportFileKey(objectKey, "csv"), csv, "application/octet-stream");
    const readyAt = new Date();
    const done = await db
      .update(exportJobs)
      .set({
        status: "ready",
        objectKey,
        sizeBytes: files.json.length + files.csv.length,
        readyAt,
        expiresAt: new Date(readyAt.getTime() + EXPORT_TTL_MS),
      })
      .where(and(eq(exportJobs.id, jobId), eq(exportJobs.status, "running")))
      .returning({ id: exportJobs.id });
    // Inzwischen abgebrochen (z. B. Löschung der Gesundheitsdaten): Dateien sofort entfernen.
    if (done.length === 0) await removeExportObjects(objectKey);
  } catch (err) {
    if (attempt >= 5) {
      await db.update(exportJobs).set({ status: "failed", errorCode: "generation_failed" }).where(eq(exportJobs.id, jobId));
      await removeExportObjects(objectKey).catch(() => {});
      return;
    }
    await db.update(exportJobs).set({ status: "queued", errorCode: "retrying" }).where(eq(exportJobs.id, jobId));
    throw err;
  }
}

export async function removeExportObjects(objectKey: string) {
  for (const f of EXPORT_FILES) await deleteObject(exportFileKey(objectKey, f));
}

/** Periodisch: abgelaufene Exporte aus dem Bucket löschen und als «expired» markieren (PRD 11). */
export async function expireExports(): Promise<void> {
  const due = await db
    .select({ id: exportJobs.id, objectKey: exportJobs.objectKey })
    .from(exportJobs)
    .where(and(eq(exportJobs.status, "ready"), lt(exportJobs.expiresAt, new Date())))
    .limit(200);
  for (const job of due) {
    if (job.objectKey) {
      if (!storageConfigured()) continue;
      await removeExportObjects(job.objectKey);
    }
    await db.update(exportJobs).set({ status: "expired", objectKey: null }).where(eq(exportJobs.id, job.id));
  }
  // Hängengebliebene Aufträge nach 6 Stunden als fehlgeschlagen kennzeichnen
  await db
    .update(exportJobs)
    .set({ status: "failed", errorCode: "timeout" })
    .where(and(inArray(exportJobs.status, ["queued", "running"]), dsql`${exportJobs.createdAt} < now() - interval '6 hours'`));
}

/** Download: entschlüsselte Datei (Prüfung von Sitzung, Eigentum und Ablauf erfolgt im Route Handler). */
export async function readExportFile(objectKey: string, file: ExportFile): Promise<Buffer | null> {
  const obj = await getObject(exportFileKey(objectKey, file));
  if (!obj) return null;
  return decryptBuffer(Buffer.from(obj.body));
}

/* ───────────────────────── Abfragen für S15 / S17 ───────────────────────── */

export type ExportJobView = {
  id: string;
  status: "queued" | "running" | "ready" | "expired" | "failed";
  createdAt: Date;
  readyAt: Date | null;
  expiresAt: Date | null;
  downloadedAt: Date | null;
  sizeBytes: number | null;
  errorCode: string | null;
};

const jobFields = {
  id: exportJobs.id,
  status: exportJobs.status,
  createdAt: exportJobs.createdAt,
  readyAt: exportJobs.readyAt,
  expiresAt: exportJobs.expiresAt,
  downloadedAt: exportJobs.downloadedAt,
  sizeBytes: exportJobs.sizeBytes,
  errorCode: exportJobs.errorCode,
};

/** Bereitgestellt, aber abgelaufen gilt sofort als abgelaufen – auch bevor die Bereinigung lief. */
export function effectiveExport(job: ExportJobView, now = Date.now()): ExportJobView {
  if (job.status === "ready" && job.expiresAt && job.expiresAt.getTime() <= now) return { ...job, status: "expired" };
  return job;
}

export async function listOwnExports(accountId: string): Promise<ExportJobView[]> {
  const rows = await db
    .select(jobFields)
    .from(exportJobs)
    .where(eq(exportJobs.accountId, accountId))
    .orderBy(desc(exportJobs.createdAt))
    .limit(10);
  return rows.map((r) => effectiveExport(r));
}

export async function getOwnExport(accountId: string, jobId: string): Promise<ExportJobView | null> {
  const [row] = await db
    .select(jobFields)
    .from(exportJobs)
    .where(and(eq(exportJobs.id, jobId), eq(exportJobs.accountId, accountId)))
    .limit(1);
  return row ? effectiveExport(row) : null;
}
