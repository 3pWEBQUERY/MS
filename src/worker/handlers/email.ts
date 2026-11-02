import { eq } from "drizzle-orm";
import { decrypt } from "@/server/crypto";
import { db } from "@/server/db";
import { accounts } from "@/server/db/schema";
import { sendMail } from "@/server/mailer";
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
      if (!acc || acc.status === "deleted") return;
      to = acc.email;
    }
    await sendMail(to, {
      kind: "security_notice",
      what: (payload.what as "email_changed" | "password_changed" | "mfa_changed" | "new_login") ?? "password_changed",
    });
  },
  "email.deletion_receipt": async ({ payload }) => {
    if (!payload.toEncrypted) return;
    await sendMail(decrypt(String(payload.toEncrypted)), { kind: "deletion_receipt", receipt: String(payload.receipt ?? "") });
  },
};
