import { createHmac } from "node:crypto";

/**
 * Verbindungs-URL einer nicht privilegierten Rolle aus der Eigentümer-URL ableiten (PRD 09, Q10).
 * Das Rollenpasswort ist HMAC-SHA256(Eigentümerpasswort, «ms-db-role:<rolle>») – es entsteht so
 * kein zusätzliches Geheimnis, und es ändert sich automatisch mit dem Postgres-Passwort
 * (scripts/db-roles.ts führt die Rolle bei jedem Deploy nach). Nur auf dem Server verwenden.
 */
export const DB_ROLES = ["ms_app", "ms_hilfe_ro"] as const;
export type DbRole = (typeof DB_ROLES)[number];

export function rolePassword(ownerUrl: string, role: DbRole): string {
  const owner = new URL(ownerUrl);
  const secret = decodeURIComponent(owner.password);
  if (!secret) throw new Error("Eigentümer-URL ohne Passwort – Rollenpasswort nicht ableitbar");
  return createHmac("sha256", secret).update(`ms-db-role:${role}`).digest("hex").slice(0, 48);
}

export function roleUrl(ownerUrl: string, role: DbRole): string {
  const u = new URL(ownerUrl);
  const pw = rolePassword(ownerUrl, role);
  u.username = role;
  u.password = pw;
  return u.toString();
}

export function isDbRole(value: string | undefined): value is DbRole {
  return !!value && (DB_ROLES as readonly string[]).includes(value);
}
