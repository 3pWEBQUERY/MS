import { describe, expect, it } from "vitest";
import { normalizeRecoveryCode } from "./recovery-code";

describe("Wiederherstellungscodes (ACC05)", () => {
  it("vereinheitlicht Gross-/Kleinschreibung, Leerzeichen und fehlenden Bindestrich", () => {
    expect(normalizeRecoveryCode("ab2cd-ef3gh")).toBe("ab2cd-ef3gh");
    expect(normalizeRecoveryCode("AB2CD-EF3GH")).toBe("ab2cd-ef3gh");
    expect(normalizeRecoveryCode("ab2cdef3gh")).toBe("ab2cd-ef3gh");
    expect(normalizeRecoveryCode(" ab2cd ef3gh ")).toBe("ab2cd-ef3gh");
    expect(normalizeRecoveryCode("ab2cd–ef3gh")).toBe("ab2cd-ef3gh");
  });
  it("lässt andere Eingaben unverändert ungültig", () => {
    expect(normalizeRecoveryCode("123")).toBe("123");
  });
});
