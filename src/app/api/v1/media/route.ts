import { NextResponse, type NextRequest } from "next/server";
import { recordDenied } from "@/server/audit";
import { getViewer } from "@/server/auth/viewer";
import { MEDIA_MAX_BYTES, storeMedia } from "@/server/modules/content/media";
import { consume } from "@/server/rate-limit";
import { storageConfigured } from "@/server/storage";
import { correlationId, sameOrigin } from "../_lib/http";

/**
 * Upload in die Medienbibliothek (Rollen editor, admin; MFA in dieser Sitzung).
 * Route Handler statt Server Action, weil Bilder bis 5 MB die Standardgrenze für
 * Server Actions überschreiten. CSRF-Schutz: Origin muss zum Host passen.
 */
const MESSAGES = {
  ok: "Bild hochgeladen.",
  type: "Nur JPEG-, PNG-, WebP- oder AVIF-Bilder sind erlaubt. SVG wird aus Sicherheitsgründen nicht angenommen.",
  size: "Das Bild ist grösser als 5 MB. Bitte verkleinere es und versuche es erneut.",
  alt: "Bitte beschreibe das Bild in einem Alternativtext (mindestens 3 Zeichen).",
  empty: "Bitte wähle eine Bilddatei aus.",
  storage: "Die Objektablage ist gerade nicht erreichbar. Es wurde nichts gespeichert.",
  config: "Objektablage nicht konfiguriert (Railway Bucket verbinden).",
  forbidden: "Diese Aktion ist nicht möglich.",
  limit: "Du hast in der letzten Stunde bereits viele Bilder hochgeladen. Bitte warte etwas.",
} as const;
type Code = keyof typeof MESSAGES;

function respond(req: NextRequest, code: Code, status: number) {
  const wantsJson = (req.headers.get("accept") ?? "").includes("application/json");
  if (wantsJson) {
    // PRD 14: Fehlermeldungen enthalten eine Korrelations-ID und verständlichen Text ohne private Details.
    const id = correlationId(req);
    return NextResponse.json(
      { ok: code === "ok", message: MESSAGES[code], ...(code === "ok" ? {} : { correlationId: id }) },
      { status, headers: { "Cache-Control": "no-store", "X-Request-Id": id } },
    );
  }
  // Ohne JavaScript: zurück zur Medienbibliothek mit Ergebniscode (kein Inhalt in der URL)
  const url = new URL("/verwaltung/medien", req.url);
  url.searchParams.set("upload", code);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return respond(req, "forbidden", 403);
  const viewer = await getViewer();
  const role = viewer?.roles.find((r) => r === "editor" || r === "admin");
  if (!viewer || !role || !viewer.mfaVerified) {
    await recordDenied("media_upload_denied", viewer?.accountId ?? null, "media_asset", "/api/v1/media");
    return respond(req, "forbidden", 403);
  }
  if (!storageConfigured()) return respond(req, "config", 503);
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MEDIA_MAX_BYTES + 64 * 1024) return respond(req, "size", 413);
  if (!(await consume(`media:${viewer.accountId}`, 30, 3600))) return respond(req, "limit", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return respond(req, "empty", 400);
  }
  const file = form.get("file");
  const altText = form.get("altText");
  if (!(file instanceof File)) return respond(req, "empty", 400);
  const result = await storeMedia({
    actorId: viewer.accountId,
    actorRole: role,
    file,
    altText: typeof altText === "string" ? altText : "",
  });
  if (!result.ok) return respond(req, result.code, result.code === "storage" ? 503 : 400);
  return respond(req, "ok", 201);
}
