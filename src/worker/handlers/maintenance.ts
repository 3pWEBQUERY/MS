import { sql as dsql } from "drizzle-orm";
import { db } from "@/server/db";
import { RETENTION } from "@/server/modules/privacy/retention-rules";
import type { PeriodicTask } from "../types";

/** Betriebliche Bereinigung gemäss Aufbewahrungsplan (PRD 11). */
export const maintenanceTasks: PeriodicTask[] = [
  {
    // Unbestätigte Konten nach 7 Tagen löschen (ACC02, PRD 11); Token gelten ohnehin höchstens 24 h
    name: "unverified-accounts",
    everyMs: 60 * 60 * 1000,
    run: async () => {
      await db.execute(dsql`
        delete from identity.accounts
        where status = 'unverified' and email_verified_at is null
          and created_at < now() - make_interval(days => ${RETENTION.unverifiedDays})`);
    },
  },
  {
    name: "expired-sessions-and-tokens",
    everyMs: 30 * 60 * 1000,
    run: async () => {
      await db.execute(dsql`delete from identity.sessions where expires_at < now() - interval '1 day' or revoked_at < now() - interval '1 day'`);
      await db.execute(dsql`delete from identity.email_tokens where expires_at < now() - interval '1 day'`);
      await db.execute(dsql`delete from ops.rate_limit_counters where window_start < now() - interval '2 days'`);
    },
  },
  {
    // Kontaktanfragen verfallen nach 14 Tagen (MSG02)
    name: "expire-contact-requests",
    everyMs: 15 * 60 * 1000,
    run: async () => {
      await db.execute(dsql`
        update messaging.contact_relationships
        set status = 'expired', cooldown_until = now() + interval '30 days', updated_at = now(), version = version + 1
        where status = 'pending' and expires_at < now()`);
    },
  },
  {
    // Abgelaufene Sanktionen und Sonderzugriffe
    name: "expire-grants",
    everyMs: 5 * 60 * 1000,
    run: async () => {
      await db.execute(dsql`update ops.special_access_grants set status = 'expired' where status = 'approved' and expires_at < now()`);
    },
  },
  {
    // Sicherheitsereignisse und Audit nach 180 Tagen (PRD 11)
    name: "log-retention",
    everyMs: 24 * 60 * 60 * 1000,
    run: async () => {
      await db.execute(dsql`delete from ops.security_events where occurred_at < now() - interval '180 days'`);
      await db.transaction(async (tx) => {
        await tx.execute(dsql`select set_config('app.retention_job', 'on', true)`);
        await tx.execute(dsql`delete from ops.audit_events where occurred_at < now() - interval '180 days'`);
      });
      await db.execute(dsql`delete from ops.outbox_events where status = 'done' and updated_at < now() - interval '14 days'`);
    },
  },
];
