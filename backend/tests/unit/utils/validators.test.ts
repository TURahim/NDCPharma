/**
 * Unit Tests for Validators
 */

import {
  validateDrugName,
  validateNDC,
  normalizeNDC,
  validateSIG,
  validateDaysSupply,
  sanitizeString,
  validatePositiveNumber,
  validateInteger,
} from "../../../functions/src/utils/validators";
import {
  InvalidDrugNameError,
  InvalidNDCError,
  InvalidSIGError,
  InvalidDaysSupplyError,
} from "../../../functions/src/utils/errors";

describe("Validators", () => {
  describe("validateDrugName", () => {
    it("should validate valid drug names", () => {
      expect(validateDrugName("Lisinopril")).toBe("Lisinopril");
      expect(validateDrugName("Acetaminophen 500mg")).toBe("Acetaminophen 500mg");
      expect(validateDrugName("Ibuprofen (Advil)")).toBe("Ibuprofen (Advil)");
    });

    it("should trim whitespace", () => {
      expect(validateDrugName("  Lisinopril  ")).toBe("Lisinopril");
    });

    it("should throw error for empty or short names", () => {
      expect(() => validateDrugName("")).toThrow(InvalidDrugNameError);
      expect(() => validateDrugName("A")).toThrow(InvalidDrugNameError);
    });

    it("should throw error for invalid characters", () => {
      expect(() => validateDrugName("Drug<script>")).toThrow(InvalidDrugNameError);
    });

    it("should throw error for too long names", () => {
      const longName = "A".repeat(201);
      expect(() => validateDrugName(longName)).toThrow(InvalidDrugNameError);
    });
  });

  describe("validateNDC", () => {
    it("should validate valid NDC formats", () => {
      expect(validateNDC("12345-678-90")).toBe("12345-678-90");
      expect(validateNDC("12345-6789-01")).toBe("12345-6789-01");
      expect(validateNDC("1234567890")).toBe("1234567890");
      expect(validateNDC("12345678901")).toBe("12345678901");
    });

    it("should trim whitespace", () => {
      expect(validateNDC("  12345-678-90  ")).toBe("12345-678-90");
    });

    it("should throw error for invalid NDC formats", () => {
      expect(() => validateNDC("123-456-789")).toThrow(InvalidNDCError);
      expect(() => validateNDC("abcdefghijk")).toThrow(InvalidNDCError);
      expect(() => validateNDC("12345")).toThrow(InvalidNDCError);
    });
  });

  describe("normalizeNDC", () => {
    it("should normalize 10-digit NDC to 11-digit format", () => {
      expect(normalizeNDC("1234567890")).toBe("12345-0678-90");
      expect(normalizeNDC("12345-678-90")).toBe("12345-0678-90");
    });

    it("should format 11-digit NDC with dashes", () => {
      expect(normalizeNDC("12345678901")).toBe("12345-6789-01");
    });

    it("should preserve already correctly formatted NDCs", () => {
      expect(normalizeNDC("12345-6789-01")).toBe("12345-6789-01");
    });
  });

  describe("validateSIG", () => {
    it("should validate valid SIG formats", () => {
      expect(validateSIG("Take 1 tablet twice daily")).toBe("Take 1 tablet twice daily");
      expect(validateSIG("2.5mL every 6 hours")).toBe("2.5mL every 6 hours");
      expect(validateSIG("1 capsule PO QD")).toBe("1 capsule PO QD");
    });

    it("should trim whitespace", () => {
      expect(validateSIG("  Take 1 tablet  ")).toBe("Take 1 tablet");
    });

    it("should sanitize dangerous characters", () => {
      expect(validateSIG("Take 1 tablet <script>")).toBe("Take 1 tablet script");
    });

    it("should throw error for empty or short SIG", () => {
      expect(() => validateSIG("")).toThrow(InvalidSIGError);
      expect(() => validateSIG("1")).toThrow(InvalidSIGError);
    });

    it("should throw error for too long SIG", () => {
      const longSIG = "A".repeat(501);
      expect(() => validateSIG(longSIG)).toThrow(InvalidSIGError);
    });
  });

  describe("validateDaysSupply", () => {
    it("should validate valid days supply", () => {
      expect(validateDaysSupply(30)).toBe(30);
      expect(validateDaysSupply(90)).toBe(90);
      expect(validateDaysSupply(1)).toBe(1);
      expect(validateDaysSupply(365)).toBe(365);
    });

    it("should round to nearest integer", () => {
      expect(validateDaysSupply(30.7)).toBe(31);
      expect(validateDaysSupply(30.2)).toBe(30);
    });

    it("should throw error for invalid days supply", () => {
      expect(() => validateDaysSupply(0)).toThrow(InvalidDaysSupplyError);
      expect(() => validateDaysSupply(-1)).toThrow(InvalidDaysSupplyError);
      expect(() => validateDaysSupply(366)).toThrow(InvalidDaysSupplyError);
      expect(() => validateDaysSupply(NaN)).toThrow(InvalidDaysSupplyError);
    });
  });

  describe("sanitizeString", () => {
    it("should remove dangerous characters", () => {
      expect(sanitizeString("Hello<script>alert()</script>")).toBe("Helloscriptalert()/script");
      expect(sanitizeString("Test{object}")).toBe("Testobject");
    });

    it("should trim whitespace", () => {
      expect(sanitizeString("  Hello  ")).toBe("Hello");
    });

    it("should handle empty strings", () => {
      expect(sanitizeString("")).toBe("");
    });
  });

  describe("validatePositiveNumber", () => {
    it("should validate positive numbers", () => {
      expect(validatePositiveNumber(5, "count")).toBe(5);
      expect(validatePositiveNumber(0.1, "dose")).toBe(0.1);
    });

    it("should throw error for non-positive numbers", () => {
      expect(() => validatePositiveNumber(0, "count")).toThrow();
      expect(() => validatePositiveNumber(-5, "count")).toThrow();
      expect(() => validatePositiveNumber(NaN, "count")).toThrow();
    });
  });

  describe("validateInteger", () => {
    it("should validate integers", () => {
      expect(validateInteger(5, "count")).toBe(5);
      expect(validateInteger(-5, "count")).toBe(-5);
      expect(validateInteger(0, "count")).toBe(0);
    });

    it("should throw error for non-integers", () => {
      expect(() => validateInteger(5.5, "count")).toThrow();
      expect(() => validateInteger(NaN, "count")).toThrow();
    });
  });
});

