/**
 * QA03 / AT02 / AT03 – Eigene Dokumentation gegen die echte Datenbank:
 * Energie 0 und leere Stimmung, Idempotenz über clientOpId, genau ein Check-in pro Tag,
 * Datenbankregeln (CHECK, Unique), Row-Level Security mit nicht privilegierter Rolle,
 * Fremdzugriff ohne Inhalt und mit technischer Erfassung.
 */
import { randomUUID } from "node:crypto";
import { sql as dsql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { localDateString } from "@/lib/time";
import { TEST_ROLE } from "../../scripts/test-db/config";
import { getDiaryEntry, getHistory } from "@/server/modules/health/queries";
import { createCheckInAction } from "@/server/modules/health/checkin-actions";
import { createFatigueEntryAction, deleteDiaryEntryAction } from "@/server/modules/health/diary-actions";
import { collectHealth } from "@/server/modules/privacy/export-collect-health";
import { createMember, db, form, pgError, redirectTarget, rows, signIn, sql } from "./fixtures";

const idle = { status: "idle" } as const;

describe("AT02 Null und Wiederholung", () => {
  it("speichert Energie 0 mit leerer Stimmung genau einmal, auch bei Wiederholung derselben Vorgangskennung", async () => {
    const a = await createMember({ health: true });
    const viewer = await signIn(a.id);
    const today = localDateString(new Date(), viewer.prefs.timezone);
    const opId = randomUUID();
    const values = { clientOpId: opId, date: today, energy: "0", mood: "", fatigue: "" };

    expect(await redirectTarget(createCheckInAction(idle, form(values)))).toBe("/heute?gespeichert=checkin");
    // Verbindungsabbruch: derselbe Vorgang wird erneut gesendet → bestehendes Ergebnis, kein Duplikat
    expect(await redirectTarget(createCheckInAction(idle, form(values)))).toBe("/heute?gespeichert=checkin");

    const stored = await rows<{ energy: number | null; mood: number | null; fatigue: number | null }>(
      dsql`select energy, mood, fatigue from health.check_ins where account_id = ${a.id}`,
    );
    expect(stored).toEqual([{ energy: 0, mood: null, fatigue: null }]);

    // identisch in Datentabelle (S24) und Export (S15)
    const history = await getHistory(viewer, today, today);
    expect(history.checkIns.map(({ energy, mood, fatigue }) => ({ energy, mood, fatigue }))).toEqual([{ energy: 0, mood: null, fatigue: null }]);
    const exported = await collectHealth(a.id);
    const section = (exported as unknown as { section: { check_ins: { energie: unknown; stimmung: unknown }[] } }).section;
    expect(section.check_ins).toHaveLength(1);
    expect(section.check_ins[0]!.energie).toMatchObject({ wert: 0, erfasst: true });
    expect(section.check_ins[0]!.stimmung).toMatchObject({ wert: null, erfasst: false });
  });

  it("lehnt einen zweiten Check-in mit neuer Vorgangskennung für denselben Tag ab (DIA02)", async () => {
    const a = await createMember({ health: true });
    const viewer = await signIn(a.id);
    const today = localDateString(new Date(), viewer.prefs.timezone);
    await redirectTarget(createCheckInAction(idle, form({ clientOpId: randomUUID(), date: today, energy: "5" })));
    const second = await createCheckInAction(idle, form({ clientOpId: randomUUID(), date: today, mood: "3" }));
    expect(second.status).toBe("error");
    expect(second.message).toContain("bereits einen Check-in");
    expect(second.data).toMatchObject({ existingDate: today });
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from health.check_ins where account_id = ${a.id}`);
    expect(n).toBe(1);
  });

  it("verlangt mindestens eine Angabe und speichert ohne Angabe nichts", async () => {
    const a = await createMember({ health: true });
    const viewer = await signIn(a.id);
    const today = localDateString(new Date(), viewer.prefs.timezone);
    const res = await createCheckInAction(idle, form({ clientOpId: randomUUID(), date: today, energy: "", mood: "", fatigue: "" }));
    expect(res.status).toBe("error");
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from health.check_ins where account_id = ${a.id}`);
    expect(n).toBe(0);
  });

  it("Datenbankregeln: leerer Check-in, Werte ausserhalb der Skala und zweiter Eintrag pro Tag scheitern", async () => {
    const a = await createMember({ health: true });
    const base = { accountId: a.id, tz: "Europe/Zurich" };
    const insert = (date: string, energy: number | null, mood: number | null, op = randomUUID()) =>
      db.execute(dsql`insert into health.check_ins (account_id, local_date, timezone, utc_offset_minutes, energy, mood, scale_version, client_op_id)
        values (${base.accountId}, ${date}, ${base.tz}, 60, ${energy}, ${mood}, 'v1', ${op})`);
    expect(await pgError(insert("2026-01-01", null, null))).toMatch(/check_ins_has_value/);
    expect(await pgError(insert("2026-01-02", 11, null))).toMatch(/check_ins_energy_range/);
    expect(await pgError(insert("2026-01-03", null, 0))).toMatch(/check_ins_mood_range/);
    await insert("2026-01-04", 0, null);
    expect(await pgError(insert("2026-01-04", 3, null))).toMatch(/check_ins_account_date_uq/);
  });
});

