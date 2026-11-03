import { describe, expect, it } from "vitest";
import { PASSWORD_MAX, PASSWORD_MIN, passwordProblem } from "./password-policy";

describe("Passwortregeln (ACC04)", () => {
  it("verlangt mindestens 15 und unterstützt mindestens 64 Zeichen", () => {
    expect(PASSWORD_MIN).toBe(15);
    expect(PASSWORD_MAX).toBeGreaterThanOrEqual(64);
    expect(passwordProblem("a".repeat(14))).toMatch(/15/);
    expect(passwordProblem("Abendlicht über dem stillen See, ".repeat(2).slice(0, 64))).toBeNull();
    expect(passwordProblem("x".repeat(PASSWORD_MAX + 1))).toMatch(/höchstens/);
  });

  it("weist häufige und kompromittierte Passwörter ab", () => {
    expect(passwordProblem("passwortpasswort")).toMatch(/bekannt/);
    expect(passwordProblem("Correct Horse Battery Staple")).toMatch(/bekannt/);
    expect(passwordProblem("1q2w3e4r5t6y7u8i")).not.toBeNull();
  });

  it("weist triviale Muster ab: Wiederholung, Folgen, Grundwort mit Ziffern", () => {
    expect(passwordProblem("aaaaaaaaaaaaaaaaaa")).not.toBeNull();
    expect(passwordProblem("abcabcabcabcabcabc")).toMatch(/Wiederholung/);
    expect(passwordProblem("0123456789012345")).toMatch(/folge/i);
    expect(passwordProblem("987654321098765")).toMatch(/folge/i);
    expect(passwordProblem("qwertzuiopqwertz")).toMatch(/folge/i);
    expect(passwordProblem("Passwort2026!!!!")).toMatch(/erraten/);
    expect(passwordProblem("Willkommen123456")).toMatch(/erraten/);
    expect(passwordProblem("Passwort Passwort Passwort")).not.toBeNull();
  });

  it("akzeptiert Passphrasen und eingefügte Zufallspasswörter", () => {
    expect(passwordProblem("drei ruhige berge im nebel")).toBeNull();
    expect(passwordProblem("k7#Qm2!vR9@xLp4$Tz")).toBeNull();
    expect(passwordProblem("Mein Kaffee bleibt heute warm")).toBeNull();
  });

  it("verbietet die eigene E-Mail-Adresse im Passwort", () => {
    expect(passwordProblem("anna.muster-sicher-lang", "anna.muster@example.ch")).toMatch(/E-Mail/);
  });
});
