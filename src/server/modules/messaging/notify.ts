import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import { db, type Executor } from "../../db";
import { blocks, deliveryJobs, notifications, userPreferences } from "../../db/schema";

export type NotificationType =
  | "contact_request"
  | "contact_accepted"
  | "comment_reply"
  | "group_decision"
  | "new_message"
  | "moderation_decision"
  | "security"
  | "system";

/**
 * Legt eine neutrale In-App-Mitteilung an (MSG07) und – falls das Mitglied soziale
 * E-Mails abonniert hat – einen deduplizierten Zustellauftrag (MSG08). Keine Inhalte,
 * nur sichere Zielreferenzen. Blockierungen zwischen Akteur und Empfänger verhindern
 * die Mitteilung (SAF01). Wird in der Transaktion der fachlichen Änderung aufgerufen.
 */
export async function notify(
  input: {
    accountId: string;
    type: NotificationType;
    targetType?: "conversation" | "post" | "group" | "contact" | "case" | "account";
    targetId?: string;
    actorId?: string | null;
    /** Stabiler Schlüssel gegen doppelte Mitteilungen, z. B. `reply:${commentId}` */
    dedupeKey: string;
  },
  executor: Executor = db,
): Promise<void> {
  if (input.actorId && input.actorId === input.accountId) return;

  if (input.actorId) {
    const blocked = await executor
      .select({ id: blocks.id })
      .from(blocks)
      .where(
        and(
          isNull(blocks.liftedAt),
          or(
            and(eq(blocks.blockerId, input.accountId), eq(blocks.blockedId, input.actorId)),
            and(eq(blocks.blockerId, input.actorId), eq(blocks.blockedId, input.accountId)),
          ),
        ),
      )
      .limit(1);
    if (blocked.length > 0) return;
  }

  const [prefs] = await executor
    .select({ inAppTypes: userPreferences.inAppTypes, emailSocial: userPreferences.emailSocial })
    .from(userPreferences)
    .where(eq(userPreferences.accountId, input.accountId));

  const essential = input.type === "security" || input.type === "system" || input.type === "moderation_decision";
  if (!essential && prefs && !prefs.inAppTypes.includes(input.type)) return;

  const [row] = await executor
    .insert(notifications)
    .values({
      accountId: input.accountId,
      type: input.type,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      actorId: input.actorId ?? null,
      dedupeKey: input.dedupeKey,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing({ target: notifications.dedupeKey })
    .returning({ id: notifications.id });

  if (!row) return;

  // Soziale E-Mail-Hinweise sind standardmässig aus (MSG07).
  if (!essential && prefs?.emailSocial) {
    await executor
      .insert(deliveryJobs)
      .values({ notificationId: row.id, accountId: input.accountId, channel: "email", dedupeKey: `email:${row.id}` })
      .onConflictDoNothing({ target: deliveryJobs.dedupeKey });
  }
}
