"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MOMENT_INTENTS, type MomentIntent, type MomentTarget } from "@/lib/moment";
import { sendAnalytics } from "@/components/analytics/beacon";
import { Icon } from "@/components/ui/icon";

/**
 * S19 Mein Moment (HOM02): Absicht wählen, höchstens drei Ziele, jederzeit zurücksetzbar.
 * Die Auswahl lebt nur in dieser Ansicht und wird nicht als Profil gespeichert; höchstens der grobe
 * Weg wird mit Analytics-Einwilligung als Ereignis gezählt (PRD 15 «moment_path_selected»).
 * Beim Zurücksetzen bleibt der Tastaturfokus in der Auswahl (A03).
 */
export function MeinMoment({
  targets,
  emptyNotes,
}: {
  targets: Record<MomentIntent, MomentTarget[]>;
  emptyNotes: Record<MomentIntent, string>;
}) {
  const [intent, setIntent] = useState<MomentIntent | null>(null);
  const firstIntent = useRef<HTMLButtonElement>(null);
  const list = intent ? targets[intent] : [];
  const reset = () => {
    setIntent(null);
    firstIntent.current?.focus();
  };

  return (
    <section aria-labelledby="moment-title" className="rounded-[28px] bg-deep text-on-deep">
      <div className="flex flex-col gap-8 p-6 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-4">
            <p className="eyebrow !text-on-deep-2">
              <span className="index !text-deep-accent">01</span> Mein Moment
            </p>
            <h2 id="moment-title" className="display-md !text-on-deep [&_em]:!text-deep-accent">
              Was brauchst du <em>gerade?</em>
            </h2>
          </div>
          {intent && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center gap-1.5 rounded-[11px] px-3 text-sm font-semibold text-on-deep-2 hover:bg-on-deep/10 hover:text-on-deep"
            >
              <Icon name="undo" className="size-4" />
              Auswahl zurücksetzen
            </button>
          )}
        </div>
        <div role="group" aria-label="Absicht wählen" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {MOMENT_INTENTS.map((i, index) => {
            const active = intent === i.key;
            return (
              <button
                key={i.key}
                ref={index === 0 ? firstIntent : undefined}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setIntent(active ? null : i.key);
                  // PRD 15: nur der grobe Weg; gespeichert nur mit Einwilligung (serverseitig geprüft)
                  if (!active) sendAnalytics({ name: "moment_path_selected", params: { path: i.key } });
                }}
                className={cn(
                  "group flex min-h-20 flex-col items-start justify-between gap-2 rounded-[20px] border px-5 py-4 text-left transition-colors duration-150 sm:min-h-28 sm:gap-4",
                  active ? "border-on-deep bg-on-deep text-deep" : "border-deep-line text-on-deep hover:border-on-deep-2",
                )}
              >
                <span className={cn("font-mono text-xs tracking-[0.12em]", active ? "text-deep/70" : "text-on-deep-2")}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-display text-[1.5rem] leading-tight tracking-[-0.015em]">{i.label}</span>
                  <span className={cn("text-sm", active ? "text-deep/75" : "text-on-deep-2")}>{i.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div aria-live="polite">
        {intent && (
          <div className="border-t border-deep-line px-6 pb-4 pt-2 sm:px-10 sm:pb-6">
            {list.length === 0 ? (
              <p className="py-5 text-base text-on-deep-2">{emptyNotes[intent]}</p>
            ) : (
              <ul aria-label={`Vorschläge: ${MOMENT_INTENTS.find((i) => i.key === intent)?.label}`}>
                {list.map((t) => (
                  <li key={t.href + t.label} className="border-b border-deep-line last:border-b-0">
                    <Link href={t.href} data-focus-inset className="group flex items-center gap-4 py-4 sm:gap-6 sm:py-5">
                      <Icon name={t.icon} className="size-5 shrink-0 text-deep-accent" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="break-words text-lg font-semibold text-on-deep">{t.label}</span>
                        {/* Optionale Erläuterung – in der einfachen Ansicht ausgeblendet (HOM06) */}
                        <span className="text-sm text-on-deep-2" data-optional>
                          {t.description}
                        </span>
                      </span>
                      <Icon name="arrow-right" className="nudge size-5 shrink-0 text-on-deep-2 group-hover:text-on-deep" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
