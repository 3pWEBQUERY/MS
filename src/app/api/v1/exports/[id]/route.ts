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

/**
 * Sicherer Export-Download (PRI03, PRD 11): bei JEDEM Abruf werden Sitzung, Inhaberschaft,
 * erneute Anmeldung, Status und Ablauf geprüft. Kein öffentliches CDN, keine geteilten Caches.
 */
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

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
  if (!viewer.verified) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });

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
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  if (!hasRecentAuth(viewer)) return redirectTo(request, `/konto/bestaetigen?next=${encodeURIComponent(statusPage)}`);
  if (job.status !== "ready" || !job.objectKey || !job.expiresAt || job.expiresAt.getTime() <= Date.now())
    return redirectTo(request, statusPage);
  if (!storageConfigured()) return NextResponse.json({ error: "storage_not_configured" }, { status: 503, headers: NO_STORE });

  const file: ExportFile = request.nextUrl.searchParams.get("datei") === "csv" ? "csv" : "json";
  const data = await readExportFile(job.objectKey, file);
  if (!data) return NextResponse.json({ error: "gone" }, { status: 410, headers: NO_STORE });

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
