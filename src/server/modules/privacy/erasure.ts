import "server-only";
import { and, eq, inArray, isNotNull, isNull, lte, ne, or, sql as dsql } from "drizzle-orm";
import { encrypt, receiptNumber } from "../../crypto";
import { db, type Executor, type Tx } from "../../db";
import {
  accounts,
  analyticsSubjects,
  appeals,
  blocks,
  bookmarks,
  checkIns,
  comments,
  communityProfiles,
  contactRelationships,
  conversationViews,
  deletionJournal,
  deliveryJobs,
  diaryEntries,
  emailTokens,
  erasureTasks,
  exportJobs,
  groupMemberships,
  messages,
  mfaFactors,
  notifications,
  posts,
  privacyRequests,
  recoveryCodes,
  reports,
  roleAssignments,
  sessions,
  specialAccessGrants,
  symptomDefinitions,
  symptomObservations,
  userPreferences,
} from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../outbox";
import { storageConfigured } from "../../storage";
import { removeExportObjects } from "./export";
import { dueDate, IDENTITY_METHODS } from "./requests";
import { ACCOUNT_TASKS, ESCALATE_AFTER, HEALTH_TASKS, NOT_APPLICABLE, taskKey, vendorReceipt, type TaskDef } from "./tasks";

/**
 * Löschung (PRI04–PRI06, PRD 09 «Löschung»-Zustandsautomat, PRD 11, AT09):
 * angefordert → deaktiviert → Teilschritte → geprüft → abgeschlossen.
 * Fehler führen zu Wiederholung und Eskalation, nie zum stillen Abschluss.
 */

class ErasureVerificationError extends Error {
  name = "ErasureVerificationError";
}

async function setOwnerContext(tx: Executor, accountId: string) {
  await tx.execute(dsql`select set_config('app.account_id', ${accountId}, true)`);
}

/** Entfernt sämtliche Gesundheitsdaten eines Kontos physisch (PRI04). Erwartet Inhaberkontext (RLS). */
async function deleteHealthRows(tx: Tx, accountId: string) {
  await setOwnerContext(tx, accountId);
  const obs = await tx
    .delete(symptomObservations)
    .where(eq(symptomObservations.accountId, accountId))
    .returning({ id: symptomObservations.id });
  const entries = await tx.delete(diaryEntries).where(eq(diaryEntries.accountId, accountId)).returning({ id: diaryEntries.id });
  const ci = await tx.delete(checkIns).where(eq(checkIns.accountId, accountId)).returning({ id: checkIns.id });
  const defs = await tx
    .delete(symptomDefinitions)
    .where(eq(symptomDefinitions.ownerAccountId, accountId))
    .returning({ id: symptomDefinitions.id });
  return { checkIns: ci.length, entries: entries.length, observations: obs.length, definitions: defs.length };
}

function healthReceipt(c: Awaited<ReturnType<typeof deleteHealthRows>>) {
  return `${c.checkIns} Check-ins, ${c.entries} Tagebucheinträge, ${c.observations} Symptomangaben, ${c.definitions} eigene Bezeichnungen entfernt`;
}

async function insertTasks(tx: Executor, requestId: string, defs: TaskDef[], done: Record<string, string> = {}) {
  await tx.insert(erasureTasks).values(
    defs.map((d) => {
      const receipt = done[taskKey(d)];
      return {
        requestId,
        system: d.system,
        objectClass: d.objectClass,
        status: receipt ? ("done" as const) : ("pending" as const),
        attempts: receipt ? 1 : 0,
        receipt: receipt ?? null,
      };
    }),
  );
}

/* ───────────────────────── PRI04 Gesundheitsdaten löschen ───────────────────────── */

export type HealthScope = { checkIns: number; entries: number; observations: number; definitions: number; exports: number };

