import type { NextRequest } from "next/server";
import { recordDenied } from "@/server/audit";
import { getViewer } from "@/server/auth/viewer";
import { accountsUsable, isUuid, sessionStillValid } from "@/server/modules/messaging/access";
import { getConversationAccess, listMessages, listRemovedSince } from "@/server/modules/messaging/conversations";
import { correlationId } from "../../../_lib/http";

/**
 * Echtzeitkanal für ein Einzelgespräch (PRD 14 «Echtzeit», NFR05) als Server-Sent Events.
 * – Prüft Sitzung und Beteiligung beim Aufbau und in jedem Zyklus erneut; beendet den Kanal
 *   bei Kontaktentzug, Blockierung oder Sitzungsende (Ereignis «closed»).
 * – Liefert neue Nachrichten ab `?after=<seq>` bzw. `Last-Event-ID` (Reconnect ohne Lücken).
 * – Abfrage der Datenbank alle ~1,5 s: einfach, robust und innerhalb des 3-s-Ziels.
 * – Ein langsamer oder abgebrochener Kanal verändert keine gespeicherten Nachrichten.
 */

const POLL_MS = 1500;
const HEARTBEAT_MS = 15_000;
/** Begrenzte Lebensdauer; der Client verbindet sich mit der letzten Sequenz neu. */
const MAX_LIFETIME_MS = 4 * 60 * 1000;

const NO_STORE = { "Cache-Control": "private, no-store" };

/** PRD 14 «API-Vertrag»: Fehlerantworten mit Korrelations-ID, ohne private Details oder Existenzangabe. */
function errorJson(request: NextRequest, error: string, status: number) {
  const id = correlationId(request);
  return Response.json({ error, correlationId: id }, { status, headers: { ...NO_STORE, "X-Request-Id": id } });
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/conversations/[id]/stream">) {
  const viewer = await getViewer();
  if (!viewer || !viewer.verified || (viewer.mfaEnabled && !viewer.mfaVerified) || viewer.accountSuspended)
    return errorJson(request, "unauthorized", 401);

  const { id } = await ctx.params;
  const access = isUuid(id) ? await getConversationAccess(viewer.accountId, id) : null;
  if (!access) {
    await recordDenied("conversation_stream", viewer.accountId, "conversation", "/api/v1/conversations/[id]/stream");
    return errorJson(request, "not_found", 404);
  }

  const fromQuery = Number(request.nextUrl.searchParams.get("after") ?? "0");
  const fromHeader = Number(request.headers.get("last-event-id") ?? "0");
  let lastSeq = Math.max(Number.isFinite(fromQuery) ? fromQuery : 0, Number.isFinite(fromHeader) ? fromHeader : 0, 0);
  const accountId = viewer.accountId;
  const sessionId = viewer.sessionId;
  const encoder = new TextEncoder();
  const signal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false;
        }
      };
      const close = () => {
        if (!open) return;
        open = false;
        try {
          controller.close();
        } catch {
          // bereits geschlossen
        }
      };
      signal.addEventListener("abort", close);

      const startedAt = Date.now();
      let lastBeat = startedAt;
      let removedSince = new Date(startedAt - 5000);
      send(`retry: 3000\n\n`);

      while (open && !signal.aborted) {
        try {
          const cycleStart = new Date();
          // Berechtigung in jedem Zyklus erneut prüfen (MSG04, SAF01).
          const [valid, current] = await Promise.all([sessionStillValid(sessionId), getConversationAccess(accountId, id)]);
          if (!valid || !current) {
            send(`event: closed\ndata: {"reason":"session"}\n\n`);
            break;
          }
          if (current.state !== "active" || !(await accountsUsable([accountId, current.otherId]))) {
            send(`event: closed\ndata: {"reason":"inactive"}\n\n`);
            break;
          }

          const { items } = await listMessages(accountId, id, { afterSeq: lastSeq, limit: 100 });
          for (const m of items) {
            send(`id: ${m.seq}\nevent: message\ndata: ${JSON.stringify(m)}\n\n`);
            lastSeq = Math.max(lastSeq, m.seq);
          }
          const removed = await listRemovedSince(id, removedSince);
          if (removed.length > 0) send(`event: removed\ndata: ${JSON.stringify({ ids: removed })}\n\n`);
          // Überlappendes Fenster – der Client ignoriert doppelte Entfernungen.
          removedSince = new Date(cycleStart.getTime() - 2000);

          if (Date.now() - lastBeat >= HEARTBEAT_MS) {
            send(`: ping\n\n`);
            lastBeat = Date.now();
          }
          if (Date.now() - startedAt >= MAX_LIFETIME_MS) {
            send(`event: reconnect\ndata: {"after":${lastSeq}}\n\n`);
            break;
          }
        } catch (err) {
          // Vorübergehender Datenbankfehler: Korrelations-ID melden, Kanal schliessen, Client verbindet neu.
          // Das Ereignis «failed» ändert im Client nichts (unbekannte Ereignisse werden ignoriert).
          const ref = correlationId(request);
          console.error(`[sse] ${ref}`, err instanceof Error ? err.name : "error");
          send(`event: failed\ndata: ${JSON.stringify({ correlationId: ref })}\n\n`);
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      signal.removeEventListener("abort", close);
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
