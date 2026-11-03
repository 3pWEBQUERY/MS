"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice, PlainText } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import {
  markConversationReadAction,
  removeMessageAction,
  sendMessageAction,
} from "@/server/modules/messaging/actions";
import type { ChatMessage } from "@/server/modules/messaging/conversations";

const MAX = 2000;
/** Nachrichtenblase: Radius 16px bei 16/12px Innenabstand, Lesebreite begrenzt */
const BUBBLE = "max-w-[85%] rounded-[16px] px-4 py-3 text-base leading-relaxed sm:max-w-[70%]";
const FALLBACK_REFRESH_MS = 5000;

type Pending = {
  opId: string;
  body: string;
  status: "sending" | "failed";
  error?: string;
  retryable?: boolean;
};

/**
 * S40 Einzelgespräch (MSG03–MSG06): geordnete Nachrichten mit stabilen IDs, Zustellstatus
 * nur «Gespeichert» / «Wird gesendet» / «Nicht gesendet – erneut versuchen».
 * Keine Lesebestätigungen, Tippindikatoren oder Anwesenheit. Nachrichtentexte bleiben
 * ausschliesslich im Arbeitsspeicher (kein Browser-Dauerspeicher, PRD 04).
 * Echtzeit über Server-Sent Events mit Nachladen ab letzter Sequenz; Fallback: router.refresh().
 */
