"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/action-state";
import { runAction, str } from "../../action";
import { actionViewer } from "../../auth/viewer";
import { withOwnerScope } from "../../db/scoped";
import { symptomDefinitions, symptomObservations } from "../../db/schema";
import { isUuid } from "./validation";

/**
 * Eigene Symptombezeichnungen entfernen (DIA05). Frühere Einträge bleiben unverändert, weil jede
 * Beobachtung ihre Bezeichnung zum Erfassungszeitpunkt (labelSnapshot) selbst trägt.
 * – nie verwendet: Bezeichnung wird vollständig gelöscht (Datensparsamkeit)
 * – verwendet: nur aus der Auswahl genommen; bestehende Einträge behalten sie wählbar
 * Auch nach Widerruf möglich (Datenhoheit).
 */
export async function removeOwnSymptomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await actionViewer();
    const id = str(formData, "id");
    const changed = isUuid(id)
      ? await withOwnerScope(viewer.accountId, async (tx) => {
          const own = and(eq(symptomDefinitions.id, id), eq(symptomDefinitions.ownerAccountId, viewer.accountId));
          const [used] = await tx
            .select({ id: symptomObservations.id })
            .from(symptomObservations)
            .where(and(eq(symptomObservations.accountId, viewer.accountId), eq(symptomObservations.definitionId, id)))
            .limit(1);
          if (!used) return tx.delete(symptomDefinitions).where(own).returning({ id: symptomDefinitions.id });
          return tx.update(symptomDefinitions).set({ active: false }).where(own).returning({ id: symptomDefinitions.id });
        })
      : [];
    if (changed.length === 0) return fail("Diese Bezeichnung ist nicht verfügbar.");
    redirect("/mein-ms/symptome?entfernt=1");
  });
}
