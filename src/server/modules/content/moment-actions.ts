"use server";

import { and, eq, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/action-state";
import type { MomentIntent } from "@/lib/moment";
import { cleanText, runAction, str, UserError } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { db } from "../../db";
import { momentRules } from "../../db/schema";
import { momentConfigSchema } from "./moment";
import { actingRole, EDITOR_ROLES, isUuid } from "./staff";

/** Mein Moment – versionierte Regelkonfiguration (HOM02). Je Absicht höchstens drei Ziele. */
const INTENTS: MomentIntent[] = ["record", "connect", "learn"];

export async function createMomentVersionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    const versionLabel = cleanText(str(formData, "versionLabel"));
    const fieldErrors: Record<string, string> = {};
    if (versionLabel.length < 3 || versionLabel.length > 60) fieldErrors.versionLabel = "Bitte gib eine Bezeichnung mit 3 bis 60 Zeichen an.";
    const config: Record<string, unknown[]> = {};
    for (const intent of INTENTS) {
      config[intent] = [];
      for (let i = 0; i < 3; i++) {
        const p = `${intent}.${i}`;
        const label = cleanText(str(formData, `${p}.label`));
        if (!label) continue; // leere Zeile = kein Ziel
        config[intent].push({
          label,
          description: cleanText(str(formData, `${p}.description`)),
          href: str(formData, `${p}.href`),
          icon: str(formData, `${p}.icon`),
          ...(formData.get(`${p}.requires`) === "on" ? { requires: "health" as const } : {}),
        });
      }
    }
    const parsed = momentConfigSchema.safeParse(config);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [intent, idx, field] = issue.path;
        const key = field !== undefined ? `${String(intent)}.${String(idx)}.${String(field)}` : String(intent);
        fieldErrors[key] ??= issue.message;
      }
    }
    if (Object.keys(fieldErrors).length) return fail("Bitte prüfe die markierten Felder.", { fieldErrors, values });
    const [row] = await db
      .insert(momentRules)
      .values({ versionLabel, active: false, config: parsed.data!, createdBy: viewer.accountId })
      .returning({ id: momentRules.id });
    await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "moment_rules.created", objectType: "moment_rules", objectId: row.id });
    redirect(`/verwaltung/redaktion/mein-moment?status=angelegt`);
  }, values);
}

export async function activateMomentVersionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, "ruleId");
  return runAction(async () => {
    const viewer = await actionStaff(EDITOR_ROLES);
    if (!isUuid(id)) throw new UserError("Diese Version ist nicht verfügbar.");
    await db.transaction(async (tx) => {
      const [row] = await tx.select({ config: momentRules.config }).from(momentRules).where(eq(momentRules.id, id)).for("update");
      if (!row) throw new UserError("Diese Version ist nicht verfügbar.");
      if (!momentConfigSchema.safeParse(row.config).success) throw new UserError("Diese Version ist ungültig und kann nicht aktiviert werden.");
      // Genau eine aktive Version
      await tx.update(momentRules).set({ active: false }).where(and(eq(momentRules.active, true), ne(momentRules.id, id)));
      await tx.update(momentRules).set({ active: true, publishedAt: new Date() }).where(eq(momentRules.id, id));
      await audit({ actorId: viewer.accountId, actorRole: actingRole(viewer, EDITOR_ROLES), action: "moment_rules.activated", objectType: "moment_rules", objectId: id }, tx);
    });
    updateTag("moment");
    redirect(`/verwaltung/redaktion/mein-moment?status=aktiviert`);
  });
}
