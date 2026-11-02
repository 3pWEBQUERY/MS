"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { actionViewer } from "../../auth/viewer";
import { db } from "../../db";
import { bookmarks } from "../../db/schema";
import { canViewPost, isUuid, loadPostAccess } from "./queries";

const input = z.object({
  targetType: z.enum(["post", "article", "offer"]),
  targetId: z.uuid(),
});

/**
 * Private Merkliste (HOM04): speichern und entfernen. Ob ein Ziel zugänglich ist,
 * wird beim Anzeigen geprüft (S27); unzugängliche Ziele liefern weder Titel noch Text.
 */
export async function toggleBookmarkAction(targetType: string, targetId: string, save: boolean): Promise<{ saved: boolean; error?: string }> {
  const parsed = input.safeParse({ targetType, targetId });
  if (!parsed.success) return { saved: !save, error: "Ungültiges Ziel" };
  let viewer;
  try {
    viewer = await actionViewer();
  } catch {
    return { saved: !save, error: "Bitte melde dich an, um Inhalte zu speichern." };
  }
  if (save) {
    // HOM04: nur zugängliche Beiträge speichern (Gruppenmitgliedschaft, Blockierung, Status).
    if (parsed.data.targetType === "post" && !canViewPost(viewer, await loadPostAccess(viewer, parsed.data.targetId)))
      return { saved: false, error: "Dieser Beitrag kann nicht gespeichert werden." };
    await db
      .insert(bookmarks)
      .values({ accountId: viewer.accountId, targetType: parsed.data.targetType, targetId: parsed.data.targetId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.accountId, viewer.accountId),
          eq(bookmarks.targetType, parsed.data.targetType),
          eq(bookmarks.targetId, parsed.data.targetId),
        ),
      );
  }
  refresh();
  return { saved: save };
}

/** S27: privaten Verweis entfernen – auch wenn das Ziel nicht mehr zugänglich ist (HOM04). */
export async function removeBookmarkAction(formData: FormData): Promise<void> {
  const id = formData.get("bookmarkId");
  if (!isUuid(id)) return;
  let viewer;
  try {
    viewer = await actionViewer();
  } catch {
    return;
  }
  await db.delete(bookmarks).where(and(eq(bookmarks.id, id), eq(bookmarks.accountId, viewer.accountId)));
  refresh();
}
