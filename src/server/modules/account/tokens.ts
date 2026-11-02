import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { encrypt, randomToken, sha256 } from "../../crypto";
import { db, type Executor } from "../../db";
import { emailTokens } from "../../db/schema";
import { env } from "../../env";
import { enqueue } from "../../outbox";

const TTL = {
  verify_email: 24 * 60 * 60 * 1000, // ACC02
  reset_password: 30 * 60 * 1000, // ACC04
  change_email: 24 * 60 * 60 * 1000, // ACC07
} as const;

type Purpose = keyof typeof TTL;

const PATHS: Record<Purpose, string> = {
  verify_email: "/email-bestaetigen",
  reset_password: "/passwort-zuruecksetzen",
  change_email: "/email-bestaetigen",
};

const OUTBOX: Record<Purpose, "email.verification" | "email.password_reset" | "email.email_change"> = {
  verify_email: "email.verification",
  reset_password: "email.password_reset",
  change_email: "email.email_change",
};

/**
 * Erzeugt ein einmaliges Token, speichert nur dessen Hash und legt den Versand
 * transaktional in die Outbox. Der Link liegt dort verschlüsselt vor.
 */
export async function issueEmailToken(
  input: { accountId: string; purpose: Purpose; sendTo: string; newEmail?: string },
  executor: Executor = db,
) {
  const token = randomToken(32);
  // Ältere offene Tokens desselben Zwecks werden ungültig.
  await executor
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(emailTokens.accountId, input.accountId), eq(emailTokens.purpose, input.purpose), isNull(emailTokens.usedAt)),
    );
  const [row] = await executor
    .insert(emailTokens)
    .values({
      accountId: input.accountId,
      purpose: input.purpose,
      tokenHash: sha256(token),
      newEmail: input.newEmail ?? null,
      expiresAt: new Date(Date.now() + TTL[input.purpose]),
    })
    .returning({ id: emailTokens.id });

  const link = `${env.appUrl}${PATHS[input.purpose]}?token=${encodeURIComponent(token)}`;
  await enqueue(
    {
      type: OUTBOX[input.purpose],
      aggregateType: "email_token",
      aggregateId: row.id,
      payload: { to: encrypt(input.sendTo), link: encrypt(link) },
      dedupeKey: `${OUTBOX[input.purpose]}:${row.id}`,
    },
    executor,
  );
  return row.id;
}

/** Liefert das gültige, unbenutzte Token oder null (abgelaufen, verwendet, unbekannt). */
export async function findValidToken(token: string, purpose: Purpose) {
  const [row] = await db
    .select()
    .from(emailTokens)
    .where(
      and(
        eq(emailTokens.tokenHash, sha256(token)),
        eq(emailTokens.purpose, purpose),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function inspectToken(token: string): Promise<"valid" | "expired" | "used" | "unknown"> {
  const [row] = await db.select().from(emailTokens).where(eq(emailTokens.tokenHash, sha256(token))).limit(1);
  if (!row) return "unknown";
  if (row.usedAt) return "used";
  if (row.expiresAt < new Date()) return "expired";
  return "valid";
}
