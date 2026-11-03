import { describe, expect, it } from "vitest";
import { STATIC_SAFETY_CONTACTS } from "@/lib/safety-static";
import { renderHelpPage } from "./render";

const base = {
  contacts: STATIC_SAFETY_CONTACTS,
  source: "fallback" as const,
  moderationHours: "täglich 09–18 Uhr",
  platformUrl: "https://example.ch",
  generatedAt: new Date("2026-11-03T08:00:00Z"),
};

describe("Hilfe-Dienst (NFR20, SAF06)", () => {
  it("liefert eine vollständige Seite ohne Skripte und mit Notruf 144", () => {
    const html = renderHelpPage(base);
    expect(html).toContain('<html lang="de-CH">');
    expect(html).toContain('href="tel:144"');
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("gepflegte Liste ist gerade nicht abrufbar");
  });

  it("maskiert Inhalte und gibt nur https-Links aus", () => {
    const html = renderHelpPage({
      ...base,
      source: "database",
      contacts: [
        {
          id: "x",
          name: "<b>Test</b>",
          description: "a & b",
          phone: "0800 000 000",
          url: "javascript:alert(1)",
          availability: "Werktags",
          region: "Bern",
          verifiedAt: "2026-10-01T00:00:00Z",
          verifiedBy: "Krisenfachperson",
        },
      ],
    });
    expect(html).toContain("&lt;b&gt;Test&lt;/b&gt;");
    expect(html).toContain("a &amp; b");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="tel:0800000000"');
    expect(html).not.toContain("gepflegte Liste ist gerade nicht abrufbar");
  });

  it("enthält keine Schatten und keine Verläufe (DESIGN.md)", () => {
    const html = renderHelpPage(base);
    expect(html).not.toMatch(/gradient/i);
    expect(html).not.toMatch(/box-shadow:\s*(?!none)/i);
  });
});
