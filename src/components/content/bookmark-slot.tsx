import { BookmarkButton } from "@/components/community/bookmark-button";
import { getViewer } from "@/server/auth/viewer";
import { isBookmarked } from "@/server/modules/content/bookmarks";

/**
 * Speichern-Schalter für öffentliche Seiten (HOM04, F03). Liest die Sitzung – daher immer
 * innerhalb von <Suspense> verwenden. Gäste werden zum Login geführt.
 */
export async function BookmarkSlot({ targetType, targetId, returnTo }: { targetType: "article" | "offer"; targetId: string; returnTo: string }) {
  const viewer = await getViewer();
  const usable = Boolean(viewer && viewer.verified && !(viewer.mfaEnabled && !viewer.mfaVerified));
  const saved = usable ? await isBookmarked(viewer, targetType, targetId) : false;
  return <BookmarkButton targetType={targetType} targetId={targetId} initialSaved={saved} loggedIn={usable} returnTo={returnTo} />;
}
