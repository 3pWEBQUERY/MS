import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MAGIC, decrypt, newCipher, objectKey } from "../scripts/backup/format";

function encryptBuffer(key: Buffer, plain: Buffer) {
  const { iv, cipher } = newCipher(key);
  return Buffer.concat([MAGIC, iv, cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
}

describe("Backup-Format (NFR07, NFR09)", () => {
  const key = randomBytes(32);
  const dump = Buffer.concat([Buffer.from("PGDMP"), randomBytes(2048)]);

  it("entschlüsselt, was verschlüsselt wurde", () => {
    expect(decrypt(key, encryptBuffer(key, dump)).equals(dump)).toBe(true);
  });

  it("weist veränderte Dateien und falsche Schlüssel ab", () => {
    const file = encryptBuffer(key, dump);
    file[MAGIC.length + 20] ^= 0xff;
    expect(() => decrypt(key, file)).toThrow();
    expect(() => decrypt(randomBytes(32), encryptBuffer(key, dump))).toThrow();
    expect(() => decrypt(key, Buffer.from("kein backup"))).toThrow(/Kennung/);
  });

  it("benennt Objekte chronologisch sortierbar", () => {
    expect(objectKey(new Date("2026-11-03T07:17:00.123Z"))).toBe("postgres/2026/11/03/2026-11-03T07-17-00Z.dump.enc");
  });
});
