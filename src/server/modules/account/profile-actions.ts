"use server";

import { and, eq, sql as dsql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { optStr, runAction, str, UserError } from "../../action";
import { actionViewer, AuthError } from "../../auth/viewer";
import { db } from "../../db";
import { communityProfiles, consentRecords, userPreferences } from "../../db/schema";
import { ANALYTICS_UI_VERSION } from "@/lib/analytics";
import { ANALYTICS_CONSENT_VERSION } from "@/lib/catalog";
import { audit } from "../../audit";
import { consume } from "../../rate-limit";
import { trackLater } from "../analytics/track";
import {
  cleanCanton,
  cleanGoal,
  cleanInterests,
  isUniqueViolation,
  normalizePseudonym,
  pseudonymAvailable,
  pseudonymProblem,
  tidyPseudonym,
} from "./profile";

const TAKEN = "Dieses Pseudonym wird bereits verwendet. Bitte wähle ein anderes.";

/** Schnelle Prüfung im Einführungsschritt 1 (S07), gedrosselt gegen Aufzählung. */
export async function checkPseudonymAction(raw: string): Promise<{ ok: boolean; message?: string }> {
  let viewer;
  try {
    viewer = await actionViewer({ allowSuspended: true });
  } catch (err) {
    return { ok: false, message: err instanceof AuthError ? err.message : "Bitte melde dich erneut an." };
  }
  const problem = pseudonymProblem(String(raw ?? ""), { allowRoleWords: viewer.isStaff });
  if (problem) return { ok: false, message: problem };
  if (!(await consume(`pseudonym-check:${viewer.accountId}`, 30, 600)))
    return { ok: false, message: "Bitte warte einen Moment, bevor du weitere Namen prüfst." };
  if (!(await pseudonymAvailable(raw, viewer.accountId))) return { ok: false, message: TAKEN };
  return { ok: true };
}

/* ───────────────────────── S07 Einführung (ACC06, F01) ───────────────────────── */
export async function completeOnboardingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    pseudonym: str(formData, "pseudonym"),
    canton: str(formData, "canton"),
    goal: str(formData, "goal"),
    interests: formData.getAll("interests").map(String),
    analytics: str(formData, "analytics"),
  };
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true });
    if (viewer.onboarded) redirect("/heute");
    // PRI01/PRD 15: eigene, nicht vorausgewählte Entscheidung; ohne Auswahl wird nichts gespeichert (= aus).
    const analytics = values.analytics === "granted" || values.analytics === "denied" ? values.analytics : null;

    const pseudonym = tidyPseudonym(values.pseudonym);
    const problem = pseudonymProblem(pseudonym, { allowRoleWords: viewer.isStaff });
    if (problem) return fail("Bitte prüfe dein Pseudonym.", { fieldErrors: { pseudonym: problem }, values });

    // Optionale Angaben: nur Codes aus kontrollierten Listen (ACC06)
    const interests = cleanInterests(values.interests);
    const canton = cleanCanton(optStr(formData, "canton"));
    const goal = cleanGoal(optStr(formData, "goal"));
    const now = new Date();

    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(communityProfiles)
          .values({
            accountId: viewer.accountId,
            pseudonym,
            pseudonymNormalized: normalizePseudonym(pseudonym),
            interests,
            canton,
            onboardingGoal: goal,
            onboardingCompletedAt: now,
          })
          .onConflictDoUpdate({
            target: communityProfiles.accountId,
            set: {
              pseudonym,
              pseudonymNormalized: normalizePseudonym(pseudonym),
              interests,
              canton,
              onboardingGoal: goal,
              onboardingCompletedAt: now,
              version: dsql`${communityProfiles.version} + 1`,
            },
          });
        await tx.insert(userPreferences).values({ accountId: viewer.accountId }).onConflictDoNothing();
        if (analytics) {
          await tx.insert(consentRecords).values({
            accountId: viewer.accountId,
            purpose: "analytics",
            textVersion: ANALYTICS_CONSENT_VERSION,
            decision: analytics,
            channel: "web",
          });
          await audit({ actorId: viewer.accountId, action: `consent.analytics.${analytics}`, objectType: "account", objectId: viewer.accountId }, tx);
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) return fail("Bitte prüfe dein Pseudonym.", { fieldErrors: { pseudonym: TAKEN }, values });
      throw err;
    }

    // PRD 15: nur mit erteilter Einwilligung «analytics» (eben in S07 oder früher); keine Rolle, kein Ziel, keine Diagnose.
    // trackLater läuft nach der Antwort, also nach dem Commit der Einwilligung oben.
    trackLater(viewer.accountId, { name: "onboarding_completed", params: { variant: "standard", uiVersion: ANALYTICS_UI_VERSION } });
    // F01: Ende ist S18 bzw. bei «Etwas festhalten» die gesonderte Aktivierung (S08)
    redirect(goal === "festhalten" ? "/mein-ms/aktivieren" : "/heute");
  }, values, { flow: "F01" });
}

/* ───────────────────────── S09 Eigenes Profil (ACC06, COM05) ───────────────────────── */
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    pseudonym: str(formData, "pseudonym"),
    canton: str(formData, "canton"),
    interests: formData.getAll("interests").map(String),
    discoverable: formData.get("discoverable") === "on" ? "on" : "",
  };
  return runAction(async () => {
    const viewer = await actionViewer();
    const version = Number(str(formData, "version"));
    const pseudonym = tidyPseudonym(values.pseudonym);
    const problem = pseudonymProblem(pseudonym, { allowRoleWords: viewer.isStaff });
    if (problem) return fail("Bitte prüfe dein Pseudonym.", { fieldErrors: { pseudonym: problem }, values });
    if (!(await consume(`profile-update:${viewer.accountId}`, 30, 3600)))
      return fail("Du hast dein Profil in der letzten Stunde sehr oft geändert. Bitte versuche es später erneut.", { values });

    const interests = cleanInterests(values.interests);
    const canton = cleanCanton(optStr(formData, "canton"));
    const discoverable = values.discoverable === "on";

    let updated: { version: number }[];
    try {
      updated = await db
        .update(communityProfiles)
        .set({
          pseudonym,
          pseudonymNormalized: normalizePseudonym(pseudonym),
          interests,
          canton,
          discoverable,
          version: dsql`${communityProfiles.version} + 1`,
        })
        .where(and(eq(communityProfiles.accountId, viewer.accountId), eq(communityProfiles.version, version)))
        .returning({ version: communityProfiles.version });
    } catch (err) {
      if (isUniqueViolation(err)) return fail("Bitte prüfe dein Pseudonym.", { fieldErrors: { pseudonym: TAKEN }, values });
      throw err;
    }
    // Optimistische Versionierung: kein stilles Überschreiben einer Änderung auf einem anderen Gerät
    if (updated.length === 0)
      throw new UserError(
        "Dein Profil wurde inzwischen auf einem anderen Gerät geändert. Lade die Seite neu, um den aktuellen Stand zu sehen.",
        undefined,
        { conflict: true },
      );
    refresh();
    return ok("Profil gespeichert.", { data: { version: updated[0].version } });
  }, values);
}
