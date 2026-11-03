import { describe, expect, it } from "vitest";
import { rolePassword, roleUrl } from "./db-role-url";

const OWNER = "postgresql://postgres:Geheim%2Fx1@postgres.railway.internal:5432/railway";

describe("Abgeleitete Datenbankrollen (Q10)", () => {
  it("ersetzt Benutzer und Passwort, behält Host und Datenbank", () => {
    const u = new URL(roleUrl(OWNER, "ms_app"));
    expect(u.username).toBe("ms_app");
    expect(u.host).toBe("postgres.railway.internal:5432");
    expect(u.pathname).toBe("/railway");
    expect(u.password).toMatch(/^[0-9a-f]{48}$/);
  });
  it("ist stabil, je Rolle verschieden und folgt dem Eigentümerpasswort", () => {
    expect(rolePassword(OWNER, "ms_app")).toBe(rolePassword(OWNER, "ms_app"));
    expect(rolePassword(OWNER, "ms_app")).not.toBe(rolePassword(OWNER, "ms_hilfe_ro"));
    expect(rolePassword(OWNER.replace("Geheim", "Anders"), "ms_app")).not.toBe(rolePassword(OWNER, "ms_app"));
  });
  it("verlangt ein Eigentümerpasswort", () => {
    expect(() => rolePassword("postgres://postgres@localhost:5432/ms", "ms_app")).toThrow();
  });
});
