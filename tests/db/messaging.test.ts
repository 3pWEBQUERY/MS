/**
 * QA05 / AT05 / AT06 – Kontaktfreigabe, Entzug während des Sendens, Blockierung und Zustellqueue
 * gegen die echte Datenbank (Zeilensperre FOR UPDATE, Unique-Indizes, Worker-Zustellung).
 */
import { randomUUID } from "node:crypto";
import { sql as dsql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { Viewer } from "@/server/auth/viewer";
import { blockMember, listMyBlocks, unblock } from "@/server/modules/messaging/blocks";
import { endContact, getPairState, respondToRequest, sendContactRequest } from "@/server/modules/messaging/contacts";
import { sendMessage } from "@/server/modules/messaging/conversations";
import { notificationHandlers } from "@/worker/handlers/notifications";
import { createMember, rows, signIn, sql } from "./fixtures";

async function activeContact(opts: { emailSocialB?: boolean } = {}) {
  const a = await createMember();
  const b = await createMember({ emailSocial: opts.emailSocialB });
  const va = await signIn(a.id);
  const sent = await sendContactRequest(va, b.id);
  if (sent.kind !== "sent") throw new Error(`Anfrage nicht gesendet: ${sent.kind}`);
  const vb = await signIn(b.id);
  const { conversationId } = await respondToRequest(vb, sent.relationshipId, true);
  return { a, b, va, vb, relationshipId: sent.relationshipId, conversationId: conversationId! };
}

const userMessage = async (run: Promise<unknown>) => {
  try {
    await run;
    return "ok";
  } catch (err) {
    return (err as Error).message;
  }
};

describe("AT05 Zustimmung und Konkurrenz", () => {
  it("weist Nachrichten bei ausstehendem Kontakt ab, erlaubt sie nach Annahme und sperrt sie nach Entzug", async () => {
    const { a, b, va, vb, relationshipId, conversationId } = await activeContact();
    expect((await sendMessage(va, conversationId, "Hallo", randomUUID())).duplicate).toBe(false);

    // Entzug, danach neue Anfrage: dasselbe Gespräch existiert, der Kontakt ist aber nur ausstehend
    await endContact(vb, relationshipId);
    const again = await sendContactRequest(va, b.id);
    expect(again.kind).toBe("sent");
    expect(await getPairState(va, b.id)).toEqual({ kind: "outgoing_pending" });
    expect(await userMessage(sendMessage(va, conversationId, "Direkt senden?", randomUUID()))).toMatch(/nicht mehr aktiv/);

    // Bewusste Annahme öffnet denselben Verlauf wieder (MSG04)
    const reopened = await respondToRequest(vb, relationshipId, true);
    expect(reopened.conversationId).toBe(conversationId);
    const ok = await sendMessage(va, conversationId, "Jetzt geht es", randomUUID());
    expect(ok.seq).toBe(2);

    // Kontakt beenden → kein Senden mehr, von keiner Seite
    await endContact(va, relationshipId);
    expect(await userMessage(sendMessage(va, conversationId, "Noch eine", randomUUID()))).toMatch(/nicht mehr aktiv/);
    expect(await userMessage(sendMessage(vb, conversationId, "Antwort", randomUUID()))).toMatch(/nicht mehr aktiv/);
    // Fremde Person kann ein fremdes Gespräch nie beschreiben
    const c = await signIn((await createMember()).id);
    expect(await userMessage(sendMessage(c, conversationId, "x", randomUUID()))).toMatch(/nicht verfügbar/);
    expect(a.id).not.toBe(b.id);
  });

  it("Wiederholung mit derselben Vorgangskennung erzeugt keine zweite Nachricht (MSG03)", async () => {
    const { va, conversationId } = await activeContact();
    const op = randomUUID();
    const first = await sendMessage(va, conversationId, "Einmal", op);
    const second = await sendMessage(va, conversationId, "Einmal", op);
    expect(second).toMatchObject({ id: first.id, seq: first.seq, duplicate: true });
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from messaging.messages where conversation_id = ${conversationId}`);
    expect(n).toBe(1);
  });

  it("bestätigter Entzug während eine Nachricht wartet: der wartende Sendevorgang scheitert", async () => {
    const { va, conversationId, relationshipId } = await activeContact();
    let pending: Promise<string> | null = null;
    // Entzug hält die Zeilensperre (wie endContact); die Nachricht wartet auf dieselbe Sperre.
    await sql.begin(async (tx) => {
      await tx`select id from messaging.contact_relationships where id = ${relationshipId} for update`;
      pending = userMessage(sendMessage(va, conversationId, "Wartet auf die Sperre", randomUUID()));
      await new Promise((r) => setTimeout(r, 300));
      const [{ waiting }] = await tx`select count(*)::int as waiting from pg_stat_activity where wait_event_type = 'Lock' and datname = current_database()`;
      expect(waiting).toBeGreaterThanOrEqual(1);
      await tx`update messaging.contact_relationships set status = 'ended', low_consent_at = null, high_consent_at = null, ended_at = now() where id = ${relationshipId}`;
    });
    expect(await pending!).toMatch(/nicht mehr aktiv/);
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from messaging.messages where conversation_id = ${conversationId}`);
    expect(n).toBe(0);
  });

  it("parallel: Senden und Beenden werden serialisiert, Reihenfolge ist über Sequenz und Statuszeit nachvollziehbar", async () => {
    const { va, vb, conversationId, relationshipId } = await activeContact();
    const results = await Promise.all([
      ...Array.from({ length: 5 }, (_, i) => userMessage(sendMessage(va, conversationId, `Nachricht ${i}`, randomUUID()))),
      userMessage(endContact(vb, relationshipId)),
    ]);
    const [rel] = await rows<{ status: string; ended_at: Date }>(
      dsql`select status, ended_at from messaging.contact_relationships where id = ${relationshipId}`,
    );
    expect(rel!.status).toBe("ended");
    const msgs = await rows<{ seq: number; created_at: Date }>(
      dsql`select seq, created_at from messaging.messages where conversation_id = ${conversationId} order by seq`,
    );
    // Jede erfolgreiche Nachricht liegt zeitlich vor dem Entzug, danach ist kein Senden mehr möglich
    expect(msgs.length).toBe(results.slice(0, 5).filter((r) => r === "ok").length);
    for (const m of msgs) expect(new Date(m.created_at).getTime()).toBeLessThanOrEqual(new Date(rel!.ended_at).getTime());
    expect(msgs.map((m) => Number(m.seq))).toEqual(msgs.map((_, i) => i + 1));
    expect(await userMessage(sendMessage(va, conversationId, "zu spät", randomUUID()))).toMatch(/nicht mehr aktiv/);
  });

  it("gleichzeitige Gegenanfragen geben den Kontakt nicht automatisch frei (MSG01)", async () => {
    const a = await createMember();
    const b = await createMember();
    const va = await signIn(a.id);
    const vb = await signIn(b.id);
    const [ra, rb] = await Promise.all([sendContactRequest(va, b.id), sendContactRequest(vb, a.id)]);
    const kinds = [ra.kind, rb.kind].sort();
    expect(kinds).toEqual(["incoming_exists", "sent"]);
    const [rel] = await rows<{ status: string; n: number }>(
      dsql`select status, (select count(*)::int from messaging.contact_relationships r2 where r2.account_low = r.account_low and r2.account_high = r.account_high) as n
           from messaging.contact_relationships r where (account_low = ${a.id} or account_high = ${a.id})`,
    );
    expect(rel).toEqual({ status: "pending", n: 1 });
  });
});

