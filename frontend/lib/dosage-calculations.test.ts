import { describe, it, expect } from "vitest";
import { computeQuantityFromSig } from "./dosage-calculations";
import type { SIGData } from "@/types/workflow";

describe("computeQuantityFromSig", () => {
  it("calculates quantities for structured SIGs", () => {
    const sig: SIGData = {
      mode: "structured",
      structured: {
        dose: 1,
        frequency: 2,
        unit: "tablet",
      },
      daysSupply: 30,
    };

    const result = computeQuantityFromSig(sig);
    expect(result).not.toBeNull();
    expect(result?.totalQuantity).toBe(60);
    expect(result?.unit).toBe("tablet");
    expect(result?.breakdown).toContain("30 days");
  });

  it("calculates quantities for parsed free-text SIGs", () => {
    const sig: SIGData = {
      mode: "freetext",
      freetext: "Take 5 mL by mouth three times daily",
      parsed: {
        dose: 5,
        frequency: 3,
        unit: "mL",
      },
      daysSupply: 10,
    };

    const result = computeQuantityFromSig(sig);
    expect(result).not.toBeNull();
    expect(result?.totalQuantity).toBe(150);
    expect(result?.unit).toBe("mL");
  });

  it("returns null when free-text SIG lacks parsed data", () => {
    const sig: SIGData = {
      mode: "freetext",
      freetext: "Take as directed",
      daysSupply: 7,
    };

    const result = computeQuantityFromSig(sig);
    expect(result).toBeNull();
  });
});
