import { describe, expect, it } from "vitest";
import { fillOrganisation, missingOrganisationFields } from "./organisation";

describe("Angaben der Trägerschaft (S50, PRI01)", () => {
  const text = "## Betreiberin\n{{org.name}}\n{{org.zipCity}}, Schweiz\n{{org.unbekannt}}";

  it("setzt vorhandene Angaben ein und markiert fehlende sichtbar", () => {
    const out = fillOrganisation(text, { ORG_NAME: "Verein Beispiel" });
    expect(out).toContain("Verein Beispiel");
    expect(out).toContain("[Postleitzahl und Ort eintragen], Schweiz");
    // Unbekannte Platzhalter bleiben stehen statt still zu verschwinden
    expect(out).toContain("{{org.unbekannt}}");
  });

  it("erlaubt mehrzeilige Angaben über \\n", () => {
    expect(fillOrganisation("{{org.processors}}", { ORG_PROCESSORS: "- A, Schweiz\\n- B, Niederlande" })).toBe("- A, Schweiz\n- B, Niederlande");
  });

  it("meldet nur verwendete und fehlende Felder", () => {
    expect(missingOrganisationFields([text], { ORG_NAME: "Verein Beispiel" })).toEqual(["zipCity"]);
    expect(missingOrganisationFields([text], { ORG_NAME: "x", ORG_ZIP_CITY: "3000 Bern" })).toEqual([]);
  });
});