describe("AT03 Fremde Daten", () => {
  it("RLS: die nicht privilegierte Rolle sieht und ändert keine fremden Gesundheitsdaten", async () => {
    const a = await createMember({ health: true });
    const b = await createMember({ health: true });
    for (const [id, date] of [
      [a.id, "2026-02-01"],
      [a.id, "2026-02-02"],
      [b.id, "2026-02-01"],
    ] as const)
      await db.execute(dsql`insert into health.check_ins (account_id, local_date, timezone, utc_offset_minutes, energy, scale_version, client_op_id)
        values (${id}, ${date}, 'Europe/Zurich', 60, 4, 'v1', ${randomUUID()})`);

    await sql.begin(async (tx) => {
      await tx.unsafe(`set local role ${TEST_ROLE}`);
      // Ohne Inhaberkontext: nichts sichtbar
      expect((await tx`select count(*)::int as n from health.check_ins`)[0]!.n).toBe(0);
      await tx`select set_config('app.account_id', ${b.id}, true)`;
      // Gezielte Abfrage nach A liefert nichts, Zählung enthält nur B
      expect((await tx`select count(*)::int as n from health.check_ins where account_id = ${a.id}`)[0]!.n).toBe(0);
      expect((await tx`select count(*)::int as n from health.check_ins`)[0]!.n).toBe(1);
      // Ändern und Löschen fremder Zeilen trifft nichts
      expect((await tx`update health.check_ins set energy = 9 where account_id = ${a.id}`).count).toBe(0);
      expect((await tx`delete from health.check_ins where account_id = ${a.id}`).count).toBe(0);
    });
    // Einfügen auf fremde account_id verletzt die Policy (WITH CHECK)
    await expect(
      sql.begin(async (tx) => {
        await tx.unsafe(`set local role ${TEST_ROLE}`);
        await tx`select set_config('app.account_id', ${b.id}, true)`;
        await tx`insert into health.check_ins (account_id, local_date, timezone, utc_offset_minutes, energy, scale_version, client_op_id)
          values (${a.id}, '2026-02-05', 'Europe/Zurich', 60, 1, 'v1', ${randomUUID()})`;
      }),
    ).rejects.toThrow(/row-level security/);
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from health.check_ins where account_id = ${a.id} and energy = 4`);
    expect(n).toBe(2);
  });

  it("RLS gilt auch für Tagebuch, Beobachtungen und eigene Symptome; Audit bleibt für die App-Rolle nur anhängbar", async () => {
    const policies = await rows<{ tablename: string }>(
      dsql`select tablename from pg_policies where schemaname = 'health' order by tablename`,
    );
    expect(new Set(policies.map((p) => p.tablename))).toEqual(
      new Set(["check_ins", "diary_entries", "symptom_observations", "symptom_definitions"]),
    );
    const [role] = await rows<{ rolbypassrls: boolean; rolsuper: boolean }>(
      dsql`select rolbypassrls, rolsuper from pg_roles where rolname = ${TEST_ROLE}`,
    );
    expect(role).toEqual({ rolbypassrls: false, rolsuper: false });
    const [grant] = await rows<{ upd: boolean; del: boolean; ins: boolean }>(dsql`select
      has_table_privilege(${TEST_ROLE}, 'ops.audit_events', 'UPDATE') as upd,
      has_table_privilege(${TEST_ROLE}, 'ops.audit_events', 'DELETE') as del,
      has_table_privilege(${TEST_ROLE}, 'ops.audit_events', 'INSERT') as ins`);
    expect(grant).toEqual({ upd: false, del: false, ins: true });
  });

  it("fremde Tagebuch-ID: kein Inhalt, keine Existenzangabe, Vorfall ohne Werte erfasst", async () => {
    const a = await createMember({ health: true });
    const b = await createMember({ health: true });
    const va = await signIn(a.id);
    const today = localDateString(new Date(), va.prefs.timezone);
    const target = await redirectTarget(
      createFatigueEntryAction(idle, form({ clientOpId: randomUUID(), date: today, time: "07:30", fatigue: "6", note: "Nur für mich" })),
    );
    const entryId = target.split("/")[3]!.split("?")[0]!;
    expect(await getDiaryEntry(va, entryId)).not.toBeNull();

    const vb = await signIn(b.id);
    expect(await getDiaryEntry(vb, entryId)).toBeNull();
    const del = await deleteDiaryEntryAction(idle, form({ id: entryId }));
    expect(del.status).toBe("error");
    // gleiche Antwort wie bei einer unbekannten ID (keine Existenzangabe)
    const unknown = await deleteDiaryEntryAction(idle, form({ id: randomUUID() }));
    expect(unknown.message).toBe(del.message);

    const events = await rows<{ kind: string; object_type: string; route: string | null }>(
      dsql`select kind, object_type, route from ops.security_events where actor_id = ${b.id}`,
    );
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.every((e) => e.kind === "health_foreign_access" && e.object_type === "diary_entry")).toBe(true);
    // Eintrag von A unverändert vorhanden
    const [{ n }] = await rows<{ n: number }>(dsql`select count(*)::int as n from health.diary_entries where id = ${entryId}`);
    expect(n).toBe(1);
  });

  it("gewöhnliche Administration hat keinen Lesepfad auf Gesundheitsdaten", async () => {
    const a = await createMember({ health: true });
    const admin = await createMember({ roles: ["admin", "ops"] });
    const va = await signIn(a.id);
    const today = localDateString(new Date(), va.prefs.timezone);
    const target = await redirectTarget(
      createFatigueEntryAction(idle, form({ clientOpId: randomUUID(), date: today, time: "08:00", fatigue: "3" })),
    );
    const entryId = target.split("/")[3]!.split("?")[0]!;
    const vAdmin = await signIn(admin.id);
    expect(vAdmin.isStaff).toBe(true);
    expect(await getDiaryEntry(vAdmin, entryId)).toBeNull();
  });
});
