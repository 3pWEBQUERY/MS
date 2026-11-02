"use server";

import { and, desc, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { ANALYTICS_CONSENT_VERSION } from "@/lib/catalog";
import { runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionViewer } from "../../auth/viewer";
import { db } from "../../db";
import { consentRecords } from "../../db/schema";
import { consume } from "../../rate-limit";
import { recordHealthDecision } from "../health/consent";

/**
 * S12 Einwilligungen (PRI01, PRI02): getrennte, unvorausgewählte Entscheidungen,
 * Widerruf ohne Support, Wirkung sofort. Auch bei Kontosperre verfügbar (PRD 03).
 */
export async function setHealthConsentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true });
    const decision = str(formData, "decision");
    if (decision !== "granted" && decision !== "withdrawn") throw new UserError("Diese Entscheidung ist nicht möglich.");
    if (formData.get("understood") !== "on")
      return fail("Bitte bestätige, dass du die Folgen gelesen hast.", {
        fieldErrors: { understood: "Bitte bestätige diesen Punkt." },
      });
    if (!(await consume(`consent:${viewer.accountId}`, 20, 3600)))
      return fail("Bitte warte etwas, bevor du diese Einstellung erneut änderst.");

    if (decision === "granted" && viewer.healthActive) return ok("Der Gesundheitsbereich ist bereits aktiviert.");
    if (decision === "withdrawn" && !viewer.healthActive) return ok("Der Gesundheitsbereich ist bereits nicht aktiv.");

    await db.transaction((tx) => recordHealthDecision(viewer.accountId, decision, tx));
    refresh();
    return ok(
      decision === "granted"
        ? "Der Gesundheitsbereich ist aktiviert. Du kannst jetzt Check-ins und Einträge festhalten."
        : "Widerruf gespeichert. Neue Einträge sind ab sofort gesperrt; bestehende Daten kannst du weiterhin ansehen, exportieren und löschen.",
    );
  });
}

/** Optionale Analytics: eigener Zweck, standardmässig aus (PRI01, PRD 15). */
export async function setAnalyticsConsentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer({ allowSuspended: true });
    const decision = str(formData, "decision");
    if (decision !== "granted" && decision !== "withdrawn") throw new UserError("Diese Entscheidung ist nicht möglich.");
    if (!(await consume(`consent:${viewer.accountId}`, 20, 3600)))
      return fail("Bitte warte etwas, bevor du diese Einstellung erneut änderst.");

    const [latest] = await db
      .select({ decision: consentRecords.decision })
      .from(consentRecords)
      .where(and(eq(consentRecords.accountId, viewer.accountId), eq(consentRecords.purpose, "analytics")))
      .orderBy(desc(consentRecords.decidedAt))
      .limit(1);
    const active = latest?.decision === "granted";
    if ((decision === "granted") === active) return ok("Diese Einstellung ist bereits gespeichert.");

    await db.transaction(async (tx) => {
      await tx.insert(consentRecords).values({
        accountId: viewer.accountId,
        purpose: "analytics",
        textVersion: ANALYTICS_CONSENT_VERSION,
        decision,
        channel: "web",
      });
      await audit({ actorId: viewer.accountId, action: `consent.analytics.${decision}`, objectType: "account", objectId: viewer.accountId }, tx);
    });
    refresh();
    return ok(decision === "granted" ? "Danke. Anonyme Nutzungsstatistik ist eingeschaltet." : "Anonyme Nutzungsstatistik ist ausgeschaltet.");
  });
}
