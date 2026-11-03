import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptWith, deriveKey, emptyTally, encryptWith, isCiphertext, rotateJson, rotateValue } from "../scripts/rotate-data-key-lib";

const oldKey = deriveKey(randomBytes(32).toString("base64"));
const newKey = deriveKey(randomBytes(32).toString("base64"));

describe("Schlüsselrotation DATA_ENCRYPTION_KEY (NFR10)", () => {
  it("verschlüsselt alte Werte um und erkennt bereits neue (idempotent)", () => {
    const old = encryptWith(oldKey, "Notiz mit Umlauten äöü");
    const first = rotateValue(old, oldKey, newKey);
    expect(first.status).toBe("rotated");
    const rotated = (first as { value: string }).value;
    expect(decryptWith(newKey, rotated)).toBe("Notiz mit Umlauten äöü");
    expect(decryptWith(oldKey, rotated)).toBeNull();
    expect(rotateValue(rotated, oldKey, newKey)).toEqual({ status: "current" });
  });

  it("verändert Werte nicht, die zu keinem Schlüssel passen", () => {
    const foreign = encryptWith(deriveKey(randomBytes(32).toString("base64")), "x");
    expect(rotateValue(foreign, oldKey, newKey)).toEqual({ status: "unreadable" });
  });

  it("findet verschlüsselte Zeichenketten in JSON-Nutzlasten", () => {
    const payload = { what: "email_changed", toEncrypted: encryptWith(oldKey, "a@b.ch"), nested: [{ link: encryptWith(newKey, "https://x") }], n: 3 };
    const tally = emptyTally();
    const res = rotateJson(payload, oldKey, newKey, tally);
    expect(res.changed).toBe(true);
    expect(tally).toEqual({ rotated: 1, current: 1, unreadable: 0 });
    const out = res.value as typeof payload;
    expect(out.what).toBe("email_changed");
    expect(out.n).toBe(3);
    expect(decryptWith(newKey, out.toEncrypted)).toBe("a@b.ch");
    expect(rotateJson(out, oldKey, newKey, emptyTally()).changed).toBe(false);
  });

  it("erkennt das Chiffratformat v1", () => {
    expect(isCiphertext(encryptWith(newKey, ""))).toBe(true);
    expect(isCiphertext("v1.kurz")).toBe(false);
    expect(isCiphertext("Klartext")).toBe(false);
  });
});
