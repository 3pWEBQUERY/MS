import { describe, expect, it } from "vitest";
import { countRequest, countServerError, errorRatePercent, takeCounts } from "./request-counter";

describe("Fehlerquote (NFR16)", () => {
  it("zählt und setzt beim Abholen zurück", () => {
    takeCounts();
    countRequest();
    countRequest();
    countServerError();
    expect(takeCounts()).toEqual({ requests: 2, errors: 1 });
    expect(takeCounts()).toEqual({ requests: 0, errors: 0 });
  });

  it("alarmiert erst über 2 % und ab 50 Anfragen", () => {
    expect(errorRatePercent(49, 49)).toBeNull();
    expect(errorRatePercent(100, 2)).toBeNull();
    expect(errorRatePercent(100, 3)).toBe(3);
    expect(errorRatePercent(1000, 21)).toBe(2.1);
  });
});
