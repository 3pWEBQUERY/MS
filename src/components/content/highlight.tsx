import { Fragment } from "react";

/** Suchausschnitt mit Markierungen aus ts_headline – als Text, nie als HTML (CON07). */
export function Highlight({ text, start = "\u0002", stop = "\u0003" }: { text: string; start?: string; stop?: string }) {
  const parts = text.split(new RegExp(`(${start}[^${stop}]*${stop})`, "g"));
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith(start) ? (
          <mark key={i} className="bg-accent-soft font-semibold text-ink">
            {p.slice(1, -1)}
          </mark>
        ) : (
          <Fragment key={i}>{p.replace(/[\u0000-\u0008\u000B-\u001F]/g, "")}</Fragment>
        ),
      )}
    </>
  );
}
