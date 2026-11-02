"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { STATUS_REASONS } from "@/components/admin/labels";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { accounts, sanctions } from "../../db/schema";
import { actorRoleFor, isUuid } from "./common";

/**
 * Kontostatus und Sanktionen (ACC08, SAF04). Begründung als kontrollierter Code plus optionaler
 * Ticketbezug – keine Freitexte im Audit (PRI07). Datenschutzrechte bleiben bei jeder Sperre erhalten.
 */

const REASONS = new Set(STATUS_REASONS.map((r) => r.value));
const MANAGEABLE = ["active", "restricted", "suspended"] as const;
type Manageable = (typeof MANAGEABLE)[number];

function ticketRef(formData: FormData): string | null {
  const t = str(formData, "ticket").replace(/[^\p{L}\p{N}#\-_.:/ ]/gu, "").slice(0, 60).trim();
  return t.length > 0 ? t : null;
}

export async function changeAccountStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { status: str(formData, "status"), reason: str(formData, "reason"), ticket: str(formData, "ticket") };
  return runAction(async () => {
    // Kontostatus verwaltet die Administration (PRD 03).
    const viewer = await actionStaff(["admin"]);
    const accountId = str(formData, "accountId");
    if (!isUuid(accountId)) return fail("Dieses Konto ist nicht verfügbar.");
    if (accountId === viewer.accountId) return fail("Den eigenen Kontostatus kannst du nicht ändern.", { values });
    const to = values.status as Manageable;
    const fe: Record<string, string> = {};
    if (!MANAGEABLE.includes(to)) fe.status = "Bitte wähle einen Status.";
    if (!REASONS.has(values.reason)) fe.reason = "Bitte wähle eine Begründung.";
    if (formData.get("confirm") !== "yes") fe.confirm = "Bitte bestätige die Änderung.";
    if (Object.keys(fe).length) return fail("Bitte prüfe die markierten Angaben.", { fieldErrors: fe, values });

    const version = Number(str(formData, "version"));
    const [acc] = await db.select({ status: accounts.status, version: accounts.version }).from(accounts).where(eq(accounts.id, accountId));
    if (!acc) return fail("Dieses Konto ist nicht verfügbar.");
    // Löschung, Unbestätigt und Gelöscht werden über eigene Abläufe gesteuert, nicht hier.
    if (!MANAGEABLE.includes(acc.status as Manageable))
      return fail("Dieser Kontostatus wird über einen eigenen Ablauf gesteuert und kann hier nicht geändert werden.", { values });
    if (acc.status === to) return ok("Der Status ist bereits gesetzt.");

    const ticket = ticketRef(formData);
    await db.transaction(async (tx) => {
      const rows = await tx
        .update(accounts)
        .set({ status: to, version: acc.version + 1, updatedAt: new Date() })
        .where(and(eq(accounts.id, accountId), eq(accounts.version, version), inArray(accounts.status, [...MANAGEABLE])))
        .returning({ id: accounts.id });
      if (rows.length === 0) throw new UserError("Das Konto wurde inzwischen geändert. Bitte lade die Seite neu.");
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: "admin",
          action: `account.status.${to}`,
          objectType: "account",
          objectId: accountId,
          ticket: [values.reason, ticket].filter(Boolean).join(" · "),
        },
        tx,
      );
    });
    refresh();
    return ok("Kontostatus geändert und protokolliert.");
  }, values);
}

export async function liftSanctionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = { reason: str(formData, "reason"), ticket: str(formData, "ticket") };
  return runAction(async () => {
    const viewer = await actionStaff(["moderation_lead", "admin"]);
    const sanctionId = str(formData, "sanctionId");
    if (!isUuid(sanctionId)) return fail("Diese Sanktion ist nicht verfügbar.");
    if (!REASONS.has(values.reason)) return fail("Bitte wähle eine Begründung.", { fieldErrors: { reason: "Bitte wähle eine Begründung." }, values });
    const [s] = await db.select({ accountId: sanctions.accountId }).from(sanctions).where(eq(sanctions.id, sanctionId));
    if (!s) return fail("Diese Sanktion ist nicht verfügbar.");
    if (s.accountId === viewer.accountId) return fail("Eigene Sanktionen kannst du nicht aufheben.", { values });

    const ticket = ticketRef(formData);
    const lifted = await db.transaction(async (tx) => {
      const rows = await tx
        .update(sanctions)
        .set({ liftedAt: new Date() })
        .where(and(eq(sanctions.id, sanctionId), isNull(sanctions.liftedAt)))
        .returning({ id: sanctions.id });
      if (rows.length === 0) return false;
      await audit(
        {
          actorId: viewer.accountId,
          actorRole: actorRoleFor(viewer, ["moderation_lead", "admin"]),
          action: "sanction.lifted",
          objectType: "sanction",
          objectId: sanctionId,
          ticket: [values.reason, ticket].filter(Boolean).join(" · "),
        },
        tx,
      );
      return true;
    });
    if (!lifted) return fail("Diese Sanktion ist bereits aufgehoben.");
    refresh();
    return ok("Sanktion aufgehoben und protokolliert.");
  }, values);
}
