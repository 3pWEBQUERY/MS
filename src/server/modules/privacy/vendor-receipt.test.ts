import { describe, expect, it } from "vitest";
import { vendorReceipt } from "./tasks";

describe("Löschbeleg Auftragsbearbeiter (PRI05, D04)", () => {
  it("behauptet ohne angebundenen Dienstleister keinen Vertrag", () => {
    const r = vendorReceipt("");
    expect(r).toMatch(/Kein E-Mail-Dienstleister angebunden/);
    expect(r).not.toMatch(/Auftragsbearbeitungsvertrag/);
  });
  it("nennt mit Dienstleister nur, was übergeben wird", () => {
    expect(vendorReceipt("smtp.example.ch")).toMatch(/Empfängeradresse und Text/);
  });
});
