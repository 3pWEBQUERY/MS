import { describe, expect, it } from "vitest";
import { generateInviteCode, INVITE_ALPHABET, inviteCodeHash, inviteCodeHint, normalizeInviteCode } from "./invite-code";

describe("Einladungscodes (PRD 17)", () => {
  it("erzeugt Codes im Anzeigeformat ohne verwechselbare Zeichen", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
      for (const ch of code.replace(/-/g, "")) expect(INVITE_ALPHABET).toContain(ch);
      expect(code).not.toMatch(/[01ILO]/);
    }
  });
  it("erzeugt verschiedene Codes", () => {
    const set = new Set(Array.from({ length: 500 }, generateInviteCode));
    expect(set.size).toBe(500);
  });
  it("vereinheitlicht Schreibweisen vor dem Vergleich", () => {
    expect(normalizeInviteCode("abcd-efgh-jkmn")).toBe("ABCDEFGHJKMN");
    expect(normalizeInviteCode(" ABCD EFGH JKMN ")).toBe("ABCDEFGHJKMN");
    expect(normalizeInviteCode("ABCD–EFGH–JKMN")).toBe("ABCDEFGHJKMN");
  });
  it("lehnt falsche Formen ab, ohne Existenz zu prüfen", () => {
    expect(normalizeInviteCode("")).toBeNull();
    expect(normalizeInviteCode("ABCD-EFGH")).toBeNull();
    expect(normalizeInviteCode("ABCD-EFGH-JKM0")).toBeNull();
    expect(normalizeInviteCode("ABCD-EFGH-JKMNP")).toBeNull();
  });
  it("speichert nur Hash und Hinweis", () => {
    const n = normalizeInviteCode(generateInviteCode())!;
    expect(inviteCodeHash(n)).toMatch(/^[0-9a-f]{64}$/);
    expect(inviteCodeHash(n)).not.toContain(n);
    expect(inviteCodeHint(n)).toBe(n.slice(-4));
  });
});
