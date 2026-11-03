import { getViewer } from "@/server/auth/viewer";
import { hasAnalyticsConsent } from "@/server/modules/analytics/track";
import { AnalyticsBeacon } from "./beacon";

/**
 * «Nützliche Aktion» (PRD 15) für öffentliche Seiten: nur für angemeldete Personen mit gültiger
 * Einwilligung wird überhaupt ein Beacon ausgeliefert. Liest die Sitzung – immer in <Suspense>.
 * Ohne Objekt-, Themen- oder Gruppen-ID.
 */
export async function UsefulActionSlot({ action }: { action: "article_opened" | "offer_opened" }) {
  const viewer = await getViewer();
  if (!viewer || !viewer.verified || viewer.accountSuspended) return null;
  if (!(await hasAnalyticsConsent(viewer.accountId))) return null;
  return <AnalyticsBeacon event={{ name: "useful_action_completed", params: { action, success: true } }} />;
}
