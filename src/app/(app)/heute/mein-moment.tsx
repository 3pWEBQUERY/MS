"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { MOMENT_INTENTS, type MomentIntent, type MomentTarget } from "@/lib/moment";
import { Icon } from "@/components/ui/icon";

/**
 * S19 Mein Moment: Absicht wählen, höchstens drei Ziele, jederzeit zurücksetzbar.
 * Die Auswahl lebt nur in dieser Ansicht – sie wird nicht gespeichert (HOM02).
 */
export function MeinMoment({ targets, healthNote }: { targets: Record<MomentIntent, MomentTarget[]>; healthNote?: string }) {
  const [intent, setIntent] = useState<MomentIntent | null>(null);
  const list = intent ? targets[intent] : [];

  return (
    <section aria-labelledby="moment-title" className="rounded-[28px] border border-line bg-surface p-2">
      <div className="flex flex-col gap-5 rounded-[20px] bg-sunk p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">Mein Moment</p>
            <h2 id="moment-title" className="text-2xl font-[650] tracking-[-0.02em] sm:text-3xl">
              Was brauchst du gerade?
            </h2>
          </div>
          {intent && (
            <button
              type="button"
              onClick={() => setIntent(null)}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-ink-2 hover:bg-surface hover:text-ink"
            >
              <Icon name="undo" className="size-4" />
              Auswahl zurücksetzen
            </button>
          )}
        </div>
        <div role="group" aria-label="Absicht wählen" className="grid gap-2 sm:grid-cols-3">
          {MOMENT_INTENTS.map((i) => {
            const active = intent === i.key;
            return (
              <button
                key={i.key}
                type="button"
                aria-pressed={active}
                onClick={() => setIntent(active ? null : i.key)}
                className={cn(
                  "flex min-h-20 flex-col items-start justify-center gap-0.5 rounded-[12px] border px-4 py-3 text-left transition-colors",
                  active ? "border-ink bg-ink text-ink-inverse" : "border-line bg-surface text-ink hover:border-line-2",
                )}
              >
                <span className="text-base font-semibold">{i.label}</span>
                <span className={cn("text-sm", active ? "opacity-80" : "text-ink-2")}>{i.description}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div aria-live="polite">
        {intent && (
          <div className="px-3 pb-3 pt-4 sm:px-5 sm:pb-5">
            {list.length === 0 ? (
              <p className="px-2 py-3 text-base text-ink-2">{healthNote}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-3">
                {list.map((t) => (
                  <li key={t.href + t.label}>
                    <Link
                      href={t.href}
                      className="group flex h-full items-start gap-3 rounded-[16px] border border-line p-4 transition-colors hover:border-line-2 hover:bg-raised"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-ink">
                        <Icon name={t.icon} className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-semibold text-ink">{t.label}</span>
                        <span className="text-sm text-ink-2">{t.description}</span>
                      </span>
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
