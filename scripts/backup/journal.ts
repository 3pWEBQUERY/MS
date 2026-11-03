/**
 * Protokoll der Sicherungsläufe in ops.backup_runs (NFR16 «Backup-Alter», NFR07). Nur Zeitpunkt,
 * Erfolg, Objektname, Grösse und Fehlercode – keine Inhalte. Ein Fehler beim Protokollieren darf
 * den Sicherungslauf nicht scheitern lassen (die Sicherung selbst ist wichtiger).
 */
import postgres from "postgres";

export async function recordBackupRun(run: { ok: boolean; objectKey?: string; sizeBytes?: number; errorCode?: string; durationMs: number }) {
  const url = process.env.BACKUP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return;
  const sql = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
  try {
    await sql`
      insert into ops.backup_runs (ok, object_key, size_bytes, error_code, duration_ms)
      values (${run.ok}, ${run.objectKey ?? null}, ${run.sizeBytes ?? null}, ${run.errorCode ?? null}, ${Math.round(run.durationMs)})`;
    await sql`delete from ops.backup_runs where finished_at < now() - interval '35 days'`;
  } catch (err) {
    console.error(`[backup] Protokoll nicht geschrieben (${(err as { code?: string }).code ?? "error"})`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}
