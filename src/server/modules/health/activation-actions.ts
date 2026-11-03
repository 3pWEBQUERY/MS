"use server";

import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/action-state";
import { runAction, str } from "../../action";
import { actionViewer } from "../../auth/viewer";
import { recordHealthDecision } from "./consent";
import { healthReturnPath } from "./validation";

/**
 * S08 Gesundheitsbereich aktivieren (PRI01, US10, AT01): gesonderte, ausdrückliche Entscheidung.
 * Ein Widerruf erfolgt über S12 «Privatsphäre» (PRI02).
 */
export async function decideHealthAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const decision = str(formData, "decision");
    if (decision !== "granted" && decision !== "denied") return fail("Bitte wähle eine der beiden Möglichkeiten.");
    // Nach der Zustimmung direkt zum ursprünglich gewählten Ziel, z. B. dem Check-in (F02, HOM03).
    const next = healthReturnPath(str(formData, "weiter"));
    // Bereits aktiv: kein doppelter Nachweis.
    if (viewer.healthActive) redirect(next ?? "/mein-ms");
    await recordHealthDecision(viewer.accountId, decision);
    if (decision === "granted") redirect(next ? `${next}${next.includes("?") ? "&" : "?"}aktiviert=1` : "/mein-ms?aktiviert=1");
    redirect("/mein-ms?entscheidung=abgelehnt");
  });
}
