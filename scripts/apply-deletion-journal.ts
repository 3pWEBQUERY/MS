/**
 * Löschjournal auf eine wiederhergestellte Datenbank anwenden (AT09, PRD 11
 * «Wiederherstellung und Sicherungsnachlauf»). Vor der Wiederfreigabe eines Restores PFLICHT:
 * gelöschte Konten, Gesundheitsdaten und Exporte dürfen nicht reaktiviert werden.
 *
 * Ablauf:
 *   1. Backup in eine NEUE Datenbank wiederherstellen (nie über die produktive).
 *   2. Journal aus der aktuellen Datenbank lesen (--source, Standard DATABASE_URL) und auf die
 *      wiederhergestellte anwenden (--target). Zuerst mit --dry-run prüfen.
 *        npx tsx scripts/apply-deletion-journal.ts --target postgres://…/ms_restore --dry-run
 *        npx tsx scripts/apply-deletion-journal.ts --target postgres://…/ms_restore
 *   3. Ergebnis (nur Anzahlen) im Betriebsticket dokumentieren, dann erst freigeben.
 *
 * Läuft mit der Eigentümerrolle (RLS greift nicht) und enthält keine Inhalte in der Ausgabe.
 */
import postgres from "postgres";

type Entry = { id: string; account_id: string; object_class: string; object_id: string | null; recorded_at: Date };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function eraseAccount(tx: postgres.TransactionSql, id: string): Promise<void> {
  // Gesundheitsdaten
  await tx`delete from health.symptom_observations where account_id = ${id}`;
  await tx`delete from health.diary_entries where account_id = ${id}`;
  await tx`delete from health.check_ins where account_id = ${id}`;
  await tx`delete from health.symptom_definitions where owner_account_id = ${id}`;
  // Community: Platzhalter ohne Text, wo andere geantwortet haben; sonst entfernen
  await tx`delete from community.comments where author_id = ${id}`;
  await tx`
    update community.posts set title = null, body = '', status = 'deleted', edited_at = null
    where author_id = ${id} and exists (select 1 from community.comments c where c.post_id = community.posts.id)`;
  await tx`delete from community.posts where author_id = ${id} and body <> ''`;
  await tx`delete from community.posts p where p.author_id = ${id} and not exists (select 1 from community.comments c where c.post_id = p.id)`;
  await tx`delete from community.bookmarks where account_id = ${id}`;
  await tx`delete from community.group_memberships where account_id = ${id}`;
  // Gespräche: eigene Texte aus beiden Ansichten, Kontakte beenden
  await tx`update messaging.messages set body_encrypted = null, deleted_at = coalesce(deleted_at, now()) where sender_id = ${id} and body_encrypted is not null`;
  await tx`delete from messaging.conversation_views where account_id = ${id}`;
  await tx`
    update messaging.contact_relationships
    set status = case when status = 'active' then 'ended'::messaging.contact_status
                      when initiator_id = ${id} then 'withdrawn'::messaging.contact_status
                      else 'declined'::messaging.contact_status end,
        ended_at = coalesce(ended_at, now()), ended_by = ${id}, version = version + 1
    where (account_low = ${id} or account_high = ${id}) and status in ('pending', 'active')`;
  await tx`delete from messaging.blocks where blocker_id = ${id} or blocked_id = ${id}`;
  await tx`delete from messaging.notifications where account_id = ${id} or actor_id = ${id}`;
  await tx`delete from messaging.delivery_jobs where account_id = ${id}`;
  // Identität
  await tx`delete from identity.community_profiles where account_id = ${id}`;
  await tx`delete from identity.user_preferences where account_id = ${id}`;
  await tx`delete from identity.email_tokens where account_id = ${id}`;
  await tx`delete from identity.mfa_factors where account_id = ${id}`;
  await tx`delete from identity.recovery_codes where account_id = ${id}`;
  await tx`delete from identity.sessions where account_id = ${id}`;
  await tx`update identity.role_assignments set revoked_at = coalesce(revoked_at, now()) where account_id = ${id}`;
  await tx`delete from privacy.export_jobs where account_id = ${id}`;
  await tx`update moderation.reports set reporter_id = null where reporter_id = ${id}`;
  await tx`update moderation.appeals set appellant_id = null where appellant_id = ${id}`;
  const [analytics] = await tx<{ ok: boolean }[]>`select to_regclass('analytics.subjects') is not null as ok`;
  if (analytics?.ok) await tx`delete from analytics.subjects where account_id = ${id}`;
  // Technischer Restdatensatz ohne Personendaten, nie wieder aktivierbar
  await tx`
    update identity.accounts set email = ${`geloescht-${id}@invalid.invalid`}, email_verified_at = null, password_hash = '!',
      status = 'deleted', mfa_enabled = false, last_active_at = null, deactivated_at = coalesce(deactivated_at, now())
    where id = ${id}`;
}

