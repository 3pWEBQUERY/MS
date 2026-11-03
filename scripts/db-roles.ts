/**
 * Nicht privilegierte Datenbankrollen anlegen bzw. nachführen (PRD 09/14, Q10, PRI08).
 * Läuft im Pre-Deploy nach den Migrationen mit der Eigentümerrolle (DATABASE_URL):
 *   - ms_app (Web-App, ohne BYPASSRLS)
 *   - ms_hilfe_ro (Hilfe-Dienst, nur Lesen der Sicherheitskontakte)
 * Aktiv, wenn DB_ROLES_MANAGE=1 gesetzt ist. Passwörter werden aus dem Eigentümerpasswort abgeleitet
 * (src/lib/db-role-url.ts) – es entsteht kein zusätzliches Geheimnis.
 * Die Rechte stammen aus docs/db-roles.sql und werden bei jedem Lauf erneut gesetzt, damit auch
 * Tabellen aus neuen Migrationen erfasst sind. Ohne Passwort-Variable passiert nichts (Entwicklung).
 * Die Web-App nutzt die Rolle über APP_DATABASE_URL (src/server/env.ts); Migrationen, Seed und
 * Arbeiter (Löschaufträge) bleiben bei der Eigentümerrolle.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { rolePassword } from "../src/lib/db-role-url";

const ROLES = [
  { name: "ms_app", attrs: "LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE" },
  { name: "ms_hilfe_ro", attrs: "LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE" },
] as const;

/** Anweisungen einer Rolle aus docs/db-roles.sql (ohne CREATE ROLE, ohne Kommentare). */
export function grantStatements(sqlText: string, role: string): string[] {
  return sqlText
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0 && !/^CREATE ROLE/i.test(s) && new RegExp(`\\b${role}\\b`).test(s));
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.DB_ROLES_MANAGE !== "1") {
    console.log("Datenbankrollen: DB_ROLES_MANAGE nicht gesetzt – übersprungen.");
    return;
  }
  const sqlText = readFileSync(join(__dirname, "../docs/db-roles.sql"), "utf8");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    for (const role of ROLES) {
      const password = rolePassword(url, role.name);
      // Passwort wird in die Anweisung eingesetzt (ALTER ROLE kennt keine Parameter): nur Hex-Zeichen
      if (!/^[0-9a-f]{48}$/.test(password)) throw new Error("abgeleitetes Passwort ungültig");
      const [exists] = await sql`select 1 from pg_roles where rolname = ${role.name}`;
      await sql.unsafe(`${exists ? "ALTER" : "CREATE"} ROLE ${role.name} WITH ${role.attrs} PASSWORD '${password}'`);
      for (const stmt of grantStatements(sqlText, role.name)) await sql.unsafe(stmt);
      console.log(`Datenbankrolle ${role.name}: ${exists ? "nachgeführt" : "angelegt"}, Rechte gesetzt.`);
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((err) => {
  // Kein Passwort oder Verbindungsdaten ins Log (NFR15)
  console.error(`Datenbankrollen fehlgeschlagen: ${err instanceof Error ? err.message.replace(/postgres(ql)?:\/\/\S+/g, "<url>").slice(0, 200) : "error"}`);
  process.exit(1);
});