/** Umfang für die bestätigte Inhaltsauswahl (S15/PRI04) – nur Anzahlen, keine Werte. */
export async function healthScope(accountId: string): Promise<HealthScope> {
  return db.transaction(async (tx) => {
    await setOwnerContext(tx, accountId);
    const [row] = await tx.execute<{ ci: number; en: number; ob: number; df: number; ex: number }>(dsql`
      select
        (select count(*)::int from health.check_ins where account_id = ${accountId}) as ci,
        (select count(*)::int from health.diary_entries where account_id = ${accountId}) as en,
        (select count(*)::int from health.symptom_observations where account_id = ${accountId}) as ob,
        (select count(*)::int from health.symptom_definitions where owner_account_id = ${accountId}) as df,
        (select count(*)::int from privacy.export_jobs where account_id = ${accountId} and status in ('queued','running','ready')) as ex
    `);
    return {
      checkIns: Number(row?.ci ?? 0),
      entries: Number(row?.en ?? 0),
      observations: Number(row?.ob ?? 0),
      definitions: Number(row?.df ?? 0),
      exports: Number(row?.ex ?? 0),
    };
  });
}

/**
 * Sofort nicht mehr nutzbar: Gesundheitsdaten werden in derselben Transaktion gelöscht,
 * laufende Exporte abgebrochen; Exportdateien entfernt der Worker («erasure.health»).
 * Das Community-Konto bleibt bestehen. Fremde Gesprächsdaten bleiben unberührt.
 */
export async function eraseHealthData(
  accountId: string,
  opts: { actorId: string | null; identityMethod: string },
): Promise<{ requestId: string; receipt: string }> {
  const receipt = receiptNumber("D");
  return db.transaction(async (tx) => {
    const counts = await deleteHealthRows(tx, accountId);
    const cancelled = await tx
      .update(exportJobs)
      .set({ status: "failed", errorCode: "superseded_by_erasure" })
      .where(and(eq(exportJobs.accountId, accountId), inArray(exportJobs.status, ["queued", "running"])))
      .returning({ id: exportJobs.id });
    const [req] = await tx
      .insert(privacyRequests)
      .values({
        accountId,
        receiptNumber: receipt,
        type: "erasure_health",
        status: "in_progress",
        identityMethod: opts.identityMethod,
        dueAt: dueDate(),
      })
      .returning({ id: privacyRequests.id });
    await insertTasks(tx, req.id, HEALTH_TASKS, {
      "database:health": healthReceipt(counts),
      "queues:export_jobs": `${cancelled.length} laufende Exportaufträge abgebrochen`,
      "search_index:fulltext": NOT_APPLICABLE.search_index,
      "cache:server_cache": NOT_APPLICABLE.cache,
    });
    await tx.insert(deletionJournal).values({ accountId, objectClass: "health", objectId: req.id });
    await enqueue(
      { type: "erasure.health", aggregateType: "privacy_request", aggregateId: req.id, dedupeKey: `erasure.health:${req.id}` },
      tx,
    );
    await audit(
      { actorId: opts.actorId, action: "privacy.erasure_health.executed", objectType: "privacy_request", objectId: req.id },
      tx,
    );
    return { requestId: req.id, receipt };
  });
}

/* ───────────────────────── PRI05 Konto löschen: sofortige Deaktivierung ───────────────────────── */

/**
 * Sofort: Konto deaktiviert, Sitzungen, Rollen, Kontakte, Freigaben, Auffindbarkeit,
 * Vorschauen und Zustellaufträge entzogen; eigene Beiträge und Nachrichtentexte aus beiden
 * Ansichten ausgeblendet (Platzhalter ohne Text und Autor). Keine Wiederaktivierung durch Login.
 */
