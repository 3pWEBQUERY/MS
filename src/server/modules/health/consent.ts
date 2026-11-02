import "server-only";
import { db, type Executor } from "../../db";
import { consentRecords } from "../../db/schema";
import { HEALTH_CONSENT_VERSION } from "@/lib/catalog";
import { audit } from "../../audit";

/**
 * Gesundheitsbereich: gesonderte, ausdrückliche Entscheidung (S08, PRI01) und
 * Widerruf ohne Support (S12, PRI02). Jede Entscheidung ist ein neuer Nachweis.
 */
export async function recordHealthDecision(
  accountId: string,
  decision: "granted" | "denied" | "withdrawn",
  executor: Executor = db,
) {
  await executor.insert(consentRecords).values({
    accountId,
    purpose: "health_area",
    textVersion: HEALTH_CONSENT_VERSION,
    decision,
    channel: "web",
  });
  await audit({ actorId: accountId, action: `consent.health.${decision}`, objectType: "account", objectId: accountId }, executor);
}
