/**
 * QA01 / QA08 / AT09 – Kontolöschung gegen die echte Datenbank: Sitzungen, Chatschreiben und
 * Freigaben sofort ungültig, eigene Texte ausgeblendet, Löschjournal und Löschaufträge angelegt,
 * Worker-Löschung vollständig. Dazu Audit-Hash-Kette (PRI07) und Outbox-Deduplizierung (NFR19).
 */
import { randomUUID } from "node:crypto";
import { sql as dsql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { audit } from "@/server/audit";
import { revokeAllSessions } from "@/server/auth/session";
import { getViewer } from "@/server/auth/viewer";
import { verifyAuditChain } from "@/server/modules/admin/audit-chain";
import { getPostForViewer } from "@/server/modules/community/queries";
import { respondToRequest, sendContactRequest } from "@/server/modules/messaging/contacts";
import { sendMessage } from "@/server/modules/messaging/conversations";
import { deactivateAccountForErasure, runErasureRequest } from "@/server/modules/privacy/erasure";
import { enqueue } from "@/server/outbox";
import { createMember, createPost, db, pgError, rows, signIn } from "./fixtures";

describe("AT09 Löschung", () => {
  it("nach bestätigter Löschung sind Sitzung, Chatschreiben und Freigaben sofort ungültig; Texte ausgeblendet; Journal angelegt", async () => {
    const a = await createMember();
    const b = await createMember();
    const va = await signIn(a.id);
    const sent = await sendContactRequest(va, b.id);
    if (sent.kind !== "sent") throw new Error(sent.kind);
    const vb = await signIn(b.id);
    const { conversationId } = await respondToRequest(vb, sent.relationshipId, true);
    await sendMessage(va, conversationId!, "Text von A", randomUUID());
    const postId = await createPost(a.id, { body: "Öffentlicher Beitrag von A" });
    expect(await getPostForViewer(vb, postId)).not.toBeNull();

    await signIn(a.id); // aktuelle Sitzung im Cookie: A
    const result = await deactivateAccountForErasure(a.id);
    expect(result?.receipt).toMatch(/^D-/);
    // Sitzung sofort ungültig – auch kein erneutes Aktivieren über eine neue Sitzung
    expect(await getViewer()).toBeNull();
    await db.execute(dsql`insert into identity.sessions (account_id, token_hash, expires_at, idle_expires_at)
      values (${a.id}, ${randomUUID()}, now() + interval '1 hour', now() + interval '1 hour')`);
    expect(await getViewer()).toBeNull();

    const [rel] = await rows<{ status: string }>(dsql`select status from messaging.contact_relationships where id = ${sent.relationshipId}`);
    expect(rel!.status).toBe("ended");
    await signIn(b.id);
    await expect(sendMessage(vb, conversationId!, "Antwort an A", randomUUID())).rejects.toThrow();
    expect(await getPostForViewer(vb, postId)).toBeNull();
    const [msg] = await rows<{ body_encrypted: string | null; deleted_at: Date | null }>(
      dsql`select body_encrypted, deleted_at from messaging.messages where sender_id = ${a.id}`,
    );
    expect(msg).toMatchObject({ body_encrypted: null });
    expect(msg!.deleted_at).not.toBeNull();

    const [journal] = await rows<{ object_class: string }>(dsql`select object_class from privacy.deletion_journal where account_id = ${a.id}`);
    expect(journal!.object_class).toBe("account");
    const [outbox] = await rows<{ type: string; n: number }>(
      dsql`select type, count(*)::int as n from ops.outbox_events where aggregate_id = ${result!.requestId} group by type`,
    );
    expect(outbox).toEqual({ type: "erasure.account", n: 1 });
    // Zweiter Löschauftrag ist wirkungslos (idempotent)
    expect(await deactivateAccountForErasure(a.id)).toBeNull();

    // Hintergrundlöschung: alle Teilaufgaben erledigt, Antrag abgeschlossen
    await runErasureRequest(result!.requestId);
    const tasks = await rows<{ status: string }>(dsql`select status from privacy.erasure_tasks where request_id = ${result!.requestId}`);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.status === "done")).toBe(true);
    const [req] = await rows<{ status: string }>(dsql`select status from privacy.requests where id = ${result!.requestId}`);
    expect(req!.status).toBe("completed");
    const [{ posts }] = await rows<{ posts: number }>(dsql`select count(*)::int as posts from community.posts where author_id = ${a.id} and body <> ''`);
    expect(posts).toBe(0);
  });

  it("Sitzungsentzug wirkt sofort (ACC03, QA01)", async () => {
    const a = await createMember();
    await signIn(a.id);
    expect(await getViewer()).not.toBeNull();
    expect(await revokeAllSessions(a.id)).toBeGreaterThanOrEqual(1);
    expect(await getViewer()).toBeNull();
  });
});

describe("Audit-Hash-Kette (PRI07)", () => {
  it("bleibt bei parallelen Einträgen gültig, ist unveränderlich und erkennt Manipulation", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => audit({ actorId: null, actorRole: "system", action: `test.parallel.${i}` })));
    const ok = await verifyAuditChain();
    expect(ok.ok).toBe(true);

    const [last] = await rows<{ id: number; action: string }>(dsql`select id, action from ops.audit_events order by id desc limit 1`);
    expect(await pgError(db.execute(dsql`update ops.audit_events set action = 'manipuliert' where id = ${last!.id}`))).toMatch(/unveränderlich/);
    expect(await pgError(db.execute(dsql`delete from ops.audit_events where id = ${last!.id}`))).toMatch(/unveränderlich/);

    // Manipulation unter Umgehung des Triggers (Superuser) wird von der Prüfung erkannt
    const bypass = async (action: string) => {
      await db.execute(dsql`alter table ops.audit_events disable trigger audit_events_no_update`);
      try {
        await db.execute(dsql`update ops.audit_events set action = ${action} where id = ${last!.id}`);
      } finally {
        await db.execute(dsql`alter table ops.audit_events enable trigger audit_events_no_update`);
      }
    };
    await bypass("manipuliert");
    try {
      expect(await verifyAuditChain()).toMatchObject({ ok: false, brokenAt: Number(last!.id), reason: "hash" });
    } finally {
      await bypass(last!.action);
    }
    expect((await verifyAuditChain()).ok).toBe(true);
  });
});

describe("Outbox (NFR19)", () => {
  it("dedupliziert Aufträge über dedupe_key", async () => {
    const key = `test:${randomUUID()}`;
    await Promise.all(
      Array.from({ length: 5 }, () => enqueue({ type: "email.security_notice", aggregateType: "account", aggregateId: randomUUID(), dedupeKey: key })),
    );
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from ops.outbox_events where dedupe_key = ${key}`);
    expect(n).toBe(1);
  });
});
