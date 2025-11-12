import { describe, it, expect } from 'vitest';
import { generateUserPrompt, validateResponseStructure, SYSTEM_PROMPT } from '../src/internal/prompts';

describe('Prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('should contain pharmaceutical context', () => {
      expect(SYSTEM_PROMPT).toContain('pharmaceutical');
      expect(SYSTEM_PROMPT).toContain('NDC');
      expect(SYSTEM_PROMPT).toContain('prescription');
    });

    it('should specify JSON output format', () => {
      expect(SYSTEM_PROMPT).toContain('JSON');
      expect(SYSTEM_PROMPT).toContain('primaryRecommendation');
      expect(SYSTEM_PROMPT).toContain('alternatives');
    });

    it('should include key principles', () => {
      expect(SYSTEM_PROMPT).toContain('waste');
      expect(SYSTEM_PROMPT).toContain('cost-effective');
      expect(SYSTEM_PROMPT).toContain('safety');
    });
  });

  describe('generateUserPrompt', () => {
    it('should include drug information', () => {
      const prompt = generateUserPrompt({
        drug: {
          genericName: 'LISINOPRIL',
          rxcui: '104377',
          dosageForm: 'TABLET',
          strength: '10 mg',
        },
        prescription: {
          sig: '1 tablet daily',
          daysSupply: 90,
          quantityNeeded: 90,
        },
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
      });

      expect(prompt).toContain('LISINOPRIL');
      expect(prompt).toContain('104377');
      expect(prompt).toContain('TABLET');
      expect(prompt).toContain('10 mg');
    });

    it('should include prescription details', () => {
      const prompt = generateUserPrompt({
        drug: {
          genericName: 'LISINOPRIL',
          rxcui: '104377',
        },
        prescription: {
          sig: '1 tablet daily',
          daysSupply: 90,
          quantityNeeded: 90,
        },
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
      });

      expect(prompt).toContain('1 tablet daily');
      expect(prompt).toContain('90 days');
      expect(prompt).toContain('90');
    });

    it('should list all available packages', () => {
      const prompt = generateUserPrompt({
        drug: {
          genericName: 'LISINOPRIL',
          rxcui: '104377',
        },
        prescription: {
          sig: '1 tablet daily',
          daysSupply: 90,
          quantityNeeded: 90,
        },
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
          { ndc: '00071-0156-30', packageSize: 30, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
      });

      expect(prompt).toContain('00071-0156-90');
      expect(prompt).toContain('00071-0156-30');
      expect(prompt).toContain('90 TABLET');
      expect(prompt).toContain('30 TABLET');
      expect(prompt).toContain('Pfizer');
    });

    it('should include patient preferences when provided', () => {
      const prompt = generateUserPrompt({
        drug: {
          genericName: 'LISINOPRIL',
          rxcui: '104377',
        },
        prescription: {
          sig: '1 tablet daily',
          daysSupply: 90,
          quantityNeeded: 90,
        },
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
        context: {
          preferences: 'Patient prefers smaller bottles for easy handling',
        },
      });

      expect(prompt).toContain('Patient Preferences');
      expect(prompt).toContain('smaller bottles');
    });

    it('should include clinical notes when provided', () => {
      const prompt = generateUserPrompt({
        drug: {
          genericName: 'LISINOPRIL',
          rxcui: '104377',
        },
        prescription: {
          sig: '1 tablet daily',
          daysSupply: 90,
          quantityNeeded: 90,
        },
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
        context: {
          clinicalNotes: 'New medication for patient, consider trial supply',
        },
      });

      expect(prompt).toContain('Clinical Considerations');
      expect(prompt).toContain('trial supply');
    });

    it('should request JSON output', () => {
      const prompt = generateUserPrompt({
        drug: {
          genericName: 'LISINOPRIL',
          rxcui: '104377',
        },
        prescription: {
          sig: '1 tablet daily',
          daysSupply: 90,
          quantityNeeded: 90,
        },
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
      });

      expect(prompt).toContain('JSON');
    });
  });

  describe('validateResponseStructure', () => {
    const validResponse = {
      primaryRecommendation: {
        ndc: '00071-0156-90',
        packageSize: 90,
        unit: 'TABLET',
        quantityToDispense: 90,
        reasoning: 'Exact match',
        confidenceScore: 0.98,
      },
      alternatives: [
        {
          ndc: '00071-0156-23',
          packageSize: 100,
          unit: 'TABLET',
          quantityToDispense: 100,
          reasoning: 'Slight overage',
          confidenceScore: 0.85,
        },
      ],
      reasoning: {
        factors: ['Exact match', 'Zero waste'],
        considerations: ['Verify availability'],
        rationale: 'Best option overall',
      },
      costEfficiency: {
        estimatedWaste: 0,
        rating: 'high',
      },
    };

    it('should validate correct response structure', () => {
      expect(validateResponseStructure(validResponse)).toBe(true);
    });

    it('should accept response without costEfficiency', () => {
      const responseWithoutCost = { ...validResponse };
      delete (responseWithoutCost as any).costEfficiency;

      expect(validateResponseStructure(responseWithoutCost)).toBe(true);
    });

    it('should reject null response', () => {
      expect(validateResponseStructure(null)).toBe(false);
    });

    it('should reject non-object response', () => {
      expect(validateResponseStructure('string')).toBe(false);
      expect(validateResponseStructure(123)).toBe(false);
      expect(validateResponseStructure([])).toBe(false);
    });

    it('should reject response missing primaryRecommendation', () => {
      const invalid = { ...validResponse };
      delete (invalid as any).primaryRecommendation;

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response with invalid primaryRecommendation', () => {
      const invalid = {
        ...validResponse,
        primaryRecommendation: {
          ndc: '00071-0156-90',
          // Missing packageSize
          unit: 'TABLET',
        },
      };

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response with non-numeric packageSize', () => {
      const invalid = {
        ...validResponse,
        primaryRecommendation: {
          ...validResponse.primaryRecommendation,
          packageSize: '90',
        },
      };

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response with non-numeric confidenceScore', () => {
      const invalid = {
        ...validResponse,
        primaryRecommendation: {
          ...validResponse.primaryRecommendation,
          confidenceScore: 'high',
        },
      };

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response with non-array alternatives', () => {
      const invalid = {
        ...validResponse,
        alternatives: 'not an array',
      };

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response missing reasoning', () => {
      const invalid = { ...validResponse };
      delete (invalid as any).reasoning;

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response with invalid reasoning structure', () => {
      const invalid = {
        ...validResponse,
        reasoning: {
          factors: ['test'],
          // Missing considerations array
          rationale: 'test',
        },
      };

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response with invalid costEfficiency rating', () => {
      const invalid = {
        ...validResponse,
        costEfficiency: {
          estimatedWaste: 0,
          rating: 'excellent', // Invalid rating
        },
      };

      expect(validateResponseStructure(invalid)).toBe(false);
    });

    it('should reject response with non-numeric estimatedWaste', () => {
      const invalid = {
        ...validResponse,
        costEfficiency: {
          estimatedWaste: 'zero',
          rating: 'high',
        },
      };

      expect(validateResponseStructure(invalid)).toBe(false);
    });
  });
});