export async function deactivateAccountForErasure(
  accountId: string,
  opts: { actorId?: string | null; identityMethod?: string } = {},
): Promise<{ requestId: string; receipt: string } | null> {
  const receipt = receiptNumber("D");
  // Ohne Angabe handelt die Kontoinhaberin selbst (S16); null = automatischer Systemauftrag (Inaktivität).
  const actorId = opts.actorId === undefined ? accountId : opts.actorId;
  const now = new Date();
  return db.transaction(async (tx) => {
    const changed = await tx
      .update(accounts)
      .set({
        status: "deletion_pending",
        deactivatedAt: now,
        deletionScheduledAt: now,
        version: dsql`${accounts.version} + 1`,
      })
      .where(and(eq(accounts.id, accountId), dsql`${accounts.status} not in ('deletion_pending', 'deleted')`))
      .returning({ id: accounts.id });
    if (changed.length === 0) return null;

    await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)));
    await tx
      .update(roleAssignments)
      .set({ revokedAt: now, revokedBy: actorId })
      .where(and(eq(roleAssignments.accountId, accountId), isNull(roleAssignments.revokedAt)));
    await tx.update(communityProfiles).set({ discoverable: false }).where(eq(communityProfiles.accountId, accountId));
    // Offene oder laufende Sonderzugriffe enden mit dem Konto (PRI07, PRI08)
    await tx
      .update(specialAccessGrants)
      .set({ status: "revoked" })
      .where(and(eq(specialAccessGrants.requesterId, accountId), inArray(specialAccessGrants.status, ["requested", "approved"])));

    // Kontakte beenden bzw. Anfragen zurückziehen/ablehnen (MSG02-Zustände)
    const mine = or(eq(contactRelationships.accountLow, accountId), eq(contactRelationships.accountHigh, accountId));
    await tx
      .update(contactRelationships)
      .set({
        status: dsql`case
          when ${contactRelationships.status} = 'active' then 'ended'::messaging.contact_status
          when ${contactRelationships.initiatorId} = ${accountId} then 'withdrawn'::messaging.contact_status
          else 'declined'::messaging.contact_status end`,
        endedAt: now,
        endedBy: accountId,
        version: dsql`${contactRelationships.version} + 1`,
      })
      .where(and(mine, inArray(contactRelationships.status, ["pending", "active"])));

    // Gruppenanfragen zurückziehen, Mitgliedschaften beenden
    await tx
      .update(groupMemberships)
      .set({
        status: dsql`case when ${groupMemberships.status} = 'requested' then 'withdrawn'::community.membership_status else 'left'::community.membership_status end`,
        decidedAt: now,
        version: dsql`${groupMemberships.version} + 1`,
      })
      .where(and(eq(groupMemberships.accountId, accountId), inArray(groupMemberships.status, ["requested", "active"])));

    // Eigene Texte sofort für alle ausgeblendet
    await tx
      .update(posts)
      .set({ status: "deleted", version: dsql`${posts.version} + 1` })
      .where(and(eq(posts.authorId, accountId), inArray(posts.status, ["published", "hidden"])));
    await tx
      .update(comments)
      .set({ status: "deleted", version: dsql`${comments.version} + 1` })
      .where(and(eq(comments.authorId, accountId), inArray(comments.status, ["published", "hidden"])));
    await tx
      .update(messages)
      .set({ bodyEncrypted: null, deletedAt: now })
      .where(and(eq(messages.senderId, accountId), isNotNull(messages.bodyEncrypted)));

    // Vorschauen bei anderen (Hinweise mit diesem Konto als Auslöser) und Zustellaufträge entziehen
    await tx.delete(notifications).where(eq(notifications.actorId, accountId));
    await tx
      .update(deliveryJobs)
      .set({ status: "skipped", lastErrorCode: "account_deleted" })
      .where(and(eq(deliveryJobs.accountId, accountId), eq(deliveryJobs.status, "pending")));
    await tx
      .update(exportJobs)
      .set({ status: "failed", errorCode: "account_deleted" })
      .where(and(eq(exportJobs.accountId, accountId), inArray(exportJobs.status, ["queued", "running"])));

    const [req] = await tx
      .insert(privacyRequests)
      .values({
        accountId,
        receiptNumber: receipt,
        type: "erasure_account",
        status: "deactivated",
        identityMethod: opts.identityMethod ?? IDENTITY_METHODS.session_reauth,
        dueAt: dueDate(now),
      })
      .returning({ id: privacyRequests.id });
    await insertTasks(tx, req.id, ACCOUNT_TASKS);
    // Löschjournal: wird vor Wiederfreigabe eines Restores angewendet (AT09)
    await tx.insert(deletionJournal).values({ accountId, objectClass: "account", objectId: accountId });
    await enqueue(
      { type: "erasure.account", aggregateType: "privacy_request", aggregateId: req.id, dedupeKey: `erasure.account:${req.id}` },
      tx,
    );
    await audit(
      {
        actorId,
        actorRole: actorId === null ? "system" : null,
        action: "privacy.erasure_account.requested",
        objectType: "privacy_request",
        objectId: req.id,
      },
      tx,
    );
    return { requestId: req.id, receipt };
  });
}

