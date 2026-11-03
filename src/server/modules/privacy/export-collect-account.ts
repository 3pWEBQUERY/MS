import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { cantonName, interestLabel } from "@/lib/catalog";
import { db } from "../../db";
import {
  accounts,
  bookmarks,
  communityProfiles,
  consentRecords,
  notifications,
  privacyRequests,
  sessions,
  userPreferences,
} from "../../db/schema";
import { iso } from "./export-format";

/**
 * Export: Konto, Profil, Präferenzen, Einwilligungsnachweise sowie persönliche
 * Verwaltungsdaten (Merkliste, Mitteilungen, Datenschutzaufträge) – PRI03.
 * Keine Passwort-Hashes, Token oder Faktor-Geheimnisse.
 */
export async function collectAccount(accountId: string) {
  const [account] = await db
    .select({
      email: accounts.email,
      status: accounts.status,
      createdAt: accounts.createdAt,
      emailVerifiedAt: accounts.emailVerifiedAt,
      audienceConfirmedAt: accounts.audienceConfirmedAt,
      termsVersion: accounts.termsVersion,
      mfaEnabled: accounts.mfaEnabled,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (!account) throw new Error("account_missing");

  const [[profile], [prefs], consents, ownSessions, marks, hints, requests] = await Promise.all([
    db
      .select({
        pseudonym: communityProfiles.pseudonym,
        interests: communityProfiles.interests,
        canton: communityProfiles.canton,
        discoverable: communityProfiles.discoverable,
        onboardingGoal: communityProfiles.onboardingGoal,
        onboardingCompletedAt: communityProfiles.onboardingCompletedAt,
        rulesAcceptedVersion: communityProfiles.rulesAcceptedVersion,
        rulesAcceptedAt: communityProfiles.rulesAcceptedAt,
      })
      .from(communityProfiles)
      .where(eq(communityProfiles.accountId, accountId)),
    db
      .select({
        locale: userPreferences.locale,
        timezone: userPreferences.timezone,
        simpleView: userPreferences.simpleView,
        textScale: userPreferences.textScale,
        motion: userPreferences.motion,
        theme: userPreferences.theme,
        emailSocial: userPreferences.emailSocial,
        inAppTypes: userPreferences.inAppTypes,
        quietStart: userPreferences.quietStart,
        quietEnd: userPreferences.quietEnd,
        pausedUntil: userPreferences.pausedUntil,
      })
      .from(userPreferences)
      .where(eq(userPreferences.accountId, accountId)),
    db
      .select({
        purpose: consentRecords.purpose,
        textVersion: consentRecords.textVersion,
        decision: consentRecords.decision,
        channel: consentRecords.channel,
        decidedAt: consentRecords.decidedAt,
      })
      .from(consentRecords)
      .where(eq(consentRecords.accountId, accountId))
      .orderBy(asc(consentRecords.decidedAt)),
    db
      .select({ deviceType: sessions.deviceType, browser: sessions.browser, createdAt: sessions.createdAt, lastUsedAt: sessions.lastUsedAt })
      .from(sessions)
      .where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt))),
    db
      .select({ targetType: bookmarks.targetType, targetId: bookmarks.targetId, createdAt: bookmarks.createdAt })
      .from(bookmarks)
      .where(eq(bookmarks.accountId, accountId))
      .orderBy(desc(bookmarks.createdAt)),
    db
      .select({ type: notifications.type, createdAt: notifications.createdAt, readAt: notifications.readAt })
      .from(notifications)
      .where(eq(notifications.accountId, accountId))
      .orderBy(desc(notifications.createdAt))
      .limit(1000),
    db
      .select({
        receiptNumber: privacyRequests.receiptNumber,
        type: privacyRequests.type,
        status: privacyRequests.status,
        createdAt: privacyRequests.createdAt,
        completedAt: privacyRequests.completedAt,
      })
      .from(privacyRequests)
      .where(eq(privacyRequests.accountId, accountId)),
  ]);

  return {
    konto: {
      email: account.email,
      status: account.status,
      erstellt_am_utc: iso(account.createdAt),
      email_bestaetigt_am_utc: iso(account.emailVerifiedAt),
      zielgruppe_bestaetigt_am_utc: iso(account.audienceConfirmedAt),
      bedingungen_fassung: account.termsVersion,
      zweiter_faktor_aktiv: account.mfaEnabled,
      aktive_sitzungen: ownSessions.map((s) => ({
        geraet: s.deviceType,
        browser: s.browser,
        angemeldet_am_utc: iso(s.createdAt),
        zuletzt_genutzt_utc: iso(s.lastUsedAt),
      })),
    },
    profil: profile
      ? {
          pseudonym: profile.pseudonym,
          interessen: profile.interests.map((c) => ({ code: c, bezeichnung: interestLabel(c) })),
          kanton: profile.canton ? { code: profile.canton, name: cantonName(profile.canton) } : null,
          auffindbar: profile.discoverable,
          nutzungsziel: profile.onboardingGoal,
          einfuehrung_abgeschlossen_utc: iso(profile.onboardingCompletedAt),
          community_regeln_fassung: profile.rulesAcceptedVersion,
          community_regeln_akzeptiert_utc: iso(profile.rulesAcceptedAt),
        }
      : null,
    praeferenzen: prefs
      ? {
          sprache: prefs.locale,
          zeitzone: prefs.timezone,
          einfache_ansicht: prefs.simpleView,
          schriftgroesse_prozent: prefs.textScale,
          bewegung: prefs.motion,
          farbschema: prefs.theme,
          email_hinweise: prefs.emailSocial,
          mitteilungsarten: prefs.inAppTypes,
          ruhezeit: { von: prefs.quietStart, bis: prefs.quietEnd },
          pausiert_bis_utc: iso(prefs.pausedUntil),
        }
      : null,
    einwilligungen: consents.map((c) => ({
      zweck: c.purpose,
      textfassung: c.textVersion,
      entscheidung: c.decision,
      kanal: c.channel,
      zeitpunkt_utc: iso(c.decidedAt),
    })),
    merkliste: marks.map((m) => ({ typ: m.targetType, ziel_id: m.targetId, gespeichert_utc: iso(m.createdAt) })),
    mitteilungen: hints.map((h) => ({ art: h.type, zeitpunkt_utc: iso(h.createdAt), gelesen_utc: iso(h.readAt) })),
    datenschutzauftraege: requests.map((r) => ({
      beleg: r.receiptNumber,
      typ: r.type,
      status: r.status,
      erstellt_utc: iso(r.createdAt),
      abgeschlossen_utc: iso(r.completedAt),
    })),
  };
}
