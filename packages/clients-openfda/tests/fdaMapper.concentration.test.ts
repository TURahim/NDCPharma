import { describe, it, expect, beforeAll } from 'vitest';
import { extractConcentration, mapFDAResultToNDCPackage } from '../src/internal/fdaMapper';
import type { FDANDCResult } from '../src/internal/fdaTypes';

describe('FDA Mapper - Concentration Extraction', () => {
  describe('extractConcentration', () => {
    const createMockFDAResult = (strength: string, productNdc = '12345-678'): FDANDCResult => ({
      product_ndc: productNdc,
      generic_name: 'Test Drug',
      brand_name: 'TestBrand',
      dosage_form: 'SUSPENSION',
      route: ['ORAL'],
      active_ingredients: [
        {
          name: 'Test Ingredient',
          strength: strength,
        },
      ],
      packaging: [
        {
          package_ndc: '12345-678-90',
          description: '100 ML in 1 BOTTLE',
          marketing_start_date: '20200101',
        },
      ],
      labeler_name: 'Test Labeler',
      product_type: 'HUMAN PRESCRIPTION DRUG',
      marketing_category: 'NDA',
      listing_expiration_date: '20251231',
      openfda: {
        rxcui: ['123456'],
      },
    });

    describe('Standard mg/mL Format', () => {
      it('should extract "250 MG/5 ML" concentration', () => {
        const result = extractConcentration(createMockFDAResult('250 MG/5 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(250);
        expect(result?.unit).toBe('MG');
        expect(result?.perValue).toBe(5);
        expect(result?.perUnit).toBe('ML');
        expect(result?.ratio).toBe(50); // 250/5 = 50 mg/mL
        expect(result?.rawString).toBe('250 MG/5 ML');
      });

      it('should extract "100 MG/1 ML" concentration', () => {
        const result = extractConcentration(createMockFDAResult('100 MG/1 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(100);
        expect(result?.perValue).toBe(1);
        expect(result?.ratio).toBe(100);
      });

      it('should extract "125 MG/5 ML" concentration', () => {
        const result = extractConcentration(createMockFDAResult('125 MG/5 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(125);
        expect(result?.perValue).toBe(5);
        expect(result?.ratio).toBe(25); // 125/5 = 25 mg/mL
      });

      it('should extract "200 MG/5 ML" concentration', () => {
        const result = extractConcentration(createMockFDAResult('200 MG/5 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(200);
        expect(result?.perValue).toBe(5);
        expect(result?.ratio).toBe(40); // 200/5 = 40 mg/mL
      });

      it('should extract "400 MG/5 ML" concentration', () => {
        const result = extractConcentration(createMockFDAResult('400 MG/5 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(400);
        expect(result?.perValue).toBe(5);
        expect(result?.ratio).toBe(80); // 400/5 = 80 mg/mL
      });
    });

    describe('Gram Notation', () => {
      it('should extract "0.5 G/5 ML" concentration', () => {
        const result = extractConcentration(createMockFDAResult('0.5 G/5 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(0.5);
        expect(result?.unit).toBe('G');
        expect(result?.perValue).toBe(5);
        expect(result?.perUnit).toBe('ML');
        expect(result?.ratio).toBe(0.1); // 0.5/5 = 0.1 g/mL
      });

      it('should extract "1 G/10 ML" concentration', () => {
        const result = extractConcentration(createMockFDAResult('1 G/10 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(1);
        expect(result?.unit).toBe('G');
        expect(result?.perValue).toBe(10);
        expect(result?.ratio).toBe(0.1); // 1/10 = 0.1 g/mL
      });
    });

    describe('Insulin Formats', () => {
      it('should extract "100 UNIT/ML" (U-100 insulin)', () => {
        const result = extractConcentration(createMockFDAResult('100 UNIT/ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(100);
        expect(result?.unit).toBe('UNIT');
        expect(result?.perValue).toBe(1);
        expect(result?.perUnit).toBe('ML');
        expect(result?.ratio).toBe(100);
      });

      it('should extract "200 UNIT/ML" (U-200 insulin)', () => {
        const result = extractConcentration(createMockFDAResult('200 UNIT/ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(200);
        expect(result?.perValue).toBe(1);
        expect(result?.ratio).toBe(200);
      });

      it('should extract "300 UNIT/ML" (U-300 insulin)', () => {
        const result = extractConcentration(createMockFDAResult('300 UNIT/ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(300);
        expect(result?.perValue).toBe(1);
        expect(result?.ratio).toBe(300);
      });
    });

    describe('Spacing Variations', () => {
      it('should handle "250MG/5ML" (no spaces)', () => {
        const result = extractConcentration(createMockFDAResult('250MG/5ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(250);
        expect(result?.perValue).toBe(5);
        expect(result?.ratio).toBe(50);
      });

      it('should handle "250 MG / 5 ML" (spaces around slash)', () => {
        const result = extractConcentration(createMockFDAResult('250 MG / 5 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(250);
        expect(result?.perValue).toBe(5);
        expect(result?.ratio).toBe(50);
      });

      it('should handle "250  MG  /  5  ML" (extra spaces)', () => {
        const result = extractConcentration(createMockFDAResult('250  MG  /  5  ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(250);
        expect(result?.perValue).toBe(5);
        expect(result?.ratio).toBe(50);
      });
    });

    describe('Non-Concentration Formats', () => {
      it('should return undefined for "500 MG" (solid dosage)', () => {
        const result = extractConcentration(createMockFDAResult('500 MG'));
        
        expect(result).toBeUndefined();
      });

      it('should return undefined for "10 MG" (tablet)', () => {
        const result = extractConcentration(createMockFDAResult('10 MG'));
        
        expect(result).toBeUndefined();
      });

      it('should return undefined for "25 MCG" (inhaler)', () => {
        const result = extractConcentration(createMockFDAResult('25 MCG'));
        
        expect(result).toBeUndefined();
      });

      it('should return undefined for empty strength', () => {
        const mockResult = createMockFDAResult('');
        mockResult.active_ingredients[0].strength = '';
        
        const result = extractConcentration(mockResult);
        
        expect(result).toBeUndefined();
      });
    });

    describe('Edge Cases', () => {
      it('should return undefined when no active ingredients', () => {
        const mockResult = createMockFDAResult('250 MG/5 ML');
        mockResult.active_ingredients = [];
        
        const result = extractConcentration(mockResult);
        
        expect(result).toBeUndefined();
      });

      it('should return undefined when active_ingredients is null', () => {
        const mockResult = createMockFDAResult('250 MG/5 ML');
        // @ts-expect-error - Testing null case
        mockResult.active_ingredients = null;
        
        const result = extractConcentration(mockResult);
        
        expect(result).toBeUndefined();
      });

      it('should return undefined for invalid concentration format', () => {
        const result = extractConcentration(createMockFDAResult('INVALID FORMAT'));
        
        expect(result).toBeUndefined();
      });

      it('should handle decimal concentrations "12.5 MG/5 ML"', () => {
        const result = extractConcentration(createMockFDAResult('12.5 MG/5 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(12.5);
        expect(result?.perValue).toBe(5);
        expect(result?.ratio).toBe(2.5); // 12.5/5 = 2.5 mg/mL
      });

      it('should handle large concentrations "1000 MG/10 ML"', () => {
        const result = extractConcentration(createMockFDAResult('1000 MG/10 ML'));
        
        expect(result).toBeDefined();
        expect(result?.value).toBe(1000);
        expect(result?.perValue).toBe(10);
        expect(result?.ratio).toBe(100); // 1000/10 = 100 mg/mL
      });
    });

    describe('Integration with mapFDAResultToNDCPackage', () => {
      it('should include concentration in mapped package for liquid drugs', () => {
        const mockResult = createMockFDAResult('250 MG/5 ML');
        const packages = mapFDAResultToNDCPackage(mockResult);
        
        expect(packages).toHaveLength(1);
        expect(packages[0].concentration).toBeDefined();
        expect(packages[0].concentration?.value).toBe(250);
        expect(packages[0].concentration?.ratio).toBe(50);
      });

      it('should not include concentration for solid dosage forms', () => {
        const mockResult = createMockFDAResult('500 MG');
        mockResult.dosage_form = 'TABLET';
        const packages = mapFDAResultToNDCPackage(mockResult);
        
        expect(packages).toHaveLength(1);
        expect(packages[0].concentration).toBeUndefined();
      });
    });
  });
});

