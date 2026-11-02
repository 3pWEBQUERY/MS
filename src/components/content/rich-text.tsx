import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Sicherer Renderer für das einfache Textformat der Redaktion (CON01): Absätze durch Leerzeilen,
 * «## »/«### » Zwischentitel, «- » Listen. Kein HTML wird interpretiert; https-Links werden als
 * erkennbare externe Links ausgegeben.
 */
type Block =
  | { kind: "h2" | "h3" | "p"; text: string }
  | { kind: "ul"; items: string[] };

export function parseBlocks(input: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list?.length) blocks.push({ kind: "ul", items: list });
    list = null;
  };
  for (const raw of input.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushPara();
      flushList();
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
    } else if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      flushPara();
      (list ??= []).push(line.slice(2).trim());
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<>"')]+)/g);
  const out: ReactNode[] = parts.map((p, i) =>
    /^https:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" className="break-all">
        {p.replace(/^https:\/\//, "")}
        <span className="sr-only"> (externer Link, öffnet in neuem Tab)</span>
      </a>
    ) : (
      p
    ),
  );
  return <>{out}</>;
}

/** Ausgabe in .prose-ms; `headingOffset` verschiebt Überschriften (z. B. h2 → h3 unter einem Abschnitt). */
export function RichText({ text, className, headingOffset = 0 }: { text: string; className?: string; headingOffset?: 0 | 1 }) {
  const blocks = parseBlocks(text);
  return (
    <div className={cn("prose-ms text-lg leading-relaxed", className)}>
      {blocks.map((b, i) => {
        if (b.kind === "ul")
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inline text={it} />
                </li>
              ))}
            </ul>
          );
        if (b.kind === "p")
          return (
            <p key={i}>
              <Inline text={b.text} />
            </p>
          );
        const Tag = (b.kind === "h2" ? (headingOffset ? "h3" : "h2") : headingOffset ? "h4" : "h3") as "h2" | "h3" | "h4";
        return (
          <Tag key={i} className="font-[650] tracking-[-0.01em] text-ink">
            {b.text}
          </Tag>
        );
      })}
    </div>
  );
}

/** Ungefähre Lesezeit für die Redaktion (200 Wörter pro Minute). */
export function estimateReadingMinutes(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}