/* ───────────────────────── Worker: Teilschritte ───────────────────────── */

type StepFn = (accountId: string, ctx: { requestId: string; receipt: string; createdAt: Date }) => Promise<string>;

async function deleteAllExportObjects(accountId: string, before?: Date): Promise<string> {
  const jobs = await db
    .select({ id: exportJobs.id, objectKey: exportJobs.objectKey })
    .from(exportJobs)
    .where(
      and(
        eq(exportJobs.accountId, accountId),
        isNotNull(exportJobs.objectKey),
        before ? lte(exportJobs.createdAt, before) : undefined,
      ),
    );
  if (jobs.length > 0 && !storageConfigured()) throw new Error("storage_not_configured");
  for (const job of jobs) {
    await removeExportObjects(job.objectKey!);
    await db.update(exportJobs).set({ status: "expired", objectKey: null }).where(eq(exportJobs.id, job.id));
    await db.insert(deletionJournal).values({ accountId, objectClass: "export", objectId: job.id });
  }
  return `${jobs.length} Exportdateien aus der Objektablage entfernt`;
}

const ACCOUNT_STEPS: Record<string, StepFn> = {
  "database:community_texts": async (accountId) =>
    db.transaction(async (tx) => {
      // Beiträge mit Antworten anderer bleiben als Strukturrest ohne Text (fremde Texte bleiben deren Daten, PRD 11)
      const blanked = await tx
        .update(posts)
        .set({ title: null, body: "", status: "deleted", editedAt: null })
        .where(
          and(
            eq(posts.authorId, accountId),
            dsql`exists (select 1 from community.comments c where c.post_id = ${posts.id} and c.author_id <> ${accountId})`,
          ),
        )
        .returning({ id: posts.id });
      const removedComments = await tx.delete(comments).where(eq(comments.authorId, accountId)).returning({ id: comments.id });
      const removedPosts = await tx.delete(posts).where(and(eq(posts.authorId, accountId), ne(posts.body, ""))).returning({ id: posts.id });
      const removedEmpty = await tx
        .delete(posts)
        .where(
          and(
            eq(posts.authorId, accountId),
            dsql`not exists (select 1 from community.comments c where c.post_id = ${posts.id})`,
          ),
        )
        .returning({ id: posts.id });
      return `${removedPosts.length + removedEmpty.length} Beiträge entfernt, ${blanked.length} als Platzhalter ohne Text erhalten, ${removedComments.length} Antworten entfernt`;
    }),

  "database:messages": async (accountId) =>
    db.transaction(async (tx) => {
      const blanked = await tx
        .update(messages)
        .set({ bodyEncrypted: null, deletedAt: dsql`coalesce(${messages.deletedAt}, now())` })
        .where(and(eq(messages.senderId, accountId), isNotNull(messages.bodyEncrypted)))
        .returning({ id: messages.id });
      await tx.delete(conversationViews).where(eq(conversationViews.accountId, accountId));
      // Unnötige Teilnehmerverknüpfungen: Paare ohne Nachrichten der Gegenseite entfernen
      const removed = await tx
        .delete(contactRelationships)
        .where(
          and(
            or(eq(contactRelationships.accountLow, accountId), eq(contactRelationships.accountHigh, accountId)),
            dsql`not exists (
              select 1 from messaging.conversations c join messaging.messages m on m.conversation_id = c.id
              where c.relationship_id = ${contactRelationships.id} and m.sender_id <> ${accountId} and m.body_encrypted is not null)`,
          ),
        )
        .returning({ id: contactRelationships.id });
      return `${blanked.length} Nachrichtentexte entfernt, ${removed.length} Kontaktverknüpfungen entfernt; Nachrichten der Gegenseite bleiben deren Daten`;
    }),

  "database:health": async (accountId) => db.transaction(async (tx) => healthReceipt(await deleteHealthRows(tx, accountId))),

  "object_storage:exports": async (accountId) => {
    const r = await deleteAllExportObjects(accountId);
    await db.delete(exportJobs).where(eq(exportJobs.accountId, accountId));
    return r;
  },

  "database:profile_settings": async (accountId) =>
    db.transaction(async (tx) => {
      await tx.delete(communityProfiles).where(eq(communityProfiles.accountId, accountId));
      await tx.delete(userPreferences).where(eq(userPreferences.accountId, accountId));
      await tx.delete(bookmarks).where(eq(bookmarks.accountId, accountId));
      await tx.delete(groupMemberships).where(eq(groupMemberships.accountId, accountId));
      await tx.delete(blocks).where(or(eq(blocks.blockerId, accountId), eq(blocks.blockedId, accountId)));
      await tx.delete(notifications).where(eq(notifications.accountId, accountId));
      await tx.delete(deliveryJobs).where(eq(deliveryJobs.accountId, accountId));
      await tx.delete(emailTokens).where(eq(emailTokens.accountId, accountId));
      await tx.delete(mfaFactors).where(eq(mfaFactors.accountId, accountId));
      await tx.delete(recoveryCodes).where(eq(recoveryCodes.accountId, accountId));
      await tx.delete(sessions).where(eq(sessions.accountId, accountId));
      // Optionale Analytics: zufälliger Bezug samt Rohereignissen (Kaskade), PRD 15
      await tx.delete(analyticsSubjects).where(eq(analyticsSubjects.accountId, accountId));
      // Meldungen und Einsprüche bleiben Falldaten der Moderation (Frist PRD 11), ohne Personenverknüpfung
      await tx.update(reports).set({ reporterId: null }).where(eq(reports.reporterId, accountId));
      await tx.update(appeals).set({ appellantId: null }).where(eq(appeals.appellantId, accountId));
      return "Profil, Einstellungen, Merkliste, Mitgliedschaften, Blockierungen, Mitteilungen, Tokens, zweiter Faktor, Sitzungen und Analysebezug entfernt; Meldungen entkoppelt";
    }),

  "queues:outbox_delivery": async (accountId) => {
    const rows = await db.execute<{ id: string }>(dsql`
      update ops.outbox_events set status = 'dead', last_error = 'erasure', updated_at = now()
      where status in ('pending', 'failed')
        and type not in ('erasure.account', 'erasure.health', 'email.deletion_receipt')
        and aggregate_id = ${accountId}
      returning id`);
    const jobs = await db
      .update(deliveryJobs)
      .set({ status: "skipped", lastErrorCode: "account_deleted" })
      .where(and(eq(deliveryJobs.accountId, accountId), eq(deliveryJobs.status, "pending")))
      .returning({ id: deliveryJobs.id });
    return `${rows.length} wartende Hintergrundaufträge und ${jobs.length} Zustellaufträge gestoppt`;
  },

  "search_index:fulltext": async () => NOT_APPLICABLE.search_index,
  "cache:server_cache": async () => NOT_APPLICABLE.cache,
  "vendors:mail_provider": async () => vendorReceipt(),

  "database:account_record": async (accountId, ctx) => {
    await verifyAccountErased(accountId);
    await db.update(privacyRequests).set({ status: "verified" }).where(eq(privacyRequests.id, ctx.requestId));
    return db.transaction(async (tx) => {
      const [acc] = await tx.select({ email: accounts.email, status: accounts.status }).from(accounts).where(eq(accounts.id, accountId));
      if (acc && acc.status !== "deleted") {
        // Abschlussbeleg an den bestätigten Kontaktweg – vor dem Entfernen der Adresse (PRI05)
        await enqueue(
          {
            type: "email.deletion_receipt",
            aggregateType: "privacy_request",
            aggregateId: ctx.requestId,
            payload: { toEncrypted: encrypt(acc.email), receipt: ctx.receipt },
            dedupeKey: `email.deletion_receipt:${ctx.requestId}`,
          },
          tx,
        );
        // Technischer Restdatensatz ohne Personendaten: hält Antwortstrukturen und fremde
        // Gesprächsdaten zusammen (keine Kaskade auf fremde Texte), Status «gelöscht» (ACC08).
        await tx
          .update(accounts)
          .set({
            email: `geloescht-${accountId}@invalid.invalid`,
            emailVerifiedAt: null,
            passwordHash: "!",
            status: "deleted",
            mfaEnabled: false,
            lastActiveAt: null,
            version: dsql`${accounts.version} + 1`,
          })
          .where(eq(accounts.id, accountId));
      }
      return "Kontodatensatz anonymisiert (E-Mail und Passwort entfernt), Abschlussbeleg versendet";
    });
  },
};

