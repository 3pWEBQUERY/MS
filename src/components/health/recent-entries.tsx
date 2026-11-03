import Link from "next/link";
import type { Viewer } from "@/server/auth/viewer";
import { listRecentEntries } from "@/server/modules/health/queries";
import { EntryList } from "./entry-list";

/**
 * Baustein für S18 «Heute» (HOM01): letzte 3–5 eigene Einträge, nur bei aktivem
 * Gesundheitsbereich. Ohne Einträge ein ruhiger, optionaler Hinweis – keine
 * Aufforderung, keine Zugangssperre, keine Warnpunkte (HOM05).
 * Auf der Seite innerhalb von <Suspense> verwenden.
 */
export async function RecentEntries({ viewer, limit = 4 }: { viewer: Viewer; limit?: number }) {
  if (!viewer.healthActive) return null;
  const entries = await listRecentEntries(viewer, Math.min(Math.max(limit, 3), 5));
  return (
    <section aria-labelledby="recent-entries-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[0.8125rem] tracking-[0.12em] text-accent-ink" aria-hidden="true">
            02
          </span>
          <h2 id="recent-entries-title" className="display-sm">
            Deine letzten Einträge
          </h2>
        </div>
        {entries.length > 0 && (
          <Link href="/mein-ms" className="link-quiet text-base font-semibold text-ink">
            Alle in Mein MS
          </Link>
        )}
      </div>
      {entries.length > 0 ? (
        <EntryList entries={entries} compact />
      ) : (
        <p className="border-y border-line py-6 text-base text-ink-2">
          Hier erscheinen deine eigenen Einträge, sobald du etwas festhältst – wann und ob, entscheidest du.{" "}
          <Link href="/mein-ms" className="font-medium text-ink underline underline-offset-4">
            Zu Mein MS
          </Link>
        </p>
      )}
    </section>
  );
}
