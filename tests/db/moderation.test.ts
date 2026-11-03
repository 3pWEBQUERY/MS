/**
 * QA07 / AT07 – Chatmeldung, begrenzte Belege, unveränderliche Belege (Trigger), Einspruch an
 * eine andere Person; keine Melderidentität in der Fallansicht.
 */
import { randomUUID } from "node:crypto";
import { sql as dsql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { appeals, moderationActions, moderationCases } from "@/server/db/schema";
import { respondToRequest, sendContactRequest } from "@/server/modules/messaging/contacts";
import { sendMessage } from "@/server/modules/messaging/conversations";
import { assignAppealAction } from "@/server/modules/moderation/appeal-actions";
import { getCaseForStaff } from "@/server/modules/moderation/cases";
import { createReport } from "@/server/modules/moderation/reports";
import { createMember, form, pgError, rows, signIn } from "./fixtures";

const idle = { status: "idle" } as const;

async function conversation(aId: string, bId: string) {
  const va = await signIn(aId);
  const sent = await sendContactRequest(va, bId);
  if (sent.kind !== "sent") throw new Error(sent.kind);
  const vb = await signIn(bId);
  const { conversationId } = await respondToRequest(vb, sent.relationshipId, true);
  return conversationId!;
}

describe("AT07 Chatmeldung und Einspruch", () => {
  it("Moderation sieht genau die drei gemeldeten Nachrichten und Fallmetadaten, keine anderen Chats, keine Melderidentität", async () => {
    const a = await createMember();
    const b = await createMember();
    const c = await createMember();
    const conv = await conversation(a.id, b.id);
    const otherConv = await conversation(b.id, c.id);
    const vb = await signIn(b.id);
    const fromB: string[] = [];
    for (let i = 1; i <= 4; i++) fromB.push((await sendMessage(vb, conv, `Nachricht ${i} von B`, randomUUID())).id);
    const foreign = (await sendMessage(vb, otherConv, "Anderes Gespräch mit C", randomUUID())).id;
    const va = await signIn(a.id);
    await sendMessage(va, conv, "Antwort von A", randomUUID());

    const selected = fromB.slice(0, 3);
    const result = await createReport(va, {
      type: "message",
      id: null,
      conversationId: conv,
      reason: "harassment",
      details: null,
      // eine fremde Nachricht (anderes Gespräch) wird ignoriert, nicht übernommen
      messageIds: [...selected, foreign],
    });
    expect(result.receiptNumber).toMatch(/^M-/);
    expect(result.subjectAccountId).toBe(b.id);

    const evidence = await rows<{ source_id: string; case_id: string; content_hash: string }>(
      dsql`select e.source_id, e.case_id, e.content_hash from moderation.evidence_items e
           join moderation.reports r on r.id = e.report_id where r.receipt_number = ${result.receiptNumber}`,
    );
    expect(evidence.map((e) => e.source_id).sort()).toEqual([...selected].sort());

    const lead = await createMember({ roles: ["moderation_lead", "moderator"] });
    const vLead = await signIn(lead.id);
    const detail = await getCaseForStaff(vLead, evidence[0]!.case_id);
    expect(detail).not.toBeNull();
    const json = JSON.stringify(detail);
    for (const i of [1, 2, 3]) expect(json).toContain(`Nachricht ${i} von B`);
    expect(json).not.toContain("Nachricht 4 von B");
    expect(json).not.toContain("Antwort von A");
    expect(json).not.toContain("Anderes Gespräch mit C");
    expect(json).not.toContain(a.id);
    expect(json).not.toContain(a.pseudonym);
    expect(json).not.toContain(a.email);

    // Gewöhnliche Moderation ohne Zuweisung: kein Zugriff, technisch erfasst
    const mod = await createMember({ roles: ["moderator"] });
    expect(await getCaseForStaff(await signIn(mod.id), evidence[0]!.case_id)).toBeNull();
    const denied = await rows<{ kind: string }>(dsql`select kind from ops.security_events where actor_id = ${mod.id}`);
    expect(denied.map((d) => d.kind)).toContain("case_access");
  });

  it("Belege sind unveränderlich (Trigger), die fristgebundene Löschung bleibt möglich", async () => {
    const a = await createMember();
    const b = await createMember();
    const conv = await conversation(a.id, b.id);
    const msg = await sendMessage(await signIn(b.id), conv, "Beleg", randomUUID());
    const res = await createReport(await signIn(a.id), {
      type: "message",
      id: null,
      conversationId: conv,
      reason: "spam_fraud",
      details: "Erläuterung",
      messageIds: [msg.id],
    });
    const [item] = await rows<{ id: string }>(
      dsql`select e.id from moderation.evidence_items e join moderation.reports r on r.id = e.report_id where r.receipt_number = ${res.receiptNumber}`,
    );
    expect(await pgError(db.execute(dsql`update moderation.evidence_items set content_hash = 'x' where id = ${item!.id}`))).toMatch(
      /Belege sind unveränderlich/,
    );
    expect(await pgError(db.execute(dsql`update moderation.evidence_items set captured_at = now() where id = ${item!.id}`))).toMatch(
      /Belege sind unveränderlich/,
    );
    await db.execute(dsql`delete from moderation.evidence_items where id = ${item!.id}`);
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from moderation.evidence_items where id = ${item!.id}`);
    expect(n).toBe(0);
  });

  it("Einspruch wird nie der entscheidenden Person zugewiesen", async () => {
    const subject = await createMember();
    const decider = await createMember({ roles: ["moderator"] });
    const other = await createMember({ roles: ["moderator"] });
    const lead = await createMember({ roles: ["moderation_lead", "moderator"] });
    const [kase] = await db
      .insert(moderationCases)
      .values({
        caseNumber: `F-T${randomUUID().slice(0, 6)}`,
        status: "decided",
        priority: "P2",
        dueAt: new Date(),
        targetType: "profile",
        targetId: subject.id,
        subjectAccountId: subject.id,
        assigneeId: decider.id,
      })
      .returning({ id: moderationCases.id });
    await db.insert(moderationActions).values({ caseId: kase!.id, actorId: decider.id, kind: "warn", publicReason: "Regel 2" });
    const [appeal] = await db
      .insert(appeals)
      .values({ caseId: kase!.id, appellantId: subject.id, reasonEncrypted: "v1.x.y.z" })
      .returning({ id: appeals.id });

    await signIn(lead.id);
    const self = await assignAppealAction(idle, form({ appealId: appeal!.id, reviewerId: decider.id }));
    expect(self).toMatchObject({ status: "error" });
    expect(self.message).toMatch(/beteiligt/);
    const own = await assignAppealAction(idle, form({ appealId: appeal!.id, reviewerId: subject.id }));
    expect(own.status).toBe("error");
    const okRes = await assignAppealAction(idle, form({ appealId: appeal!.id, reviewerId: other.id }));
    expect(okRes).toMatchObject({ status: "success" });
    const [stored] = await rows<{ assigned_reviewer_id: string; status: string }>(
      dsql`select assigned_reviewer_id, status from moderation.appeals where id = ${appeal!.id}`,
    );
    expect(stored).toEqual({ assigned_reviewer_id: other.id, status: "in_review" });
  });
});
