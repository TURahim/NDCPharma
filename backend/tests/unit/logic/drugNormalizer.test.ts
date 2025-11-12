/**
 * Unit Tests for Drug Normalizer
 */

import { DrugNormalizer } from "../../../functions/src/logic/normalization/drugNormalizer";
import { RxNormService } from "../../../functions/src/services/rxnorm/rxnormService";
import { RxCUINotFoundError, DrugNotFoundError } from "../../../functions/src/utils/errors";

// Create mock RxNorm service
const mockRxNormService = {
  searchByName: jest.fn(),
  getApproximateMatches: jest.fn(),
  getSpellingSuggestions: jest.fn(),
  getRxCUIProperties: jest.fn(),
  getRelatedConcepts: jest.fn(),
} as unknown as RxNormService;

describe("DrugNormalizer", () => {
  let normalizer: DrugNormalizer;

  beforeEach(() => {
    jest.clearAllMocks();
    normalizer = new DrugNormalizer(mockRxNormService);
  });

  describe("normalizeDrug", () => {
    describe("Exact Match Strategy", () => {
      it("should normalize drug via exact match", async () => {
        // Mock exact match response
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({
          idGroup: {
            name: "LISINOPRIL",
            rxnormId: ["104377"],
          },
        });

        (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({
          properties: {
            rxcui: "104377",
            name: "LISINOPRIL",
            tty: "IN",
          },
        });

        const result = await normalizer.normalizeDrug("Lisinopril");

        expect(result.success).toBe(true);
        expect(result.method).toBe("exact");
        expect(result.drug?.rxcui).toBe("104377");
        expect(result.drug?.name).toBe("LISINOPRIL");
        expect(result.drug?.confidence).toBe(1.0);
        expect(mockRxNormService.searchByName).toHaveBeenCalledWith({
          name: "Lisinopril",
          maxEntries: 5,
        });
      });

      it("should extract dosage form and strength from drug name", async () => {
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({
          idGroup: {
            rxnormId: ["314076"],
          },
        });

        (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({
          properties: {
            rxcui: "314076",
            name: "LISINOPRIL 10 MG ORAL TABLET",
            tty: "SCD",
          },
        });

        const result = await normalizer.normalizeDrug("Lisinopril 10mg tablet");

        expect(result.drug?.dosageForm).toBe("TABLET");
        expect(result.drug?.strength).toBe("10 MG");
      });
    });

    describe("Approximate Match Strategy", () => {
      it("should fall back to approximate match when exact fails", async () => {
        // Exact match fails
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({});

        // Approximate match succeeds
        (mockRxNormService.getApproximateMatches as jest.Mock).mockResolvedValue({
          approximateGroup: {
            candidate: [
              { rxcui: "617318", score: "95", rank: "1" },
              { rxcui: "617319", score: "85", rank: "2" },
            ],
          },
        });

        (mockRxNormService.getRxCUIProperties as jest.Mock)
          .mockResolvedValueOnce({
            properties: {
              rxcui: "617318",
              name: "ATORVASTATIN",
              tty: "IN",
            },
          })
          .mockResolvedValueOnce({
            properties: {
              rxcui: "617319",
              name: "ATORVASTATIN CALCIUM",
              tty: "PIN",
            },
          });

        const result = await normalizer.normalizeDrug("lipitor");

        expect(result.success).toBe(true);
        expect(result.method).toBe("approximate");
        expect(result.drug?.rxcui).toBe("617318");
        expect(result.alternatives).toBeDefined();
      });

      it("should filter results by confidence threshold", async () => {
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({});

        (mockRxNormService.getApproximateMatches as jest.Mock).mockResolvedValue({
          approximateGroup: {
            candidate: [
              { rxcui: "1", score: "95", rank: "1" },
              { rxcui: "2", score: "40", rank: "5" }, // Low score
            ],
          },
        });

        (mockRxNormService.getRxCUIProperties as jest.Mock)
          .mockResolvedValueOnce({
            properties: { rxcui: "1", name: "DRUG A", tty: "IN" },
          })
          .mockResolvedValueOnce({
            properties: { rxcui: "2", name: "DRUG B", tty: "IN" },
          });

        const result = await normalizer.normalizeDrug("test");

        // Only high-confidence drug should be included
        expect(result.drug?.rxcui).toBe("1");
      });

      it("should return up to 4 alternatives", async () => {
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({});

        const candidates = Array.from({ length: 10 }, (_, i) => ({
          rxcui: `${i + 1}`,
          score: `${100 - i * 5}`,
          rank: `${i + 1}`,
        }));

        (mockRxNormService.getApproximateMatches as jest.Mock).mockResolvedValue({
          approximateGroup: { candidate: candidates },
        });

        // Mock properties for all candidates
        for (let i = 1; i <= 10; i++) {
          (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValueOnce({
            properties: {
              rxcui: `${i}`,
              name: `DRUG ${i}`,
              tty: "IN",
            },
          });
        }

        const result = await normalizer.normalizeDrug("test");

        expect(result.alternatives).toBeDefined();
        expect(result.alternatives!.length).toBeLessThanOrEqual(4);
      });
    });

    describe("Spelling Suggestion Strategy", () => {
      it("should fall back to spelling suggestions when approximate fails", async () => {
        // Exact and approximate fail
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({});
        (mockRxNormService.getApproximateMatches as jest.Mock).mockResolvedValue({});

        // Spelling suggestions succeed
        (mockRxNormService.getSpellingSuggestions as jest.Mock).mockResolvedValue({
          suggestionGroup: {
            suggestionList: {
              suggestion: ["LISINOPRIL"],
            },
          },
        });

        // Then exact match for the suggestion
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValueOnce({
          idGroup: { rxnormId: ["104377"] },
        });

        (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({
          properties: {
            rxcui: "104377",
            name: "LISINOPRIL",
            tty: "IN",
          },
        });

        const result = await normalizer.normalizeDrug("lisinipril");

        expect(result.success).toBe(true);
        expect(result.method).toBe("spelling");
        expect(result.drug?.confidence).toBeLessThan(1.0); // Confidence reduced for spelling
      });

      it("should try multiple spelling suggestions", async () => {
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({});
        (mockRxNormService.getApproximateMatches as jest.Mock).mockResolvedValue({});

        (mockRxNormService.getSpellingSuggestions as jest.Mock).mockResolvedValue({
          suggestionGroup: {
            suggestionList: {
              suggestion: ["WRONG", "LISINOPRIL"],
            },
          },
        });

        // First suggestion fails, second succeeds
        (mockRxNormService.searchByName as jest.Mock)
          .mockResolvedValueOnce({}) // WRONG fails
          .mockResolvedValueOnce({ idGroup: { rxnormId: ["104377"] } }); // LISINOPRIL succeeds

        (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({
          properties: {
            rxcui: "104377",
            name: "LISINOPRIL",
            tty: "IN",
          },
        });

        const result = await normalizer.normalizeDrug("lisinipril");

        expect(result.success).toBe(true);
      });
    });

    describe("Failure Cases", () => {
      it("should throw RxCUINotFoundError when all strategies fail", async () => {
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({});
        (mockRxNormService.getApproximateMatches as jest.Mock).mockResolvedValue({});
        (mockRxNormService.getSpellingSuggestions as jest.Mock).mockResolvedValue({});

        await expect(normalizer.normalizeDrug("invaliddrugxyz123")).rejects.toThrow(
          RxCUINotFoundError
        );
      });

      it("should include execution time in result", async () => {
        (mockRxNormService.searchByName as jest.Mock).mockResolvedValue({
          idGroup: { rxnormId: ["104377"] },
        });

        (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({
          properties: {
            rxcui: "104377",
            name: "LISINOPRIL",
            tty: "IN",
          },
        });

        const result = await normalizer.normalizeDrug("Lisinopril");

        expect(result.executionTime).toBeGreaterThan(0);
        expect(result.executionTime).toBeLessThan(5000); // Should be quick for mocked calls
      });
    });
  });

  describe("normalizeDrugByRxCUI", () => {
    it("should normalize drug when RxCUI is already known", async () => {
      (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({
        properties: {
          rxcui: "104377",
          name: "LISINOPRIL",
          tty: "IN",
        },
      });

      const result = await normalizer.normalizeDrugByRxCUI("104377");

      expect(result.rxcui).toBe("104377");
      expect(result.name).toBe("LISINOPRIL");
      expect(result.confidence).toBe(1.0);
    });

    it("should throw DrugNotFoundError for invalid RxCUI", async () => {
      (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({});

      await expect(normalizer.normalizeDrugByRxCUI("999999")).rejects.toThrow(DrugNotFoundError);
    });

    it("should handle API errors gracefully", async () => {
      (mockRxNormService.getRxCUIProperties as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      await expect(normalizer.normalizeDrugByRxCUI("104377")).rejects.toThrow(DrugNotFoundError);
    });
  });

  describe("normalizeDrugs (batch)", () => {
    it("should normalize multiple drugs", async () => {
      (mockRxNormService.searchByName as jest.Mock)
        .mockResolvedValueOnce({ idGroup: { rxnormId: ["104377"] } })
        .mockResolvedValueOnce({ idGroup: { rxnormId: ["104378"] } });

      (mockRxNormService.getRxCUIProperties as jest.Mock)
        .mockResolvedValueOnce({
          properties: { rxcui: "104377", name: "LISINOPRIL", tty: "IN" },
        })
        .mockResolvedValueOnce({
          properties: { rxcui: "104378", name: "ENALAPRIL", tty: "IN" },
        });

      const results = await normalizer.normalizeDrugs(["Lisinopril", "Enalapril"]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].drug?.name).toBe("LISINOPRIL");
      expect(results[1].drug?.name).toBe("ENALAPRIL");
    });

    it("should continue processing after individual failures", async () => {
      (mockRxNormService.searchByName as jest.Mock)
        .mockResolvedValueOnce({}) // First fails
        .mockResolvedValueOnce({ idGroup: { rxnormId: ["104378"] } }); // Second succeeds

      (mockRxNormService.getApproximateMatches as jest.Mock).mockResolvedValue({});
      (mockRxNormService.getSpellingSuggestions as jest.Mock).mockResolvedValue({});

      (mockRxNormService.getRxCUIProperties as jest.Mock).mockResolvedValue({
        properties: { rxcui: "104378", name: "ENALAPRIL", tty: "IN" },
      });

      const results = await normalizer.normalizeDrugs(["InvalidDrug", "Enalapril"]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe("validateDrugName", () => {
    it("should validate valid drug names", () => {
      expect(normalizer.validateDrugName("Lisinopril").valid).toBe(true);
      expect(normalizer.validateDrugName("Acetaminophen 500mg").valid).toBe(true);
      expect(normalizer.validateDrugName("Ibuprofen (Advil)").valid).toBe(true);
    });

    it("should reject drug names that are too short", () => {
      const result = normalizer.validateDrugName("A");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("too short");
    });

    it("should reject drug names that are too long", () => {
      const longName = "A".repeat(201);
      const result = normalizer.validateDrugName(longName);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("too long");
    });

    it("should reject drug names with invalid characters", () => {
      const result = normalizer.validateDrugName("Drug<script>alert()</script>");

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Invalid characters");
    });
  });
});

