import "server-only";
import { and, eq } from "drizzle-orm";
import type { Viewer } from "../../auth/viewer";
import { db } from "../../db";
import { bookmarks } from "../../db/schema";

/** Ob das eigene Konto einen Inhalt gespeichert hat (HOM04) – nur eigene Merkliste, keine Zählung. */
export async function isBookmarked(viewer: Viewer | null, targetType: "article" | "offer", targetId: string): Promise<boolean> {
  if (!viewer) return false;
  const [row] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.accountId, viewer.accountId), eq(bookmarks.targetType, targetType), eq(bookmarks.targetId, targetId)))
    .limit(1);
  return Boolean(row);
}
