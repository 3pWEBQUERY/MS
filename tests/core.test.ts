import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addDays, inQuietHours, localDateString, utcOffsetMinutes, zonedToUtc } from "@/lib/time";
import { DEFAULT_MOMENT_CONFIG, resolveMoment } from "@/lib/moment";
import { base32Decode, base32Encode, generateRecoveryCodes, verifyTotp } from "@/server/auth/totp";
import { decrypt, decryptBuffer, encrypt, encryptBuffer } from "@/server/crypto";
import { passwordProblem } from "@/server/auth/password";

describe("Zeitlogik Europe/Zurich (PRD 09)", () => {
  it("berücksichtigt Sommer- und Winterzeit", () => {
    expect(utcOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(60);
    expect(utcOffsetMinutes(new Date("2026-07-15T12:00:00Z"))).toBe(120);
  });
  it("ordnet späte Abendstunden dem lokalen Tag zu", () => {
    expect(localDateString(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
    expect(localDateString(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });
  it("wandelt Wandzeit über den Sommerzeitwechsel korrekt um", () => {
    expect(zonedToUtc("2026-03-29", "01:30").toISOString()).toBe("2026-03-29T00:30:00.000Z");
    expect(zonedToUtc("2026-03-29", "03:30").toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(zonedToUtc("2026-10-25", "12:00").toISOString()).toBe("2026-10-25T11:00:00.000Z");
  });
  it("addiert Kalendertage ohne Zeitzonenfehler", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("erkennt Ruhezeiten über Mitternacht (MSG07)", () => {
    expect(inQuietHours("20:00", "08:00", new Date("2026-01-15T21:00:00Z"))).toBe(true); // 22:00 lokal
    expect(inQuietHours("20:00", "08:00", new Date("2026-01-15T10:00:00Z"))).toBe(false); // 11:00 lokal
  });
});

describe("Mein Moment (HOM02)", () => {
  it("liefert höchstens drei Ziele", () => {
    for (const intent of ["record", "connect", "learn"] as const) {
      expect(resolveMoment(DEFAULT_MOMENT_CONFIG, intent, { healthActive: true, healthDeclined: false }).length).toBeLessThanOrEqual(3);
    }
  });
  it("zeigt nach Ablehnung keine Gesundheitsaufgaben", () => {
    expect(resolveMoment(DEFAULT_MOMENT_CONFIG, "record", { healthActive: false, healthDeclined: true })).toHaveLength(0);
  });
  it("führt ohne Entscheidung zur Aktivierung", () => {
    const r = resolveMoment(DEFAULT_MOMENT_CONFIG, "record", { healthActive: false, healthDeclined: false });
    expect(r.every((t) => t.href.startsWith("/mein-ms/aktivieren?weiter=%2Fmein-ms%2F"))).toBe(true);
  });
});

describe("TOTP (ACC05)", () => {
  it("kodiert Base32 verlustfrei", () => {
    const buf = Buffer.from("0123456789abcdefghij");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
  it("akzeptiert den aktuellen Code und verhindert Wiederverwendung", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const step = Math.floor(Date.now() / 30000);
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt(step));
    const mac = createHmac("sha1", base32Decode(secret)).update(b).digest();
    const o = mac[mac.length - 1] & 0xf;
    const code = String((mac.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
    const used = verifyTotp(secret, code);
    expect(used).toBe(step);
    expect(verifyTotp(secret, code, used)).toBeNull();
    expect(verifyTotp(secret, "abc")).toBeNull();
  });
  it("erzeugt zehn eindeutige Wiederherstellungscodes", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
  });
});

describe("Verschlüsselung (MSG05, NFR09)", () => {
  it("verschlüsselt Text und Binärdaten authentifiziert", () => {
    const c = encrypt("Notiz mit Umlauten äöü");
    expect(c.startsWith("v1.")).toBe(true);
    expect(decrypt(c)).toBe("Notiz mit Umlauten äöü");
    const b = encryptBuffer(Buffer.from("export"));
    expect(decryptBuffer(b).toString()).toBe("export");
    const tampered = c.slice(0, -2) + (c.endsWith("A") ? "BB" : "AA");
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe("Passwortregeln (ACC04)", () => {
  it("verlangt 15 Zeichen und weist bekannte Passwörter ab", () => {
    expect(passwordProblem("kurz")).toMatch(/15/);
    expect(passwordProblem("passwortpasswort")).toMatch(/bekannt/);
    expect(passwordProblem("aaaaaaaaaaaaaaaaaa")).not.toBeNull();
    expect(passwordProblem("drei ruhige berge im nebel")).toBeNull();
    expect(passwordProblem("anna.muster-sicher-lang", "anna.muster@example.ch")).toMatch(/E-Mail/);
  });
});
