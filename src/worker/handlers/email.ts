import { eq } from "drizzle-orm";
import { decrypt } from "@/server/crypto";
import { db } from "@/server/db";
import { accounts } from "@/server/db/schema";
import { sendMail, type SecurityNoticeWhat } from "@/server/mailer";
import type { Handler } from "../types";

/** Transaktionsmails aus der Outbox. Empfänger und Link liegen verschlüsselt im Payload. */
const linkMail =
  (kind: "verify_email" | "password_reset" | "email_change_confirm"): Handler =>
  async ({ payload }) => {
    const to = decrypt(String(payload.to));
    const link = decrypt(String(payload.link));
    await sendMail(to, { kind, link });
  };

export const emailHandlers: Record<string, Handler> = {
  "email.verification": linkMail("verify_email"),
  "email.password_reset": linkMail("password_reset"),
  "email.email_change": linkMail("email_change_confirm"),
  "email.security_notice": async ({ aggregateId, payload }) => {
    let to: string | null = payload.toEncrypted ? decrypt(String(payload.toEncrypted)) : null;
    if (!to) {
      const [acc] = await db.select({ email: accounts.email, status: accounts.status }).from(accounts).where(eq(accounts.id, aggregateId));
      // ACC08: Status vor dem Versand erneut prüfen – keine Hinweise an deaktivierte Konten
      if (!acc || acc.status === "deleted" || acc.status === "deletion_pending") return;
      to = acc.email;
    }
    await sendMail(to, {
      kind: "security_notice",
      what: (payload.what as SecurityNoticeWhat | undefined) ?? "password_changed",
    });
  },
  // PRD 11: Vorwarnung vor Löschung wegen Inaktivität – nur solange das Konto weiterhin inaktiv ist
  "email.inactivity_notice": async ({ aggregateId, payload }) => {
    const [acc] = await db
      .select({ status: accounts.status, lastActiveAt: accounts.lastActiveAt, noticeAt: accounts.inactivityNoticeAt })
      .from(accounts)
      .where(eq(accounts.id, aggregateId));
    if (!acc || acc.status === "deleted" || acc.status === "deletion_pending" || !acc.noticeAt) return;
    if (acc.lastActiveAt && acc.lastActiveAt > acc.noticeAt) return;
    await sendMail(decrypt(String(payload.toEncrypted)), {
      kind: "inactivity_notice",
      deleteOn: String(payload.deleteOn ?? ""),
      link: String(payload.link ?? ""),
    });
  },
  "email.deletion_receipt": async ({ payload }) => {
    if (!payload.toEncrypted) return;
    await sendMail(decrypt(String(payload.toEncrypted)), { kind: "deletion_receipt", receipt: String(payload.receipt ?? "") });
  },
};