describe("AT06 Block und Zustellqueue", () => {
  const backdate = (accountId: string) =>
    sql`update messaging.delivery_jobs set created_at = now() - interval '20 minutes' where account_id = ${accountId}`;

  it("wartende soziale E-Mail wird nach Blockierung nicht zugestellt; Vergleichsfall ohne Block wird zugestellt", async () => {
    const mails = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      // Vergleich: ohne Blockierung erhält die Empfängerin genau eine Sammelmail
      const control = await activeContact({ emailSocialB: true });
      await sendMessage(control.va, control.conversationId, "Hallo", randomUUID());
      await backdate(control.b.id);
      await notificationHandlers["notification.deliver"]!({ id: randomUUID(), aggregateId: control.b.id, payload: {}, attempt: 1 });
      // Die Anfrage-Mitteilung wurde mit der Annahme gelesen (übersprungen), die Nachricht wird zugestellt.
      const controlJobs = await rows<{ type: string; status: string }>(
        dsql`select n.type, j.status from messaging.delivery_jobs j join messaging.notifications n on n.id = j.notification_id
             where j.account_id = ${control.b.id} and j.channel = 'email' order by n.type`,
      );
      expect(controlJobs).toEqual([
        { type: "contact_request", status: "skipped" },
        { type: "new_message", status: "sent" },
      ]);
      const sentBefore = mails.mock.calls.filter((c) => String(c[0]).includes("social_digest")).length;
      expect(sentBefore).toBe(1);

      // Blockierung vor der Zustellung: Auftrag übersprungen, Hinweis abgelaufen, keine Mail
      const { a, b, va, vb, relationshipId, conversationId } = await activeContact({ emailSocialB: true });
      await sendMessage(va, conversationId, "Wartende Nachricht", randomUUID());
      const [job] = await rows<{ status: string }>(
        dsql`select j.status from messaging.delivery_jobs j join messaging.notifications n on n.id = j.notification_id
             where j.account_id = ${b.id} and n.type = 'new_message'`,
      );
      expect(job!.status).toBe("pending");
      await blockMember(vb, a.id);
      await backdate(b.id);
      await notificationHandlers["notification.deliver"]!({ id: randomUUID(), aggregateId: b.id, payload: {}, attempt: 1 });
      const after = await rows<{ status: string; last_error_code: string | null }>(
        dsql`select j.status, j.last_error_code from messaging.delivery_jobs j join messaging.notifications n on n.id = j.notification_id
             where j.account_id = ${b.id} and n.type = 'new_message'`,
      );
      expect(after).toEqual([{ status: "skipped", last_error_code: "blocked" }]);
      const [{ digests }] = await rows<{ digests: number }>(
        dsql`select count(*)::int as digests from messaging.delivery_jobs where account_id = ${b.id} and channel = 'email_digest'`,
      );
      expect(digests).toBe(0);
      expect(mails.mock.calls.filter((c) => String(c[0]).includes("social_digest")).length).toBe(sentBefore);
      const [note] = await rows<{ expired: boolean }>(
        dsql`select expires_at <= now() as expired from messaging.notifications where account_id = ${b.id} and actor_id = ${a.id}`,
      );
      expect(note!.expired).toBe(true);

      // Kontakt beendet, keine Nachrichten und Anfragen in beide Richtungen
      const [rel] = await rows<{ status: string }>(dsql`select status from messaging.contact_relationships where id = ${relationshipId}`);
      expect(rel!.status).toBe("ended");
      expect(await userMessage(sendMessage(va, conversationId, "nach Block", randomUUID()))).not.toBe("ok");
      expect(await userMessage(sendContactRequest(va, b.id))).toMatch(/nicht möglich/);
    } finally {
      mails.mockRestore();
    }
  });

  it("Blockierliste enthält nur eigene Entscheidungen; Aufheben erzeugt keine neue Freigabe", async () => {
    const { a, b, va, vb } = await activeContact();
    await blockMember(vb, a.id);
    const mine: Viewer = vb;
    const listB = await listMyBlocks(mine);
    expect(listB.map((x) => x.pseudonym)).toEqual([a.pseudonym]);
    expect(await listMyBlocks(va)).toEqual([]);
    // A kann die Blockierung von B nicht aufheben
    expect(await userMessage(unblock(va, listB[0]!.id))).toMatch(/besteht nicht mehr/);
    await unblock(vb, listB[0]!.id);
    expect(await getPairState(vb, a.id)).not.toMatchObject({ kind: "active" });
    const [rel] = await rows<{ status: string }>(
      dsql`select status from messaging.contact_relationships where (account_low = ${a.id} and account_high = ${b.id}) or (account_low = ${b.id} and account_high = ${a.id})`,
    );
    expect(rel!.status).toBe("ended");
  });
});
