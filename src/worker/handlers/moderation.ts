import { and, eq, gt, inArray, isNull, lt, sql as dsql } from "drizzle-orm";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { appeals, evidenceItems, moderationActions, moderationCases, reports } from "@/server/db/schema";
import { staffWithRoles } from "@/server/modules/admin/common";
import { notify } from "@/server/modules/messaging/notify";
import { APPEAL_WINDOW_MS, EVIDENCE_RETENTION_MS, secondApprovalDueAt } from "@/server/modules/moderation/cases";
import type { PeriodicTask } from "../types";

/**
 * Periodische Aufgaben der Moderation (Kapitel 10, SAF03, SAF04, PRD 15):
 * – P0-Alarm an die Moderationsleitung (K01: «Leitung alarmieren»)
 * – Fristverletzungen einmalig protokollieren (Moderationsqualität, NFR16)
 * – überfällige zweite Freigaben melden (24 Betriebsstunden, gezählt in Betriebszeit)
 * – neue, noch nicht zugewiesene Einsprüche an die Leitung melden (SAF05: unabhängige Prüfung organisieren)
 * – entschiedene Fälle nach Ablauf der Einspruchsfrist abschliessen (Kapitel 10 «Abschluss»)
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
        .where(and(eq(moderationCases.priority, "P0"), inArray(moderationCases.status, [...OPEN]), gt(moderationCases.updatedAt, since)))
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
            // Reaktionsziel offen: P0–P2 noch nicht triagiert, P3 noch nicht entschieden (Kapitel 10).
            dsql`(${moderationCases.priority} = 'P3' or ${moderationCases.status} = 'new')`,
            dsql`not exists (select 1 from ops.audit_events e where e.action = 'case.deadline_missed' and e.object_id = "cases"."id"::text)`,
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
      const now = new Date();
      // 24 Betriebsstunden liegen mindestens 24 Kalenderstunden zurück – Vorfilter in SQL, Frist in Betriebszeit.
      const candidates = await db
        .select({ id: moderationActions.id, caseId: moderationActions.caseId, actorId: moderationActions.actorId, createdAt: moderationActions.createdAt })
        .from(moderationActions)
        .where(
          and(
            eq(moderationActions.requiresSecondApproval, 1),
            isNull(moderationActions.approvedAt),
            lt(moderationActions.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
          ),
        )
        .limit(200);
      const pending = candidates.filter((a) => secondApprovalDueAt(a.createdAt) < now);
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
    name: "moderation-appeals-unassigned",
    everyMs: 5 * 60 * 1000,
    run: async () => {
      // SAF05/US20: Die Leitung organisiert die unabhängige Prüfung – sie erfährt sofort von neuen Einsprüchen.
      const open = await db
        .select({ id: appeals.id, caseId: appeals.caseId })
        .from(appeals)
        .where(and(eq(appeals.status, "open"), isNull(appeals.assignedReviewerId)))
        .limit(100);
      if (open.length === 0) return;
      const recipients = await leads();
      for (const a of open) {
        for (const l of recipients) {
          await notify({ accountId: l.id, type: "system", targetType: "case", targetId: a.caseId, dedupeKey: `appeal-new:${a.id}:${l.id}` });
        }
      }
    },
  },
  {
    name: "moderation-auto-close",
    everyMs: 60 * 60 * 1000,
    run: async () => {
      // Entschiedene Fälle ohne offenen Einspruch nach Ablauf der 30-Tage-Frist abschliessen, damit die
      // fristgebundene Beweislöschung (180 Tage nach Abschluss) sicher greift.
      const now = new Date();
      const due = await db
        .select({ id: moderationCases.id, version: moderationCases.version })
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.status, "decided"),
            lt(moderationCases.decidedAt, new Date(now.getTime() - APPEAL_WINDOW_MS - 24 * 60 * 60 * 1000)),
            dsql`not exists (select 1 from moderation.appeals a where a.case_id = "cases"."id" and a.status in ('open', 'in_review'))`,
          ),
        )
        .limit(200);
      for (const c of due) {
        await db.transaction(async (tx) => {
          const rows = await tx
            .update(moderationCases)
            .set({
              status: "closed",
              closedAt: now,
              evidencePurgeAfter: new Date(now.getTime() + EVIDENCE_RETENTION_MS),
              version: c.version + 1,
              updatedAt: now,
            })
            .where(and(eq(moderationCases.id, c.id), eq(moderationCases.version, c.version), eq(moderationCases.status, "decided")))
            .returning({ id: moderationCases.id });
          if (rows.length > 0)
            await audit({ actorId: null, actorRole: "system", action: "case.status.closed", objectType: "moderation_case", objectId: c.id }, tx);
        });
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
