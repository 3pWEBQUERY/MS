import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { grantStatements } from "../scripts/db-roles";

const text = readFileSync(join(__dirname, "../docs/db-roles.sql"), "utf8");

describe("Datenbankrollen (PRD 09, Q10)", () => {
  it("übernimmt nur die Rechte der jeweiligen Rolle, ohne CREATE ROLE und ohne Passwort", () => {
    const app = grantStatements(text, "ms_app");
    expect(app.length).toBeGreaterThan(5);
    expect(app.every((s) => /\bms_app\b/.test(s) && !/CREATE ROLE|PASSWORD/i.test(s))).toBe(true);
    expect(app.some((s) => /REVOKE UPDATE, DELETE ON ops\.audit_events/.test(s))).toBe(true);
    expect(app.some((s) => /ms_hilfe_ro/.test(s))).toBe(false);
  });
  it("gibt dem Hilfe-Dienst nur Lesezugriff auf die Sicherheitskontakte", () => {
    const hilfe = grantStatements(text, "ms_hilfe_ro");
    expect(hilfe).toEqual(["GRANT USAGE ON SCHEMA content TO ms_hilfe_ro", "GRANT SELECT ON content.safety_contacts TO ms_hilfe_ro"]);
  });
});
