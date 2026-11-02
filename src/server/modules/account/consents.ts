import "server-only";
import { asc, eq } from "drizzle-orm";
import {
  ANALYTICS_CONSENT_VERSION,
  COMMUNITY_RULES_VERSION,
  HEALTH_CONSENT_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/catalog";
import { db } from "../../db";
import { communityProfiles, consentRecords } from "../../db/schema";

export type ConsentPurpose = "terms" | "privacy_notice" | "health_area" | "analytics" | "community_rules";
export type ConsentDecision = "granted" | "denied" | "withdrawn";

export type ConsentEvent = { textVersion: string; decision: ConsentDecision; channel: string; decidedAt: Date };

export type ConsentEntry = {
  purpose: ConsentPurpose;
  currentVersion: string;
  latest: ConsentEvent | null;
  history: ConsentEvent[];
};

export const PURPOSE_ORDER: ConsentPurpose[] = ["health_area", "analytics", "terms", "privacy_notice", "community_rules"];

const CURRENT_VERSION: Record<ConsentPurpose, string> = {
  terms: TERMS_VERSION,
  privacy_notice: PRIVACY_VERSION,
  health_area: HEALTH_CONSENT_VERSION,
  analytics: ANALYTICS_CONSENT_VERSION,
  community_rules: COMMUNITY_RULES_VERSION,
};

/**
 * S12 (PRI01, PRI02): je Zweck aktueller Stand und Verlauf. Nachweise sind versioniert,
 * kein überschriebenes Boolean (PRD 09). Community-Regeln stammen zusätzlich aus dem Profil.
 */
export async function getConsentOverview(accountId: string): Promise<ConsentEntry[]> {
  const rows = await db
    .select({
      purpose: consentRecords.purpose,
      textVersion: consentRecords.textVersion,
      decision: consentRecords.decision,
      channel: consentRecords.channel,
      decidedAt: consentRecords.decidedAt,
    })
    .from(consentRecords)
    .where(eq(consentRecords.accountId, accountId))
    .orderBy(asc(consentRecords.decidedAt))
    .limit(500);

  const [profile] = await db
    .select({ version: communityProfiles.rulesAcceptedVersion, at: communityProfiles.rulesAcceptedAt })
    .from(communityProfiles)
    .where(eq(communityProfiles.accountId, accountId))
    .limit(1);

  return PURPOSE_ORDER.map((purpose) => {
    const history: ConsentEvent[] = rows
      .filter((r) => r.purpose === purpose)
      .map((r) => ({ textVersion: r.textVersion, decision: r.decision, channel: r.channel, decidedAt: r.decidedAt }));
    if (purpose === "community_rules" && history.length === 0 && profile?.version && profile.at) {
      history.push({ textVersion: profile.version, decision: "granted", channel: "web", decidedAt: profile.at });
    }
    return {
      purpose,
      currentVersion: CURRENT_VERSION[purpose],
      latest: history.at(-1) ?? null,
      history: [...history].reverse(),
    };
  });
}

/** Letzte Entscheidung «withdrawn» zum Gesundheitsbereich und deren Zeitpunkt (PRI02). */
export function healthWithdrawnAt(entries: ConsentEntry[]): Date | null {
  const h = entries.find((e) => e.purpose === "health_area");
  return h?.latest?.decision === "withdrawn" ? h.latest.decidedAt : null;
}
