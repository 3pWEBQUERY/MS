"use server";

import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { articleVersions, mediaAssets } from "../../db/schema";
import { deleteObject, storageConfigured } from "../../storage";
import { actingRole, EDITOR_ROLES, isUuid } from "./staff";

/** Medien löschen – nur, wenn keine Artikelversion das Bild verwendet. */
export async function deleteMediaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, "mediaId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(id)) throw new UserError("Dieses Bild ist nicht verfügbar.");
    const [asset] = await db.select({ key: mediaAssets.objectKey }).from(mediaAssets).where(eq(mediaAssets.id, id));
    if (!asset) throw new UserError("Dieses Bild ist nicht verfügbar.");
    const [used] = await db.select({ c: count() }).from(articleVersions).where(eq(articleVersions.coverMediaId, id));
    if (Number(used?.c ?? 0) > 0) throw new UserError("Dieses Bild wird in mindestens einer Artikelversion verwendet und kann nicht gelöscht werden.");
    if (!storageConfigured()) throw new UserError("Objektablage nicht konfiguriert (Railway Bucket verbinden).");
    await deleteObject(asset.key);
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "media.deleted", objectType: "media_asset", objectId: id });
    redirect("/verwaltung/medien?status=geloescht");
  });
}
