/**
 * Unit Tests for RxNorm Mapper
 */

import {
  extractRxCUIsFromSearch,
  extractCandidatesFromApproximateMatch,
  mapPropertiesToNormalizedDrug,
  calculateConfidenceFromScore,
  normalizeDrugName,
  areDrugNamesSimilar,
  extractDosageForm,
  extractStrength,
  parseDrugName,
  sortByConfidence,
  filterByConfidence,
  deduplicateDrugs,
  mergeDrugInformation,
} from "../../../functions/src/services/rxnorm/rxnormMapper";
import {
  RxNormSearchResponse,
  RxNormApproximateMatchResponse,
  RxNormPropertiesResponse,
  NormalizedDrug,
} from "../../../functions/src/services/rxnorm/rxnormTypes";

describe("RxNorm Mapper", () => {
  describe("extractRxCUIsFromSearch", () => {
    it("should extract RxCUIs from search response", () => {
      const response: RxNormSearchResponse = {
        idGroup: {
          name: "LISINOPRIL",
          rxnormId: ["104377", "104378"],
        },
      };

      const rxcuis = extractRxCUIsFromSearch(response);

      expect(rxcuis).toEqual(["104377", "104378"]);
    });

    it("should handle single RxCUI as string", () => {
      const response: RxNormSearchResponse = {
        idGroup: {
          name: "LISINOPRIL",
          rxnormId: ["104377"] as any,
        },
      };

      const rxcuis = extractRxCUIsFromSearch(response);

      expect(rxcuis).toEqual(["104377"]);
    });

    it("should return empty array for no results", () => {
      const response: RxNormSearchResponse = {};

      const rxcuis = extractRxCUIsFromSearch(response);

      expect(rxcuis).toEqual([]);
    });

    it("should filter out empty strings", () => {
      const response: RxNormSearchResponse = {
        idGroup: {
          rxnormId: ["104377", "", "104378"],
        },
      };

      const rxcuis = extractRxCUIsFromSearch(response);

      expect(rxcuis).toEqual(["104377", "104378"]);
    });
  });

  describe("extractCandidatesFromApproximateMatch", () => {
    it("should extract candidates from approximate match response", () => {
      const response: RxNormApproximateMatchResponse = {
        approximateGroup: {
          inputTerm: "lipitor",
          candidate: [
            { rxcui: "617318", score: "100", rank: "1" },
            { rxcui: "617319", score: "95", rank: "2" },
          ],
        },
      };

      const candidates = extractCandidatesFromApproximateMatch(response);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].rxcui).toBe("617318");
    });

    it("should handle single candidate as object", () => {
      const response: RxNormApproximateMatchResponse = {
        approximateGroup: {
          candidate: { rxcui: "617318", score: "100", rank: "1" } as any,
        },
      };

      const candidates = extractCandidatesFromApproximateMatch(response);

      expect(candidates).toHaveLength(1);
    });

    it("should return empty array for no candidates", () => {
      const response: RxNormApproximateMatchResponse = {
        approximateGroup: {},
      };

      const candidates = extractCandidatesFromApproximateMatch(response);

      expect(candidates).toEqual([]);
    });
  });

  describe("mapPropertiesToNormalizedDrug", () => {
    it("should map properties to normalized drug", () => {
      const response: RxNormPropertiesResponse = {
        properties: {
          rxcui: "104377",
          name: "LISINOPRIL",
          tty: "IN",
          synonym: "PRINIVIL",
        },
      };

      const drug = mapPropertiesToNormalizedDrug(response, 1.0);

      expect(drug).toMatchObject({
        rxcui: "104377",
        name: "LISINOPRIL",
        termType: "IN",
        synonyms: ["PRINIVIL"],
        confidence: 1.0,
      });
    });

    it("should handle no properties", () => {
      const response: RxNormPropertiesResponse = {};

      const drug = mapPropertiesToNormalizedDrug(response);

      expect(drug).toBeNull();
    });

    it("should handle no synonyms", () => {
      const response: RxNormPropertiesResponse = {
        properties: {
          rxcui: "104377",
          name: "LISINOPRIL",
        },
      };

      const drug = mapPropertiesToNormalizedDrug(response);

      expect(drug?.synonyms).toEqual([]);
    });
  });

  describe("calculateConfidenceFromScore", () => {
    it("should calculate confidence from perfect score", () => {
      const confidence = calculateConfidenceFromScore("100", "1");

      expect(confidence).toBeGreaterThan(0.9);
    });

    it("should calculate confidence from good score", () => {
      const confidence = calculateConfidenceFromScore("80", "2");

      expect(confidence).toBeGreaterThan(0.3);
      expect(confidence).toBeLessThan(1.0);
    });

    it("should calculate confidence from low score", () => {
      const confidence = calculateConfidenceFromScore("40", "5");

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThan(0.5);
    });

    it("should handle invalid score format", () => {
      const confidence = calculateConfidenceFromScore("invalid", "1");

      expect(confidence).toBe(0.5); // Default value
    });

    it("should cap confidence at 1.0", () => {
      const confidence = calculateConfidenceFromScore("150", "1");

      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("normalizeDrugName", () => {
    it("should normalize drug name to uppercase", () => {
      expect(normalizeDrugName("Lisinopril")).toBe("LISINOPRIL");
    });

    it("should remove special characters", () => {
      expect(normalizeDrugName("Acetaminophen-500mg")).toBe("ACETAMINOPHEN 500MG");
    });

    it("should normalize whitespace", () => {
      expect(normalizeDrugName("Ibuprofen  200mg   tablet")).toBe("IBUPROFEN 200MG TABLET");
    });

    it("should trim whitespace", () => {
      expect(normalizeDrugName("  Aspirin  ")).toBe("ASPIRIN");
    });
  });

  describe("areDrugNamesSimilar", () => {
    it("should detect exact match", () => {
      expect(areDrugNamesSimilar("LISINOPRIL", "LISINOPRIL")).toBe(true);
    });

    it("should detect case-insensitive match", () => {
      expect(areDrugNamesSimilar("Lisinopril", "LISINOPRIL")).toBe(true);
    });

    it("should detect substring match", () => {
      expect(areDrugNamesSimilar("LISINOPRIL 10 MG", "LISINOPRIL")).toBe(true);
    });

    it("should detect different drugs", () => {
      expect(areDrugNamesSimilar("LISINOPRIL", "ENALAPRIL")).toBe(false);
    });
  });

  describe("extractDosageForm", () => {
    it("should extract tablet dosage form", () => {
      expect(extractDosageForm("LISINOPRIL 10 MG ORAL TABLET")).toBe("TABLET");
    });

    it("should extract capsule dosage form", () => {
      expect(extractDosageForm("AMOXICILLIN 500 MG CAPSULE")).toBe("CAPSULE");
    });

    it("should extract solution dosage form", () => {
      expect(extractDosageForm("AMOXICILLIN 250MG/5ML ORAL SOLUTION")).toBe("SOLUTION");
    });

    it("should extract cream dosage form", () => {
      expect(extractDosageForm("HYDROCORTISONE 1% TOPICAL CREAM")).toBe("CREAM");
    });

    it("should return undefined for unknown form", () => {
      expect(extractDosageForm("GENERIC DRUG NAME")).toBeUndefined();
    });
  });

  describe("extractStrength", () => {
    it("should extract simple strength in MG", () => {
      expect(extractStrength("LISINOPRIL 10 MG TABLET")).toBe("10 MG");
    });

    it("should extract strength in MCG", () => {
      expect(extractStrength("LEVOTHYROXINE 25 MCG TABLET")).toBe("25 MCG");
    });

    it("should extract strength with decimal", () => {
      expect(extractStrength("LORAZEPAM 0.5MG TABLET")).toBe("0.5MG");
    });

    it("should extract liquid concentration", () => {
      expect(extractStrength("AMOXICILLIN 250MG/5ML SUSPENSION")).toBe("250MG/5ML");
    });

    it("should extract percentage strength", () => {
      expect(extractStrength("HYDROCORTISONE 1% CREAM")).toBe("1%");
    });

    it("should return undefined for no strength", () => {
      expect(extractStrength("ASPIRIN TABLET")).toBeUndefined();
    });
  });

  describe("parseDrugName", () => {
    it("should parse complete drug name", () => {
      const parsed = parseDrugName("LISINOPRIL 10 MG ORAL TABLET");

      expect(parsed.baseName).toBe("LISINOPRIL ORAL");
      expect(parsed.strength).toBe("10 MG");
      expect(parsed.dosageForm).toBe("TABLET");
    });

    it("should parse drug name without strength", () => {
      const parsed = parseDrugName("ASPIRIN TABLET");

      expect(parsed.baseName).toBe("ASPIRIN");
      expect(parsed.dosageForm).toBe("TABLET");
      expect(parsed.strength).toBeUndefined();
    });

    it("should parse drug name without dosage form", () => {
      const parsed = parseDrugName("LISINOPRIL 10 MG");

      expect(parsed.baseName).toBe("LISINOPRIL");
      expect(parsed.strength).toBe("10 MG");
      expect(parsed.dosageForm).toBeUndefined();
    });

    it("should parse generic drug name", () => {
      const parsed = parseDrugName("GENERIC DRUG");

      expect(parsed.baseName).toBe("GENERIC DRUG");
      expect(parsed.strength).toBeUndefined();
      expect(parsed.dosageForm).toBeUndefined();
    });
  });

  describe("sortByConfidence", () => {
    it("should sort drugs by confidence descending", () => {
      const drugs: NormalizedDrug[] = [
        { rxcui: "1", name: "Drug A", termType: "SCD", confidence: 0.5 },
        { rxcui: "2", name: "Drug B", termType: "SCD", confidence: 0.9 },
        { rxcui: "3", name: "Drug C", termType: "SCD", confidence: 0.7 },
      ];

      const sorted = sortByConfidence(drugs);

      expect(sorted[0].confidence).toBe(0.9);
      expect(sorted[1].confidence).toBe(0.7);
      expect(sorted[2].confidence).toBe(0.5);
    });

    it("should not mutate original array", () => {
      const drugs: NormalizedDrug[] = [
        { rxcui: "1", name: "Drug A", termType: "SCD", confidence: 0.5 },
        { rxcui: "2", name: "Drug B", termType: "SCD", confidence: 0.9 },
      ];

      const originalOrder = [...drugs];
      sortByConfidence(drugs);

      expect(drugs).toEqual(originalOrder);
    });
  });

  describe("filterByConfidence", () => {
    it("should filter drugs by minimum confidence", () => {
      const drugs: NormalizedDrug[] = [
        { rxcui: "1", name: "Drug A", termType: "SCD", confidence: 0.8 },
        { rxcui: "2", name: "Drug B", termType: "SCD", confidence: 0.4 },
        { rxcui: "3", name: "Drug C", termType: "SCD", confidence: 0.6 },
      ];

      const filtered = filterByConfidence(drugs, 0.5);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].confidence).toBe(0.8);
      expect(filtered[1].confidence).toBe(0.6);
    });

    it("should use default threshold of 0.5", () => {
      const drugs: NormalizedDrug[] = [
        { rxcui: "1", name: "Drug A", termType: "SCD", confidence: 0.6 },
        { rxcui: "2", name: "Drug B", termType: "SCD", confidence: 0.4 },
      ];

      const filtered = filterByConfidence(drugs);

      expect(filtered).toHaveLength(1);
    });
  });

  describe("deduplicateDrugs", () => {
    it("should remove duplicate RxCUIs", () => {
      const drugs: NormalizedDrug[] = [
        { rxcui: "104377", name: "Drug A", termType: "SCD", confidence: 0.9 },
        { rxcui: "104377", name: "Drug A Dup", termType: "SCD", confidence: 0.8 },
        { rxcui: "104378", name: "Drug B", termType: "SCD", confidence: 0.7 },
      ];

      const unique = deduplicateDrugs(drugs);

      expect(unique).toHaveLength(2);
      expect(unique[0].name).toBe("Drug A"); // First occurrence kept
      expect(unique[1].rxcui).toBe("104378");
    });

    it("should keep first occurrence of duplicates", () => {
      const drugs: NormalizedDrug[] = [
        { rxcui: "1", name: "First", termType: "SCD", confidence: 0.5 },
        { rxcui: "1", name: "Second", termType: "SCD", confidence: 0.9 },
      ];

      const unique = deduplicateDrugs(drugs);

      expect(unique[0].name).toBe("First");
    });
  });

  describe("mergeDrugInformation", () => {
    it("should merge information from multiple drugs", () => {
      const drugs: NormalizedDrug[] = [
        {
          rxcui: "104377",
          name: "LISINOPRIL",
          termType: "IN",
          confidence: 0.8,
          genericName: "Lisinopril",
        },
        {
          rxcui: "104377",
          name: "LISINOPRIL",
          termType: "IN",
          confidence: 0.9,
          brandName: "Prinivil",
        },
      ];

      const merged = mergeDrugInformation(drugs);

      expect(merged?.genericName).toBe("Lisinopril");
      expect(merged?.brandName).toBe("Prinivil");
      expect(merged?.confidence).toBe(0.9); // Highest confidence
    });

    it("should return null for empty array", () => {
      const merged = mergeDrugInformation([]);

      expect(merged).toBeNull();
    });

    it("should return single drug unchanged", () => {
      const drugs: NormalizedDrug[] = [
        { rxcui: "104377", name: "LISINOPRIL", termType: "IN", confidence: 1.0 },
      ];

      const merged = mergeDrugInformation(drugs);

      expect(merged).toEqual(drugs[0]);
    });

    it("should merge synonyms from all drugs", () => {
      const drugs: NormalizedDrug[] = [
        {
          rxcui: "104377",
          name: "LISINOPRIL",
          termType: "IN",
          confidence: 0.8,
          synonyms: ["PRINIVIL"],
        },
        {
          rxcui: "104377",
          name: "LISINOPRIL",
          termType: "IN",
          confidence: 0.8,
          synonyms: ["ZESTRIL"],
        },
      ];

      const merged = mergeDrugInformation(drugs);

      expect(merged?.synonyms).toContain("PRINIVIL");
      expect(merged?.synonyms).toContain("ZESTRIL");
      expect(merged?.synonyms).toHaveLength(2);
    });
  });
});

