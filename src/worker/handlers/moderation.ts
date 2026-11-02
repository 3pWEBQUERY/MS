import { and, eq, inArray, isNull, lt, sql as dsql } from "drizzle-orm";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { evidenceItems, moderationActions, moderationCases, reports } from "@/server/db/schema";
import { staffWithRoles } from "@/server/modules/admin/common";
import { notify } from "@/server/modules/messaging/notify";
import type { PeriodicTask } from "../types";

/**
 * Periodische Aufgaben der Moderation (Kapitel 10, SAF03, SAF04, PRD 15):
 * – P0-Alarm an die Moderationsleitung (K01: «Leitung alarmieren»)
 * – Fristverletzungen einmalig protokollieren (Moderationsqualität, NFR16)
 * – überfällige zweite Freigaben melden (24 Betriebsstunden)
 * – fristgebundene Beweislöschung 180 Tage nach Abschluss
 * Mitteilungen sind neutral (nur Fall-ID), Audit ohne Freitexte.
 */

const OPEN = ["new", "triaged", "in_progress", "escalated"] as const;

async function leads() {
  return (await staffWithRoles(["moderation_lead"])).filter((s) => s.mfaEnabled);
}

export const moderationTasks: PeriodicTask[] = [
  {
    name: "moderation-p0-alarm",
    everyMs: 60 * 1000,
    run: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const cases = await db
        .select({ id: moderationCases.id })
        .from(moderationCases)
        .where(and(eq(moderationCases.priority, "P0"), inArray(moderationCases.status, [...OPEN]), dsql`${moderationCases.updatedAt} > ${since}`))
        .limit(100);
      if (cases.length === 0) return;
      const recipients = await leads();
      for (const c of cases) {
        for (const l of recipients) {
          // Dedupe je Fall und Person: genau ein Alarm, auch wenn die Priorität später auf P0 steigt.
          await notify({ accountId: l.id, type: "system", targetType: "case", targetId: c.id, dedupeKey: `p0-alarm:${c.id}:${l.id}` });
        }
      }
    },
  },
  {
    name: "moderation-deadlines",
    everyMs: 5 * 60 * 1000,
    run: async () => {
      const overdue = await db
        .select({ id: moderationCases.id, priority: moderationCases.priority })
        .from(moderationCases)
        .where(
          and(
            inArray(moderationCases.status, [...OPEN]),
            lt(moderationCases.dueAt, new Date()),
            dsql`not exists (select 1 from ops.audit_events e where e.action = 'case.deadline_missed' and e.object_id = ${moderationCases.id}::text)`,
          ),
        )
        .limit(200);
      for (const c of overdue) {
        await audit({ actorId: null, actorRole: "system", action: "case.deadline_missed", objectType: "moderation_case", objectId: c.id, ticket: c.priority });
      }
    },
  },
  {
    name: "moderation-approvals-overdue",
    everyMs: 15 * 60 * 1000,
    run: async () => {
      const limit = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pending = await db
        .select({ id: moderationActions.id, caseId: moderationActions.caseId, actorId: moderationActions.actorId })
        .from(moderationActions)
        .where(and(eq(moderationActions.requiresSecondApproval, 1), isNull(moderationActions.approvedAt), lt(moderationActions.createdAt, limit)))
        .limit(100);
      if (pending.length === 0) return;
      const recipients = await leads();
      for (const a of pending) {
        for (const l of recipients) {
          if (l.id === a.actorId) continue;
          await notify({ accountId: l.id, type: "system", targetType: "case", targetId: a.caseId, dedupeKey: `approval-overdue:${a.id}:${l.id}` });
        }
      }
    },
  },
  {
    name: "moderation-evidence-purge",
    everyMs: 60 * 60 * 1000,
    run: async () => {
      const due = await db
        .select({ id: moderationCases.id })
        .from(moderationCases)
        .where(and(eq(moderationCases.status, "closed"), lt(moderationCases.evidencePurgeAfter, new Date())))
        .limit(200);
      for (const c of due) {
        await db.transaction(async (tx) => {
          const rows = await tx.delete(evidenceItems).where(eq(evidenceItems.caseId, c.id)).returning({ id: evidenceItems.id });
          const details = await tx
            .update(reports)
            .set({ detailsEncrypted: null })
            .where(and(eq(reports.caseId, c.id), dsql`${reports.detailsEncrypted} is not null`))
            .returning({ id: reports.id });
          if (rows.length + details.length > 0)
            await audit({ actorId: null, actorRole: "system", action: "case.evidence_purged", objectType: "moderation_case", objectId: c.id }, tx);
        });
      }
    },
  },
];
