import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { localDateString } from "@/lib/time";
import { audit, recordDenied } from "@/server/audit";
import { getViewer, hasRecentAuth } from "@/server/auth/viewer";
import { db } from "@/server/db";
import { exportJobs } from "@/server/db/schema";
import { readExportFile, type ExportFile } from "@/server/modules/privacy/export";
import { storageConfigured } from "@/server/storage";
import { correlationId } from "../../_lib/http";

/**
 * Sicherer Export-Download (PRI03, PRD 11): bei JEDEM Abruf werden Sitzung, Inhaberschaft,
 * erneute Anmeldung, Status und Ablauf geprüft. Kein öffentliches CDN, keine geteilten Caches.
 */
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

/** PRD 14 «API-Vertrag»: Fehlerantworten mit Korrelations-ID, ohne private Details. */
function errorJson(request: NextRequest, error: string, status: number) {
  const id = correlationId(request);
  return NextResponse.json({ error, correlationId: id }, { status, headers: { ...NO_STORE, "X-Request-Id": id } });
}

function redirectTo(request: NextRequest, path: string) {
  const res = NextResponse.redirect(new URL(path, request.url), 303);
  for (const [k, v] of Object.entries(NO_STORE)) res.headers.set(k, v);
  return res;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const statusPage = `/konto/export/${encodeURIComponent(id)}`;

  const viewer = await getViewer();
  if (!viewer) return redirectTo(request, `/anmelden?next=${encodeURIComponent(statusPage)}`);
  if (viewer.mfaEnabled && !viewer.mfaVerified) return redirectTo(request, `/anmelden/mfa?next=${encodeURIComponent(statusPage)}`);
  if (!viewer.verified) return errorJson(request, "forbidden", 403);

  const parsed = z.uuid().safeParse(id);
  const [job] = parsed.success
    ? await db
        .select({
          id: exportJobs.id,
          status: exportJobs.status,
          objectKey: exportJobs.objectKey,
          expiresAt: exportJobs.expiresAt,
          createdAt: exportJobs.createdAt,
        })
        .from(exportJobs)
        .where(and(eq(exportJobs.id, parsed.data), eq(exportJobs.accountId, viewer.accountId)))
        .limit(1)
    : [];
  if (!job) {
    // Neutral: keine Existenzangabe für fremde oder unbekannte Aufträge (AT03)
    await recordDenied("export_download_denied", viewer.accountId, "export_job", "/api/v1/exports/[id]");
    return errorJson(request, "not_found", 404);
  }

  if (!hasRecentAuth(viewer)) return redirectTo(request, `/konto/bestaetigen?next=${encodeURIComponent(statusPage)}`);
  if (job.status !== "ready" || !job.objectKey || !job.expiresAt || job.expiresAt.getTime() <= Date.now())
    return redirectTo(request, statusPage);
  if (!storageConfigured()) return errorJson(request, "storage_not_configured", 503);

  const file: ExportFile = request.nextUrl.searchParams.get("datei") === "csv" ? "csv" : "json";
  let data: Buffer | null;
  try {
    data = await readExportFile(job.objectKey, file);
  } catch (err) {
    // Ablage oder Entschlüsselung gestört (z. B. Schlüsselrotation, R3): nur Code und Korrelations-ID.
    const res = errorJson(request, "export_unavailable", 503);
    console.error(`[export-download] ${res.headers.get("X-Request-Id")}`, err instanceof Error ? err.name : "error");
    return res;
  }
  if (!data) return errorJson(request, "gone", 410);

  await db.update(exportJobs).set({ downloadedAt: new Date() }).where(eq(exportJobs.id, job.id));
  await audit({ actorId: viewer.accountId, action: `privacy.export.downloaded.${file}`, objectType: "export_job", objectId: job.id });

  const date = localDateString(job.createdAt, viewer.prefs.timezone);
  const filename = file === "csv" ? `ms-plattform-tagebuch-${date}.csv` : `ms-plattform-daten-${date}.json`;
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": file === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(data.length),
      "Referrer-Policy": "no-referrer",
    },
  });
}
