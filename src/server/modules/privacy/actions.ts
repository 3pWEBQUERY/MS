"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { runAction, str } from "../../action";
import { audit } from "../../audit";
import { destroyCurrentSession } from "../../auth/session";
import { actionViewer, AuthError, hasRecentAuth } from "../../auth/viewer";
import { receiptNumber } from "../../crypto";
import { db } from "../../db";
import { exportJobs, privacyRequests } from "../../db/schema";
import { enqueue } from "../../outbox";
import { consume } from "../../rate-limit";
import { storageConfigured } from "../../storage";
import { deactivateAccountForErasure, eraseHealthData } from "./erasure";
import { dueDate, IDENTITY_METHODS } from "./requests";

/**
 * S15–S17 (PRI03–PRI05): Datenschutzrechte bleiben auch bei Kontosperre verfügbar
 * (PRD 03, ACC08). Sensible Aktionen verlangen eine erneute Anmeldung.
 */
async function rightsViewer({ reauth }: { reauth: boolean }) {
  const viewer = await actionViewer({ allowSuspended: true, allowNoProfile: true });
  if (reauth && !hasRecentAuth(viewer)) throw new AuthError("reauth");
  return viewer;
}

/* ───────────────────────── Auskunft anfordern (PRI03, PRD 11 Rechteprozess) ───────────────────────── */
export async function requestAccessAction(_prev: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await rightsViewer({ reauth: false });
    const [open] = await db
      .select({ receipt: privacyRequests.receiptNumber })
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.accountId, viewer.accountId),
          eq(privacyRequests.type, "access"),
          inArray(privacyRequests.status, ["requested", "in_progress", "verified"]),
        ),
      )
      .limit(1);
    if (open) return ok(`Deine Auskunftsanfrage ist bereits in Bearbeitung (Beleg ${open.receipt}).`);
    if (!(await consume(`access-request:${viewer.accountId}`, 3, 86400)))
      return fail("Du hast heute bereits mehrere Anfragen gestellt. Bitte versuche es morgen erneut.");

    const receipt = receiptNumber("A");
    await db.transaction(async (tx) => {
      const [req] = await tx
        .insert(privacyRequests)
        .values({
          accountId: viewer.accountId,
          receiptNumber: receipt,
          type: "access",
          status: "requested",
          identityMethod: IDENTITY_METHODS.session,
          dueAt: dueDate(),
        })
        .returning({ id: privacyRequests.id });
      await audit({ actorId: viewer.accountId, action: "privacy.access.requested", objectType: "privacy_request", objectId: req.id }, tx);
    });
    refresh();
    return ok(`Deine Auskunftsanfrage ist eingegangen. Beleg ${receipt}. Die Datenschutzstelle meldet sich über deine bestätigte E-Mail-Adresse.`);
  });
}

/* ───────────────────────── Export starten (PRI03, DIA08) ───────────────────────── */
export async function startExportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await rightsViewer({ reauth: true });
    const op = z.uuid().safeParse(str(formData, "clientOpId"));
    const clientOpId = op.success ? op.data : randomUUID();

    // Idempotent: dieselbe Vorgangskennung liefert denselben Auftrag
    const [existing] = await db
      .select({ id: exportJobs.id })
      .from(exportJobs)
      .where(and(eq(exportJobs.accountId, viewer.accountId), eq(exportJobs.clientOpId, clientOpId)))
      .limit(1);
    if (existing) redirect(`/konto/export/${existing.id}`);

    const [running] = await db
      .select({ id: exportJobs.id })
      .from(exportJobs)
      .where(and(eq(exportJobs.accountId, viewer.accountId), inArray(exportJobs.status, ["queued", "running"])))
      .limit(1);
    if (running) redirect(`/konto/export/${running.id}`);

    if (!(await consume(`export:${viewer.accountId}`, 5, 86400)))
      return fail("Du hast heute bereits fünf Exporte erstellt. Bitte versuche es morgen erneut.");

    const configured = storageConfigured();
    const jobId = await db.transaction(async (tx) => {
      const [job] = await tx
        .insert(exportJobs)
        .values({
          accountId: viewer.accountId,
          clientOpId,
          scope: "full",
          // Ohne Exportablage keine Ersatzablage in der Datenbank – klarer Fehlerzustand
          status: configured ? "queued" : "failed",
          errorCode: configured ? null : "storage_not_configured",
        })
        .onConflictDoNothing({ target: [exportJobs.accountId, exportJobs.clientOpId] })
        .returning({ id: exportJobs.id });
      if (!job) return null;
      if (configured)
        await enqueue(
          { type: "export.generate", aggregateType: "export_job", aggregateId: job.id, dedupeKey: `export.generate:${job.id}` },
          tx,
        );
      await audit({ actorId: viewer.accountId, action: "privacy.export.requested", objectType: "export_job", objectId: job.id }, tx);
      return job.id;
    });
    if (!jobId) {
      const [again] = await db
        .select({ id: exportJobs.id })
        .from(exportJobs)
        .where(and(eq(exportJobs.accountId, viewer.accountId), eq(exportJobs.clientOpId, clientOpId)));
      if (again) redirect(`/konto/export/${again.id}`);
      return fail("Der Export konnte nicht angelegt werden. Bitte versuche es erneut.");
    }
    redirect(`/konto/export/${jobId}`);
  });
}

/* ───────────────────────── PRI04 Gesundheitsdaten löschen ───────────────────────── */
export async function eraseHealthAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const viewer = await rightsViewer({ reauth: true });
    if (formData.get("confirm") !== "on")
      return fail("Bitte bestätige die Auswahl, bevor du löschst.", {
        fieldErrors: { confirm: "Bitte bestätige, dass alle aufgeführten Gesundheitsdaten gelöscht werden sollen." },
      });
    if (!(await consume(`erase-health:${viewer.accountId}`, 5, 3600)))
      return fail("Bitte warte etwas, bevor du es erneut versuchst.");
    const { receipt } = await eraseHealthData(viewer.accountId, {
      actorId: viewer.accountId,
      identityMethod: IDENTITY_METHODS.session_reauth,
    });
    redirect(`/konto/daten/gesundheit-loeschen?beleg=${encodeURIComponent(receipt)}`);
  });
}

/* ───────────────────────── PRI05 Konto löschen ───────────────────────── */
export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { phrase: str(formData, "phrase") };
  return runAction(async () => {
    const viewer = await rightsViewer({ reauth: true });
    const errors: Record<string, string> = {};
    if (values.phrase.toLocaleUpperCase("de-CH") !== "LÖSCHEN") errors.phrase = "Bitte tippe das Wort LÖSCHEN ein.";
    if (formData.get("confirm") !== "on") errors.confirm = "Bitte bestätige, dass du die Folgen gelesen hast.";
    if (Object.keys(errors).length > 0) return fail("Bitte bestätige die Löschung ausdrücklich.", { fieldErrors: errors, values });

    const result = await deactivateAccountForErasure(viewer.accountId);
    // Sitzungen sind bereits serverseitig widerrufen; hier wird zusätzlich das Cookie entfernt.
    await destroyCurrentSession();
    redirect(`/konto-geloescht${result ? `?beleg=${encodeURIComponent(result.receipt)}` : ""}`);
  }, values);
}