/** Prüfung vor Abschluss (Zustand «geprüft»): keine Inhalte des Kontos mehr in aktiven Systemen. */
async function verifyAccountErased(accountId: string) {
  const [row] = await db.execute<Record<string, number>>(dsql`
    select
      (select count(*)::int from community.posts where author_id = ${accountId} and (body <> '' or title is not null)) as posts,
      (select count(*)::int from community.comments where author_id = ${accountId}) as comments,
      (select count(*)::int from messaging.messages where sender_id = ${accountId} and body_encrypted is not null) as messages,
      (select count(*)::int from identity.community_profiles where account_id = ${accountId}) as profiles,
      (select count(*)::int from identity.sessions where account_id = ${accountId}) as sessions,
      (select count(*)::int from privacy.export_jobs where account_id = ${accountId}) as exports
  `);
  const health = await db.transaction(async (tx) => {
    await setOwnerContext(tx, accountId);
    const [h] = await tx.execute<{ n: number }>(dsql`
      select (select count(*)::int from health.check_ins where account_id = ${accountId})
           + (select count(*)::int from health.diary_entries where account_id = ${accountId})
           + (select count(*)::int from health.symptom_definitions where owner_account_id = ${accountId}) as n`);
    return Number(h?.n ?? 0);
  });
  const remaining = Object.entries(row ?? {}).filter(([, v]) => Number(v) > 0);
  if (remaining.length > 0 || health > 0)
    throw new ErasureVerificationError(`remaining:${[...remaining.map(([k]) => k), health > 0 ? "health" : ""].filter(Boolean).join(",")}`);
}

