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
    <section aria-labelledby="recent-entries-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="recent-entries-title" className="text-xl font-[650] text-ink">
          Deine letzten Einträge
        </h2>
        {entries.length > 0 && (
          <Link href="/mein-ms" className="text-base font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
            Alle in Mein MS
          </Link>
        )}
      </div>
      {entries.length > 0 ? (
        <EntryList entries={entries} compact />
      ) : (
        <p className="rounded-[20px] border border-dashed border-line-2 bg-surface p-5 text-base text-ink-2">
          Hier erscheinen deine eigenen Einträge, sobald du etwas festhältst – wann und ob, entscheidest du.{" "}
          <Link href="/mein-ms" className="font-medium text-ink underline underline-offset-4">
            Zu Mein MS
          </Link>
        </p>
      )}
    </section>
  );
}
