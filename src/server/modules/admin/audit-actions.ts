"use server";

import { fail, ok, type ActionState } from "@/lib/action-state";
import { runAction } from "../../action";
import { audit } from "../../audit";
import { actionStaff } from "../../auth/viewer";
import { AUDIT_READ_ROLES, verifyAuditChain } from "./audit-chain";
import { actorRoleFor } from "./common";

/** Hash-Kette prüfen (PRI07). Die Prüfung selbst wird protokolliert. */
export async function verifyAuditChainAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  void _formData;
  return runAction(async () => {
    const viewer = await actionStaff([...AUDIT_READ_ROLES]);
    const result = await verifyAuditChain();
    await audit({
      actorId: viewer.accountId,
      actorRole: actorRoleFor(viewer, [...AUDIT_READ_ROLES]),
      action: "audit.chain_verified",
      objectType: "audit_chain",
      result: result.ok ? "ok" : "failed",
    });
    if (result.ok) {
      const n = result.checked.toLocaleString("de-CH");
      return ok(
        result.anchored
          ? `Kette intakt: ${n} Einträge geprüft. Ältere Einträge wurden gemäss Aufbewahrungsplan entfernt; die Prüfung beginnt beim ältesten erhaltenen Eintrag.`
          : `Kette intakt: ${n} Einträge geprüft.`,
        { data: { chain: "ok" } },
      );
    }
    return fail(
      `Bruch bei Eintrag #${result.brokenAt}: ${result.reason === "hash" ? "Prüfsumme stimmt nicht mit dem Inhalt überein" : "Verweis auf den Vorgänger stimmt nicht"}. Bitte den Vorfallablauf (I01) starten.`,
      { data: { chain: "broken", brokenAt: result.brokenAt } },
    );
  });
}