const HEALTH_STEPS: Record<string, StepFn> = {
  "database:health": async (accountId) => db.transaction(async (tx) => healthReceipt(await deleteHealthRows(tx, accountId))),
  "queues:export_jobs": async (accountId) => {
    const r = await db
      .update(exportJobs)
      .set({ status: "failed", errorCode: "superseded_by_erasure" })
      .where(and(eq(exportJobs.accountId, accountId), inArray(exportJobs.status, ["queued", "running"])))
      .returning({ id: exportJobs.id });
    return `${r.length} laufende Exportaufträge abgebrochen`;
  },
  "object_storage:exports": async (accountId, ctx) => deleteAllExportObjects(accountId, ctx.createdAt),
  "search_index:fulltext": async () => NOT_APPLICABLE.search_index,
  "cache:server_cache": async () => NOT_APPLICABLE.cache,
};

/**
 * Führt offene Teilschritte eines Löschauftrags aus. Idempotent: erledigte Schritte werden
 * übersprungen. Ein Fehler wird am Teilschritt vermerkt und über die Outbox wiederholt;
 * nach ESCALATE_AFTER Versuchen eskaliert der Schritt und der Auftrag steht auf «failed».
 */
export async function runErasureRequest(requestId: string): Promise<void> {
  const [req] = await db
    .select({
      id: privacyRequests.id,
      accountId: privacyRequests.accountId,
      type: privacyRequests.type,
      status: privacyRequests.status,
      receiptNumber: privacyRequests.receiptNumber,
      createdAt: privacyRequests.createdAt,
    })
    .from(privacyRequests)
    .where(eq(privacyRequests.id, requestId));
  if (!req || !req.accountId) return;
  if (req.type !== "erasure_account" && req.type !== "erasure_health") return;
  // Abgeschlossen oder eskaliert: wartet auf die Datenschutzstelle (erneutes Anstossen über S58)
  if (req.status === "completed" || req.status === "failed" || req.status === "rejected") return;

  const steps = req.type === "erasure_account" ? ACCOUNT_STEPS : HEALTH_STEPS;
  const order = req.type === "erasure_account" ? ACCOUNT_TASKS : HEALTH_TASKS;
  const tasks = await db
    .select({ id: erasureTasks.id, system: erasureTasks.system, objectClass: erasureTasks.objectClass, status: erasureTasks.status, attempts: erasureTasks.attempts })
    .from(erasureTasks)
    .where(eq(erasureTasks.requestId, requestId));

  if (req.status === "requested" || req.status === "deactivated")
    await db.update(privacyRequests).set({ status: "in_progress" }).where(eq(privacyRequests.id, requestId));

  for (const def of order) {
    const task = tasks.find((t) => taskKey(t) === taskKey(def));
    if (!task || task.status === "done") continue;
    const step = steps[taskKey(def)];
    if (!step) continue;
    try {
      const receipt = await step(req.accountId, { requestId, receipt: req.receiptNumber, createdAt: req.createdAt });
      await db
        .update(erasureTasks)
        .set({ status: "done", receipt, attempts: task.attempts + 1 })
        .where(eq(erasureTasks.id, task.id));
    } catch (err) {
      const attempts = task.attempts + 1;
      const escalated = attempts >= ESCALATE_AFTER;
      const code = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 120) : "error";
      await db
        .update(erasureTasks)
        .set({ status: escalated ? "escalated" : "failed", attempts, receipt: `Fehler: ${code}` })
        .where(eq(erasureTasks.id, task.id));
      if (escalated) {
        await db.update(privacyRequests).set({ status: "failed" }).where(eq(privacyRequests.id, requestId));
        await audit({ actorId: null, actorRole: "system", action: "privacy.erasure.escalated", objectType: "privacy_request", objectId: requestId, result: "failed" });
        return;
      }
      throw err;
    }
  }

  const [open] = await db.execute<{ n: number }>(
    dsql`select count(*)::int as n from privacy.erasure_tasks where request_id = ${requestId} and status <> 'done'`,
  );
  if (Number(open?.n ?? 0) > 0) throw new ErasureVerificationError("open_tasks");
  await db
    .update(privacyRequests)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(privacyRequests.id, requestId));
  await audit({ actorId: null, actorRole: "system", action: `privacy.${req.type}.completed`, objectType: "privacy_request", objectId: requestId });
}
