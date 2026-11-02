import { describe, expect, it } from "vitest";
import { parseBlocks } from "@/components/content/rich-text";
import { stillValid } from "./articles";
import { sanitizeFilename, sniffImageType } from "./media";
import { isInternalPath, parseMomentConfig } from "./moment";
import { DEFAULT_MOMENT_CONFIG } from "@/lib/moment";
import { normalizeQuery } from "./search";

describe("Textformat (CON01)", () => {
  it("erkennt Absätze, Zwischentitel und Listen ohne HTML", () => {
    const blocks = parseBlocks("Einleitung\nweiter\n\n## Titel\n- eins\n- zwei\n\n<script>x</script>");
    expect(blocks).toEqual([
      { kind: "p", text: "Einleitung weiter" },
      { kind: "h2", text: "Titel" },
      { kind: "ul", items: ["eins", "zwei"] },
      { kind: "p", text: "<script>x</script>" },
    ]);
  });
});

describe("Prüftermin (CON03, AT08)", () => {
  it("blendet überfällige Inhalte aus", () => {
    const now = Date.parse("2026-11-02T10:00:00Z");
    expect(stillValid("2026-11-03T00:00:00Z", now)).toBe(true);
    expect(stillValid("2026-11-01T00:00:00Z", now)).toBe(false);
    expect(stillValid(null, now)).toBe(false);
  });
});

describe("Medien", () => {
  it("prüft Magic Bytes statt Dateiendung und lehnt SVG ab", () => {
    expect(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe("image/png");
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });
  it("bereinigt Dateinamen", () => {
    expect(sanitizeFilename("../../etc/pa<ss>wd.png")).toBe("passwd.png");
    expect(sanitizeFilename("...")).toBe("bild");
  });
});

describe("Mein Moment (HOM02)", () => {
  it("lässt nur interne Pfade zu", () => {
    expect(isInternalPath("/wissen")).toBe(true);
    expect(isInternalPath("//evil.example")).toBe(false);
    expect(isInternalPath("https://evil.example")).toBe(false);
    expect(isInternalPath("/api/v1/x")).toBe(false);
  });
  it("akzeptiert höchstens drei Ziele je Absicht", () => {
    expect(parseMomentConfig(DEFAULT_MOMENT_CONFIG)).not.toBeNull();
    const four = { ...DEFAULT_MOMENT_CONFIG, learn: [...DEFAULT_MOMENT_CONFIG.learn, DEFAULT_MOMENT_CONFIG.learn[0]] };
    expect(parseMomentConfig(four)).toBeNull();
  });
});

describe("Suche (CON07)", () => {
  it("normalisiert Suchbegriffe", () => {
    expect(normalizeQuery(["  Fatigue \n im  Alltag "])).toBe("Fatigue im Alltag");
    expect(normalizeQuery(undefined)).toBe("");
  });
});
