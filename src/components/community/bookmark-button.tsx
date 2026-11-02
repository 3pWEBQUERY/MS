"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toggleBookmarkAction } from "@/server/modules/community/bookmark-actions";

/**
 * Speichern-Schalter (HOM04, F03). Gäste werden zum Login geführt, Lesen bleibt ohne Konto möglich.
 * `loggedIn` wird von der Server-Komponente übergeben.
 */
export function BookmarkButton({
  targetType,
  targetId,
  initialSaved,
  loggedIn,
  returnTo,
  size = "sm",
}: {
  targetType: "post" | "article" | "offer";
  targetId: string;
  initialSaved: boolean;
  loggedIn: boolean;
  returnTo: string;
  size?: "sm" | "md";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!loggedIn) {
    return (
      <Link
        href={`/anmelden?next=${encodeURIComponent(returnTo)}`}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line-2 bg-surface px-3.5 text-sm font-semibold text-ink hover:border-field"
      >
        <Icon name="bookmark" className="size-4" />
        Anmelden zum Speichern
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        size={size}
        aria-pressed={saved}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await toggleBookmarkAction(targetType, targetId, !saved);
            if (res.error) setError(res.error);
            else setSaved(res.saved);
          })
        }
        icon={<Icon name={saved ? "bookmark-check" : "bookmark"} className="size-4" />}
      >
        {saved ? "Gespeichert" : "Speichern"}
      </Button>
      <span role="status" className="text-sm text-danger">
        {error}
      </span>
    </div>
  );
}
