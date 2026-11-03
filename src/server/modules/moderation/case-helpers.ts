import "server-only";
import { and, eq } from "drizzle-orm";
import { RULE_REFS, type CaseStatus, type Priority } from "@/components/admin/labels";
import { str, UserError } from "../../action";
import { recordDenied } from "../../audit";
import type { Viewer } from "../../auth/viewer";
import { db, type Executor } from "../../db";
import { comments, moderationCases, posts, sanctions } from "../../db/schema";
import { isUuid } from "../admin/common";
import { canAccessCase } from "./cases";

/**
 * Gemeinsame Bausteine der Fall-Actions (SAF03–SAF05): Fall laden mit Zugriffsprüfung,
 * optimistische Versionierung, Sichtbarkeit von Inhalten und Sanktionen. Kein "use server" –
 * die Server Actions liegen in case-actions.ts, measure-actions.ts und appeal-actions.ts.
 */

export const MOD_ROLES = ["moderator", "moderation_lead"] as const;
export const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
export const RULE_VALUES = new Set(RULE_REFS.map((r) => r.value));
export const HOUR = 60 * 60 * 1000;

export type CaseRow = {
  id: string;
  status: CaseStatus;
  priority: Priority;
  assigneeId: string | null;
  targetType: "post" | "comment" | "profile" | "message" | "group";
  targetId: string;
  subjectAccountId: string | null;
  createdAt: Date;
  version: number;
};

export async function loadCase(viewer: Viewer, caseId: string, executor: Executor = db): Promise<CaseRow> {
  if (!isUuid(caseId)) throw new UserError("Dieser Fall ist nicht verfügbar.");
  const [c] = await executor
    .select({
      id: moderationCases.id,
      status: moderationCases.status,
      priority: moderationCases.priority,
      assigneeId: moderationCases.assigneeId,
      targetType: moderationCases.targetType,
      targetId: moderationCases.targetId,
      subjectAccountId: moderationCases.subjectAccountId,
      createdAt: moderationCases.createdAt,
      version: moderationCases.version,
    })
    .from(moderationCases)
    .where(eq(moderationCases.id, caseId));
  if (!c || !canAccessCase(viewer, c)) {
    if (c) await recordDenied("case_action", viewer.accountId, "moderation_case");
    throw new UserError("Dieser Fall ist nicht verfügbar.");
  }
  return c;
}

export function readVersion(formData: FormData): number {
  const v = Number(str(formData, "version"));
  return Number.isInteger(v) && v > 0 ? v : -1;
}

export const conflict = () => new UserError("Der Fall wurde inzwischen geändert. Bitte lade die Seite neu und prüfe den aktuellen Stand.");

/** Optimistische Versionierung: setzt Felder nur, wenn der gelesene Stand noch aktuell ist. */
export async function bumpCase(
  tx: Executor,
  c: CaseRow,
  version: number,
  set: Partial<typeof moderationCases.$inferInsert>,
): Promise<void> {
  const rows = await tx
    .update(moderationCases)
    .set({ ...set, version: c.version + 1, updatedAt: new Date() })
    .where(and(eq(moderationCases.id, c.id), eq(moderationCases.version, version)))
    .returning({ id: moderationCases.id });
  if (rows.length === 0) throw conflict();
}

/** Setzt Beitrag oder Antwort auf «ausgeblendet» bzw. zurück auf «veröffentlicht». */
export async function setContentVisibility(tx: Executor, c: CaseRow, hidden: boolean): Promise<boolean> {
  const from = hidden ? "published" : "hidden";
  const to = hidden ? "hidden" : "published";
  if (c.targetType === "post") {
    const r = await tx
      .update(posts)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(posts.id, c.targetId), eq(posts.status, from)))
      .returning({ id: posts.id });
    return r.length > 0;
  }
  if (c.targetType === "comment") {
    const r = await tx
      .update(comments)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(comments.id, c.targetId), eq(comments.status, from)))
      .returning({ id: comments.id });
    return r.length > 0;
  }
  return false;
}

export async function applySanction(tx: Executor, c: CaseRow, kind: "write_suspend" | "account_suspend", durationHours: number) {
  if (!c.subjectAccountId) throw new UserError("Für diesen Fall ist kein betroffenes Konto bekannt.");
  const now = new Date();
  await tx.insert(sanctions).values({
    accountId: c.subjectAccountId,
    kind,
    caseId: c.id,
    startsAt: now,
    endsAt: durationHours > 0 ? new Date(now.getTime() + durationHours * HOUR) : null,
  });
}
