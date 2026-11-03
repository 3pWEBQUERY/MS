import "server-only";
import { and, eq, isNotNull, lt, sql as dsql } from "drizzle-orm";
import { formatDate } from "@/lib/time";
import { audit } from "../../audit";
import { encrypt } from "../../crypto";
import { db } from "../../db";
import { accounts } from "../../db/schema";
import { env } from "../../env";
import { enqueue } from "../../outbox";
import { deactivateAccountForErasure, eraseHealthData } from "./erasure";
import { IDENTITY_METHODS } from "./requests";
import { inactivityCutoff, inactivityDeleteOn, RETENTION } from "./retention-rules";

/**
 * Periodische Bereinigung gemäss Aufbewahrungsplan (PRD 11), ausgeführt im Worker.
 * Unbestätigte Konten, Sitzungen/Token und Logs bereinigt src/worker/handlers/maintenance.ts.
 */

/** Konten, die automatisch betrachtet werden: weder gelöscht noch unbestätigt, ohne aktive Mitarbeitendenrolle. */
const eligible = dsql`
  ${accounts.status} in ('active', 'restricted', 'suspended')
  and ${accounts.emailVerifiedAt} is not null
  and not exists (
    select 1 from identity.role_assignments r
    where r.account_id = ${accounts.id} and r.revoked_at is null and (r.ends_at is null or r.ends_at > now()))`;

const lastActive = dsql`coalesce(${accounts.lastActiveAt}, ${accounts.createdAt})`;

/**
 * Konto und Profil (PRD 11): nach 24 Monaten Inaktivität Vorwarnung an die bestätigte Adresse.
 * Mitarbeitendenkonten sind ausgenommen – deren Zugriffe prüft die quartalsweise Rechteprüfung (PRI08).
 */
export async function notifyInactiveAccounts(now = new Date()): Promise<number> {
  const cutoff = inactivityCutoff(now);
  const due = await db
    .select({ id: accounts.id, email: accounts.email })
    .from(accounts)
    .where(
      and(
        eligible,
        dsql`${lastActive} < ${cutoff}`,
        // Keine Vorwarnung offen, oder seit der letzten Vorwarnung war das Konto aktiv
        dsql`(${accounts.inactivityNoticeAt} is null or ${accounts.inactivityNoticeAt} < ${lastActive})`,
      ),
    )
    .limit(200);

  const deleteOn = formatDate(inactivityDeleteOn(now), "Europe/Zurich");
  for (const acc of due) {
    await db.transaction(async (tx) => {
      const marked = await tx
        .update(accounts)
        .set({ inactivityNoticeAt: now })
        .where(and(eq(accounts.id, acc.id), dsql`(${accounts.inactivityNoticeAt} is null or ${accounts.inactivityNoticeAt} < ${lastActive})`))
        .returning({ id: accounts.id });
      if (marked.length === 0) return;
      await enqueue(
        {
          type: "email.inactivity_notice",
          aggregateType: "account",
          aggregateId: acc.id,
          payload: { toEncrypted: encrypt(acc.email), deleteOn, link: `${env.appUrl}/anmelden` },
          dedupeKey: `email.inactivity_notice:${acc.id}:${now.toISOString().slice(0, 10)}`,
        },
        tx,
      );
      await audit({ actorId: null, actorRole: "system", action: "account.inactivity_notice", objectType: "account", objectId: acc.id }, tx);
    });
  }
  return due.length;
}

/**
 * Nach Ablauf der 30-Tage-Frist ohne erneute Aktivität: Konto wie bei S16 sofort deaktivieren
 * und den Löschauftrag mit allen Teilschritten und Abschlussbeleg anlegen (PRI05, PRI06).
 */
export async function eraseInactiveAccounts(now = new Date()): Promise<number> {
  const noticeBefore = new Date(now.getTime() - RETENTION.inactivityGraceDays * 24 * 60 * 60 * 1000);
  const due = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eligible,
        isNotNull(accounts.inactivityNoticeAt),
        lt(accounts.inactivityNoticeAt, noticeBefore),
        dsql`${lastActive} <= ${accounts.inactivityNoticeAt}`,
      ),
    )
    .limit(50);
  for (const acc of due) {
    await deactivateAccountForErasure(acc.id, { actorId: null, identityMethod: IDENTITY_METHODS.inactivity });
  }
  return due.length;
}

/**
 * PRI02: Nach Widerruf ohne andere zulässige Grundlage werden Gesundheitsdaten binnen
 * 30 Tagen gelöscht. Ausgeführt ab Tag 28, damit die Frist sicher eingehalten wird;
 * eine erneute Aktivierung in der Zwischenzeit verhindert die Löschung.
 * Der Worker verbindet sich mit der Eigentümerrolle (docs/db-roles.sql) und sieht daher alle Zeilen.
 */
export async function eraseHealthAfterWithdrawal(): Promise<void> {
  const due = await db.execute<{ account_id: string }>(dsql`
    with latest as (
      select distinct on (account_id) account_id, decision, decided_at
      from identity.consent_records where purpose = 'health_area'
      order by account_id, decided_at desc
    )
    select l.account_id from latest l
    join identity.accounts a on a.id = l.account_id
    where l.decision = 'withdrawn'
      and l.decided_at < now() - make_interval(days => ${RETENTION.healthAfterWithdrawalRunFromDays})
      and a.status not in ('deletion_pending', 'deleted')
      and (exists (select 1 from health.check_ins c where c.account_id = l.account_id)
        or exists (select 1 from health.diary_entries d where d.account_id = l.account_id)
        or exists (select 1 from health.symptom_definitions s where s.owner_account_id = l.account_id))
    limit 100`);
  for (const row of due) {
    await eraseHealthData(row.account_id, { actorId: null, identityMethod: IDENTITY_METHODS.automatic });
  }
}

/** Einwilligungsnachweise gelöschter Konten nach 3 Jahren entfernen (PRD 11, Vorschlag D05). */
export async function purgeOldConsentProofs(): Promise<void> {
  await db.execute(dsql`
    delete from identity.consent_records r using identity.accounts a
    where a.id = r.account_id and a.status = 'deleted'
      and a.deactivated_at < now() - make_interval(years => ${RETENTION.consentProofYears})`);
}
