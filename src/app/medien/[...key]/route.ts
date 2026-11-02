import type { NextRequest } from "next/server";
import { findMediaByKey } from "@/server/modules/content/media";
import { getObject, storageConfigured } from "@/server/storage";

/**
 * Öffentliche Medienauslieferung aus dem Railway Bucket. Nur Objekte unter PREFIX.media, die in
 * content.media_assets registriert sind. Schlüssel enthalten eine UUID und ändern sich nie,
 * daher unveränderlich cachebar. Exporte und Belege sind hier nie erreichbar.
 */
function notFound() {
  return new Response("Nicht gefunden", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/medien/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!storageConfigured()) return notFound();
  const asset = await findMediaByKey(key);
  if (!asset) return notFound();
  const obj = await getObject(key).catch(() => null);
  if (!obj) return notFound();
  return new Response(Buffer.from(obj.body), {
    status: 200,
    headers: {
      // Content-Type aus der Registrierung (am Inhalt geprüft), nicht aus dem Bucket
      "Content-Type": asset.contentType,
      "Content-Length": String(obj.body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