export function ChatView({
  conversationId,
  initialMessages,
  canSend,
  otherPseudonym,
  timeZone,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
  canSend: boolean;
  otherPseudonym: string;
  timeZone: string;
}) {
  const router = useRouter();
  const [live, setLive] = useState<Record<string, ChatMessage>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [closedLocally, setClosedLocally] = useState(false);
  const [mode, setMode] = useState<"live" | "fallback">("live");
  const lastSeqRef = useRef(0);
  const lastMarkedRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  // Zusammenführen: Serverstand (initialMessages, auch nach router.refresh) + Live-Ereignisse.
  const messages = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    const put = (m: ChatMessage) => {
      const prev = map.get(m.id);
      map.set(m.id, prev && (prev.body === null || m.body === null) ? { ...m, body: null } : m);
    };
    initialMessages.forEach(put);
    Object.values(live).forEach(put);
    for (const id of removed) {
      const m = map.get(id);
      if (m) map.set(id, { ...m, body: null });
    }
    return [...map.values()].sort((a, b) => a.seq - b.seq);
  }, [initialMessages, live, removed]);

  const maxSeq = messages.length > 0 ? messages[messages.length - 1]!.seq : 0;
  const knownOps = useMemo(() => new Set(messages.filter((m) => m.op).map((m) => m.op!)), [messages]);
  const visiblePending = pending.filter((p) => !knownOps.has(p.opId));
  const sendingAllowed = canSend && !closedLocally;

  useEffect(() => {
    lastSeqRef.current = Math.max(lastSeqRef.current, maxSeq);
  }, [maxSeq]);

  // Beim ersten Anzeigen zur neuesten Nachricht scrollen (ohne Fokus zu verschieben).
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, []);

  // Eigener Lesestand (privat, nie für die Gegenseite sichtbar).
  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    const seq = lastSeqRef.current;
    if (seq <= lastMarkedRef.current) return;
    lastMarkedRef.current = seq;
    void markConversationReadAction(conversationId, seq);
  }, [conversationId]);

  useEffect(() => {
    markRead();
  }, [maxSeq, markRead]);

  useEffect(() => {
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [markRead]);

  // Echtzeitkanal (SSE) mit Reconnect ab letzter Sequenz; nach wiederholten Fehlern Fallback.
  useEffect(() => {
    if (!canSend) return;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setInterval> | undefined;
    let failures = 0;
    let stopped = false;

    const startFallback = () => {
      setMode("fallback");
      fallbackTimer ??= setInterval(() => router.refresh(), FALLBACK_REFRESH_MS);
    };

    const connect = () => {
      if (stopped) return;
      if (typeof EventSource === "undefined") return startFallback();
      es = new EventSource(`/api/v1/conversations/${conversationId}/stream?after=${lastSeqRef.current}`);
      es.addEventListener("open", () => {
        failures = 0;
        setMode("live");
      });
      es.addEventListener("message", (e) => {
        try {
          const m = JSON.parse((e as MessageEvent<string>).data) as ChatMessage;
          lastSeqRef.current = Math.max(lastSeqRef.current, m.seq);
          setLive((prev) => ({ ...prev, [m.id]: m }));
          if (!m.mine) setAnnouncement(`Neue Nachricht von ${otherPseudonym}`);
        } catch {
          // ungültiges Ereignis ignorieren
        }
      });
      es.addEventListener("removed", (e) => {
        try {
          const { ids } = JSON.parse((e as MessageEvent<string>).data) as { ids: string[] };
          setRemoved((prev) => [...new Set([...prev, ...ids])]);
        } catch {
          // ignorieren
        }
      });
      es.addEventListener("closed", () => {
        // MSG04/SAF01: Entzug oder Blockierung wirkt sofort in der offenen Ansicht.
        es?.close();
        stopped = true;
        setClosedLocally(true);
        router.refresh();
      });
      es.addEventListener("reconnect", () => {
        es?.close();
        connect();
      });
      es.onerror = () => {
        es?.close();
        failures += 1;
        if (failures > 4) return startFallback();
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** failures, 15000));
      };
    };

    connect();
    return () => {
      stopped = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [canSend, conversationId, otherPseudonym, router]);

  const deliver = useCallback(
    async (p: Pending) => {
      setPending((list) => list.map((x) => (x.opId === p.opId ? { ...x, status: "sending", error: undefined } : x)));
      try {
        const res = await sendMessageAction(conversationId, p.body, p.opId);
        if (res.ok) {
          lastSeqRef.current = Math.max(lastSeqRef.current, res.seq);
          setLive((prev) => ({
            ...prev,
            [res.id]: { id: res.id, seq: res.seq, mine: true, body: p.body, createdAt: res.createdAt, op: p.opId },
          }));
          setPending((list) => list.filter((x) => x.opId !== p.opId));
          setAnnouncement("Nachricht gespeichert");
        } else {
          setPending((list) =>
            list.map((x) => (x.opId === p.opId ? { ...x, status: "failed", error: res.message, retryable: res.retryable } : x)),
          );
          setAnnouncement(`Nicht gesendet. ${res.message}`);
          if (res.closed) {
            setClosedLocally(true);
            router.refresh();
          }
        }
      } catch {
        setPending((list) =>
          list.map((x) =>
            x.opId === p.opId
              ? { ...x, status: "failed", error: "Keine Verbindung. Die Nachricht ist noch nicht gespeichert.", retryable: true }
              : x,
          ),
        );
        setAnnouncement("Nicht gesendet. Keine Verbindung.");
      }
    },
    [conversationId, router],
  );

  const groups = useMemo(() => groupByDay(messages, timeZone), [messages, timeZone]);

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {messages.length === 0 && visiblePending.length === 0 ? (
        <p className="border-y border-line py-8 text-center text-base text-ink-2">
          Noch keine Nachrichten. Schreib eine erste Nachricht, wenn du magst.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.day} aria-label={g.label} className="flex flex-col gap-4">
              {/* Tagestrenner als Haarlinie mit Mono-Datum */}
              <p className="flex items-center gap-4 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-2">
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
                <span className="text-center">{g.label}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
              </p>
              <ol className="flex flex-col gap-4">
                {g.items.map((m) => (
                  <MessageItem
                    key={m.id}
                    message={m}
                    otherPseudonym={otherPseudonym}
                    timeZone={timeZone}
                    onRemoved={(id) => setRemoved((prev) => [...new Set([...prev, id])])}
                  />
                ))}
              </ol>
            </section>
          ))}
          {visiblePending.length > 0 && (
            <ol className="flex flex-col gap-4" aria-label="Nachrichten, die noch nicht gespeichert sind">
              {visiblePending.map((p) => (
                <li key={p.opId} className="flex flex-col items-end gap-1.5">
                  <span className="sr-only">Deine Nachricht:</span>
                  <div className={cn(BUBBLE, "border border-dashed border-line-2 bg-sunk")}>
                    <PlainText text={p.body} />
                  </div>
                  {p.status === "sending" ? (
                    <span className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-ink-2">
                      <Icon name="loader" className="size-4 motion-safe:animate-spin" />
                      Wird gesendet …
                    </span>
                  ) : (
                    <div className="flex max-w-[85%] flex-col items-end gap-1.5 text-right sm:max-w-[70%]">
                      <span className="flex items-start gap-1.5 text-sm font-medium text-danger">
                        <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                        <span>Nicht gesendet{p.error ? ` – ${p.error}` : ""}</span>
                      </span>
                      <div className="flex gap-2">
                        {p.retryable && sendingAllowed && (
                          <Button size="sm" variant="secondary" onClick={() => void deliver(p)} icon={<Icon name="undo" className="size-4" />}>
                            Erneut versuchen
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setPending((l) => l.filter((x) => x.opId !== p.opId))}>
                          Verwerfen
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <div ref={endRef} />

      {mode === "fallback" && sendingAllowed && (
        <p className="text-sm text-ink-2">Die Live-Verbindung ist unterbrochen. Neue Nachrichten werden alle paar Sekunden geladen.</p>
      )}

      {sendingAllowed ? (
        <Composer
          otherPseudonym={otherPseudonym}
          onSend={(body) => {
            const p: Pending = { opId: crypto.randomUUID(), body, status: "sending" };
            setPending((list) => [...list, p]);
            void deliver(p);
          }}
        />
      ) : closedLocally && canSend ? (
        <Notice tone="neutral" title="Dieses Gespräch ist nicht mehr aktiv">
          Es können keine neuen Nachrichten gesendet werden.
        </Notice>
      ) : null}
    </div>
  );
}

function Composer({ otherPseudonym, onSend }: { otherPseudonym: string; onSend: (body: string) => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.replace(/\r\n?/g, "\n").trim();
    if (body.length === 0) return setError("Bitte schreibe eine Nachricht.");
    if (body.length > MAX) return setError("Höchstens 2 000 Zeichen.");
    setError(undefined);
    setDraft("");
    onSend(body);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[20px] border border-line-2 bg-surface p-4 sm:p-5" noValidate>
      <Field
        label={`Nachricht an ${otherPseudonym}`}
        hint="Nur Text, keine Anhänge. Mit Strg + Enter senden."
        error={error}
        counter={
          <span className={cn("tabular font-mono text-[0.8125rem]", draft.length > MAX ? "text-danger" : "text-ink-2")}>
            {draft.length.toLocaleString("de-CH")} / 2 000
          </span>
        }
      >
        {(p) => (
          <Textarea
            {...p}
            name="body"
            rows={3}
            maxLength={MAX}
            value={draft}
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-h-24"
          />
        )}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" icon={<Icon name="send" className="size-5" />}>
          Senden
        </Button>
      </div>
    </form>
  );
}

function MessageItem({
  message: m,
  otherPseudonym,
  timeZone,
  onRemoved,
}: {
  message: ChatMessage;
  otherPseudonym: string;
  timeZone: string;
  onRemoved: (id: string) => void;
}) {
  const time = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(m.createdAt));
  return (
    <li className={cn("flex flex-col gap-1.5", m.mine ? "items-end" : "items-start")}>
      <span className="sr-only">{m.mine ? "Du" : otherPseudonym}, {time}:</span>
      {m.body === null ? (
        <div className={cn(BUBBLE, "flex items-center gap-2 border border-dashed border-line-2 italic text-ink-2")}>
          <Icon name="minus" className="size-4 shrink-0" />
          Nachricht entfernt
        </div>
      ) : (
        <div className={cn(BUBBLE, "text-ink", m.mine ? "border border-transparent bg-sunk" : "border border-line bg-surface")}>
          <PlainText text={m.body} />
        </div>
      )}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 font-mono text-[0.8125rem] text-ink-2"
        aria-hidden={m.mine ? undefined : true}
      >
        <span aria-hidden="true" className="tabular">
          {time}
        </span>
        {m.mine && m.body !== null && (
          <>
            <span className="flex items-center gap-1">
              <Icon name="check" className="size-4" />
              Gespeichert
            </span>
            <RemoveMessageButton messageId={m.id} onRemoved={onRemoved} />
          </>
        )}
      </div>
    </li>
  );
}

function RemoveMessageButton({ messageId, onRemoved }: { messageId: string; onRemoved: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-my-1.5 inline-flex h-8 items-center rounded-[8px] px-2 font-sans text-sm font-medium text-ink-2 underline decoration-line-2 underline-offset-4 transition-colors duration-150 hover:bg-sunk hover:text-ink hover:decoration-current"
      >
        Entfernen
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nachricht entfernen?">
        <div className="flex flex-col gap-3 text-base text-ink-2">
          <p>Die Nachricht wird für dich und dein Gegenüber durch «Nachricht entfernt» ersetzt. Die Reihenfolge bleibt erhalten.</p>
          <p>Screenshots oder Kopien, die bereits erstellt wurden, können technisch nicht zurückgeholt werden.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const res = await removeMessageAction(messageId).catch(() => ({ ok: false, message: "Keine Verbindung." }));
              setBusy(false);
              if (res.ok) {
                setOpen(false);
                onRemoved(messageId);
              } else setError(res.message ?? "Das hat nicht geklappt.");
            }}
          >
            {busy ? "Wird entfernt …" : "Nachricht entfernen"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function groupByDay(messages: ChatMessage[], timeZone: string) {
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const dayLabel = new Intl.DateTimeFormat("de-CH", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const out: { day: string; label: string; items: ChatMessage[] }[] = [];
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const key = dayKey.format(d);
    const last = out[out.length - 1];
    if (last && last.day === key) last.items.push(m);
    else out.push({ day: key, label: dayLabel.format(d), items: [m] });
  }
  return out;
}
