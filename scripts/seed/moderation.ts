import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import * as s from "../../src/server/db/schema";
import type { SeedContext } from "./types";

/**
 * Fiktive, harmlose Beispiel-Fälle für die Moderation (PRD 16: fiktive Testdaten).
 * Idempotent über feste Fallnummern. Keine echten Personen, keine Gesundheitsdetails.
 *  – F-DEMO-0001 Spam-Verdacht in einer Chatnachricht (P1, neu, nicht zugewiesen)
 *  – F-DEMO-0002 Themenfehlplatzierung (P3, triagiert, «Team Moderation» zugewiesen)
 *  – F-DEMO-0003 Unfreundliche Antwort mit Hinweis entschieden, Einspruch eingegangen (P2, Status «Einspruch»)
 */

function encrypt(plain: string): string {
  const raw = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "ZGV2LW9ubHktZGF0YS1rZXktbm90LWZvci1wcm9kISE=", "base64");
  const key = raw.length === 32 ? raw : createHash("sha256").update(raw).digest();
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const HOUR = 60 * 60 * 1000;

type Demo = {
  caseNumber: string;
  receipt: string;
  priority: "P0" | "P1" | "P2" | "P3";
  status: "new" | "triaged" | "appeal";
  reason: "spam_fraud" | "other" | "harassment";
  targetType: "message" | "post" | "comment" | "profile";
  targetId: string;
  subjectId: string;
  authorLabel: string;
  reporterId: string;
  assigneeId: string | null;
  details: string | null;
  evidence: string;
  ageHours: number;
  windowHours: number;
};

export async function seedModeration(ctx: SeedContext): Promise<void> {
  const { db, staff, members } = ctx;
  const [a, b, c] = members;
  if (!a || !b || !c) return;

  const numbers = ["F-DEMO-0001", "F-DEMO-0002", "F-DEMO-0003"];
  const existing = await db
    .select({ caseNumber: s.moderationCases.caseNumber })
    .from(s.moderationCases)
    .where(inArray(s.moderationCases.caseNumber, numbers));
  const have = new Set(existing.map((e) => e.caseNumber));

  // Für die Themenfehlplatzierung bevorzugt einen vorhandenen Beitrag eines Demo-Mitglieds verwenden.
  const [post] = await db
    .select({ id: s.posts.id, authorId: s.posts.authorId, body: s.posts.body, createdAt: s.posts.createdAt })
    .from(s.posts)
    .where(and(eq(s.posts.authorId, c.id), eq(s.posts.status, "published")))
    .limit(1);

  const demos: Demo[] = [
    {
      caseNumber: "F-DEMO-0001",
      receipt: "M-DEMO-0001",
      priority: "P1",
      status: "new",
      reason: "spam_fraud",
      targetType: "message",
      targetId: "00000000-0000-4000-8000-00000000d001",
      subjectId: b.id,
      authorLabel: b.pseudonym,
      reporterId: a.id,
      assigneeId: null,
      details: "Ich habe die Person nicht gekannt, und die Nachricht kam ohne Zusammenhang.",
      evidence: "Hallo! Ich biete günstige Kurse für Online-Marketing an. Schreib mir für einen Rabattcode: https://example.com/angebot",
      ageHours: 1,
      windowHours: 2,
    },
    {
      caseNumber: "F-DEMO-0002",
      receipt: "M-DEMO-0002",
      priority: "P3",
      status: "triaged",
      reason: "other",
      targetType: post ? "post" : "profile",
      targetId: post?.id ?? c.id,
      subjectId: c.id,
      authorLabel: c.pseudonym,
      reporterId: b.id,
      assigneeId: staff.moderator,
      details: "Der Beitrag passt eher zum Thema Freizeit.",
      evidence: post?.body ?? "Weiss jemand, wo es in der Region Bern ruhige Velowege für kurze Ausfahrten gibt?",
      ageHours: 20,
      windowHours: 72,
    },
    {
      caseNumber: "F-DEMO-0003",
      receipt: "M-DEMO-0003",
      priority: "P2",
      status: "appeal",
      reason: "harassment",
      targetType: "comment",
      targetId: "00000000-0000-4000-8000-00000000d003",
      subjectId: c.id,
      authorLabel: c.pseudonym,
      reporterId: b.id,
      assigneeId: staff.moderator,
      details: null,
      evidence: "Das ist doch Unsinn, lies erst mal richtig, bevor du schreibst.",
      ageHours: 50,
      windowHours: 24,
    },
  ];

  const now = Date.now();
  for (const d of demos) {
    if (have.has(d.caseNumber)) continue;
    const createdAt = new Date(now - d.ageHours * HOUR);
    await db.transaction(async (tx) => {
      const [kase] = await tx
        .insert(s.moderationCases)
        .values({
          caseNumber: d.caseNumber,
          status: d.status,
          priority: d.priority,
          assigneeId: d.assigneeId,
          dueAt: new Date(createdAt.getTime() + d.windowHours * HOUR),
          targetType: d.targetType,
          targetId: d.targetId,
          subjectAccountId: d.subjectId,
          createdAt,
          ...(d.status === "appeal"
            ? {
                decidedAt: new Date(createdAt.getTime() + 6 * HOUR),
                ruleRef: "R1 Respekt",
                decisionSummary:
                  "Deine Antwort verstösst gegen die Regel «Respektvoller Umgang». Wir haben dir einen Hinweis gegeben; der Beitrag bleibt sichtbar. Du kannst innerhalb von 30 Tagen Einspruch einlegen.",
              }
            : {}),
        })
        .returning({ id: s.moderationCases.id });

      const [report] = await tx
        .insert(s.reports)
        .values({
          receiptNumber: d.receipt,
          caseId: kase.id,
          reporterId: d.reporterId,
          targetType: d.targetType,
          targetId: d.targetId,
          reason: d.reason,
          detailsEncrypted: d.details ? encrypt(d.details) : null,
          createdAt,
        })
        .returning({ id: s.reports.id });

      await tx.insert(s.evidenceItems).values({
        reportId: report.id,
        caseId: kase.id,
        sourceType: d.targetType,
        sourceId: d.targetId,
        authorLabel: d.authorLabel,
        snapshotEncrypted: encrypt(d.evidence),
        contentHash: sha256(d.evidence),
        sourceCreatedAt: new Date(createdAt.getTime() - 30 * 60 * 1000),
        capturedAt: createdAt,
      });

      if (d.status === "appeal") {
        await tx.insert(s.moderationActions).values({
          caseId: kase.id,
          actorId: staff.moderator,
          kind: "warn",
          ruleRef: "R1 Respekt",
          publicReason: "Bitte bleib auch bei Meinungsverschiedenheiten freundlich und sachlich.",
          internalNote: "Erster Hinweis, keine früheren Fälle.",
          createdAt: new Date(createdAt.getTime() + 5 * HOUR),
        });
        await tx.insert(s.appeals).values({
          caseId: kase.id,
          appellantId: d.subjectId,
          reasonEncrypted: encrypt("Ich wollte niemanden angreifen und habe mich im Ton vergriffen. Ich bitte darum, den Hinweis zu überprüfen."),
          createdAt: new Date(createdAt.getTime() + 24 * HOUR),
        });
      }
    });
  }
}