async function main() {
  const source = arg("source") ?? process.env.DATABASE_URL;
  const target = arg("target");
  const dryRun = process.argv.includes("--dry-run");
  if (!source || !target) throw new Error("Bitte --target (wiederhergestellte DB) und --source bzw. DATABASE_URL angeben.");
  if (source === target) throw new Error("Quelle und Ziel sind identisch – das Journal wird auf die wiederhergestellte Kopie angewendet.");

  const src = postgres(source, { max: 1, onnotice: () => {} });
  const dst = postgres(target, { max: 1, onnotice: () => {} });
  try {
    const journal = await src<Entry[]>`
      select id, account_id, object_class, object_id, recorded_at from privacy.deletion_journal order by recorded_at`;
    const counts: Record<string, number> = {};
    const accounts = [...new Set(journal.filter((e) => e.object_class === "account").map((e) => e.account_id))];

    await dst.begin(async (tx) => {
      for (const id of accounts) {
        await eraseAccount(tx, id);
        counts.account = (counts.account ?? 0) + 1;
      }
      for (const e of journal) {
        if (e.object_class === "health" && !accounts.includes(e.account_id)) {
          // Nur Daten, die zum Zeitpunkt der Löschung bestanden; spätere Neuerfassungen bleiben.
          await tx`delete from health.symptom_observations o using health.diary_entries d
                   where o.entry_id = d.id and d.account_id = ${e.account_id} and d.created_at <= ${e.recorded_at}`;
          await tx`delete from health.diary_entries where account_id = ${e.account_id} and created_at <= ${e.recorded_at}`;
          await tx`delete from health.check_ins where account_id = ${e.account_id} and created_at <= ${e.recorded_at}`;
          await tx`delete from health.symptom_definitions where owner_account_id = ${e.account_id} and created_at <= ${e.recorded_at}`;
        } else if (e.object_class === "export" && e.object_id) {
          await tx`delete from privacy.export_jobs where id = ${e.object_id}`;
        } else if (e.object_class === "post" && e.object_id) {
          await tx`update community.posts set title = null, body = '', status = 'deleted' where id = ${e.object_id}`;
        } else if (e.object_class === "comment" && e.object_id) {
          await tx`update community.comments set body = '', status = 'deleted' where id = ${e.object_id}`;
        } else if (e.object_class === "message" && e.object_id) {
          await tx`update messaging.messages set body_encrypted = null, deleted_at = coalesce(deleted_at, now()) where id = ${e.object_id}`;
        } else if (e.object_class === "account") {
          continue;
        }
        counts[e.object_class] = (counts[e.object_class] ?? 0) + 1;
        // Journal auch in der Kopie vollständig halten
        await tx`
          insert into privacy.deletion_journal (id, account_id, object_class, object_id, recorded_at)
          values (${e.id}, ${e.account_id}, ${e.object_class}, ${e.object_id}, ${e.recorded_at}) on conflict (id) do nothing`;
      }
      for (const e of journal.filter((x) => x.object_class === "account"))
        await tx`
          insert into privacy.deletion_journal (id, account_id, object_class, object_id, recorded_at)
          values (${e.id}, ${e.account_id}, ${e.object_class}, ${e.object_id}, ${e.recorded_at}) on conflict (id) do nothing`;
      // Keine offenen Hintergrundaufträge aus dem Backup erneut ausführen (z. B. alte Zustellungen)
      await tx`update ops.outbox_events set status = 'dead', last_error = 'restore' where status in ('pending', 'failed', 'processing')`;
      console.log(`Löschjournal: ${JSON.stringify(counts)} (${journal.length} Einträge)`);
      if (dryRun) throw new DryRun();
    });
    console.log("Löschjournal angewendet. Erst jetzt darf die Kopie freigegeben werden.");
  } catch (err) {
    if (err instanceof DryRun) console.log("Probelauf: Änderungen wurden zurückgerollt. Ohne --dry-run erneut ausführen.");
    else throw err;
  } finally {
    await src.end();
    await dst.end();
  }
}

class DryRun extends Error {}

main().catch((err) => {
  console.error(`Abbruch: ${err instanceof Error ? err.message : "Fehler"}`);
  process.exit(1);
});
