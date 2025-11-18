/**
 * Concentration Parser Tests
 * Comprehensive test suite for concentration parsing functionality
 */

import { describe, it, expect } from 'vitest';
import {
  parseConcentration,
  isConcentrationString,
  normalizeConcentrationUnits,
  calculateConcentrationRatio,
  detectConcentrationFormat,
} from '../src/concentrationParser';

describe('concentrationParser', () => {
  describe('parseConcentration - Standard formats', () => {
    it('should parse "250 MG/5 ML" correctly', () => {
      const result = parseConcentration('250 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration).not.toBeNull();
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.unit).toBe('MG');
      expect(result.concentration?.perValue).toBe(5);
      expect(result.concentration?.perUnit).toBe('ML');
      expect(result.concentration?.ratio).toBe(50);
      expect(result.concentration?.rawString).toBe('250 MG/5 ML');
      expect(result.format).toBe('mg/ml');
    });

    it('should parse "100 MG/1 ML" correctly', () => {
      const result = parseConcentration('100 MG/1 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(100);
      expect(result.concentration?.perValue).toBe(1);
      expect(result.concentration?.ratio).toBe(100);
    });

    it('should parse "600 MG/5 ML" correctly', () => {
      const result = parseConcentration('600 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(600);
      expect(result.concentration?.ratio).toBe(120);
    });

    it('should parse "400 MG/5 ML" correctly', () => {
      const result = parseConcentration('400 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(400);
      expect(result.concentration?.ratio).toBe(80);
    });

    it('should parse "200 MG/5 ML" correctly', () => {
      const result = parseConcentration('200 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(200);
      expect(result.concentration?.ratio).toBe(40);
    });

    it('should parse "500 MG/5 ML" correctly', () => {
      const result = parseConcentration('500 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(500);
      expect(result.concentration?.ratio).toBe(100);
    });

    it('should parse "125 MG/5 ML" correctly', () => {
      const result = parseConcentration('125 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(125);
      expect(result.concentration?.ratio).toBe(25);
    });

    it('should parse "250 MG/10 ML" correctly', () => {
      const result = parseConcentration('250 MG/10 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.perValue).toBe(10);
      expect(result.concentration?.ratio).toBe(25);
    });

    it('should parse "500 MG/10 ML" correctly', () => {
      const result = parseConcentration('500 MG/10 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(500);
      expect(result.concentration?.perValue).toBe(10);
      expect(result.concentration?.ratio).toBe(50);
    });

    it('should parse "1000 MG/10 ML" correctly', () => {
      const result = parseConcentration('1000 MG/10 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(1000);
      expect(result.concentration?.perValue).toBe(10);
      expect(result.concentration?.ratio).toBe(100);
    });
  });

  describe('parseConcentration - Gram notation', () => {
    it('should parse "1 G/5 ML" and convert to mg', () => {
      const result = parseConcentration('1 G/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(1000); // Converted to mg
      expect(result.concentration?.unit).toBe('MG');
      expect(result.concentration?.perValue).toBe(5);
      expect(result.concentration?.ratio).toBe(200);
      expect(result.format).toBe('g/ml');
    });

    it('should parse "0.5 G/5 ML" and convert to mg', () => {
      const result = parseConcentration('0.5 G/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(500);
      expect(result.concentration?.ratio).toBe(100);
    });

    it('should parse "0.25 G/5 ML" and convert to mg', () => {
      const result = parseConcentration('0.25 G/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.ratio).toBe(50);
    });

    it('should parse "2 G/10 ML" and convert to mg', () => {
      const result = parseConcentration('2 G/10 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(2000);
      expect(result.concentration?.ratio).toBe(200);
    });

    it('should parse "1.5 G/15 ML" and convert to mg', () => {
      const result = parseConcentration('1.5 G/15 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(1500);
      expect(result.concentration?.perValue).toBe(15);
      expect(result.concentration?.ratio).toBe(100);
    });
  });

  describe('parseConcentration - Insulin formats', () => {
    it('should parse "U-100" correctly', () => {
      const result = parseConcentration('U-100');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(100);
      expect(result.concentration?.unit).toBe('UNITS');
      expect(result.concentration?.perValue).toBe(1);
      expect(result.concentration?.perUnit).toBe('ML');
      expect(result.concentration?.ratio).toBe(100);
      expect(result.format).toBe('units/ml');
    });

    it('should parse "U-500" correctly', () => {
      const result = parseConcentration('U-500');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(500);
      expect(result.concentration?.ratio).toBe(500);
    });

    it('should parse "U-200" correctly', () => {
      const result = parseConcentration('U-200');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(200);
      expect(result.concentration?.ratio).toBe(200);
    });
  });

  describe('parseConcentration - Spacing variations', () => {
    it('should parse "250 MG / 5 ML" with spaces', () => {
      const result = parseConcentration('250 MG / 5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.ratio).toBe(50);
    });

    it('should parse "250MG/5ML" without spaces', () => {
      const result = parseConcentration('250MG/5ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.ratio).toBe(50);
    });

    it('should parse "250 mg/5 ml" lowercase', () => {
      const result = parseConcentration('250 mg/5 ml');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.unit).toBe('MG');
      expect(result.concentration?.perUnit).toBe('ML');
      expect(result.concentration?.ratio).toBe(50);
    });

    it('should parse "250 Mg / 5 Ml" mixed case', () => {
      const result = parseConcentration('250 Mg / 5 Ml');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.ratio).toBe(50);
    });

    it('should parse "250  MG  /  5  ML" with multiple spaces', () => {
      const result = parseConcentration('250  MG  /  5  ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.value).toBe(250);
      expect(result.concentration?.ratio).toBe(50);
    });
  });

  describe('parseConcentration - Edge cases', () => {
    it('should return null for empty string', () => {
      const result = parseConcentration('');
      expect(result.success).toBe(false);
      expect(result.concentration).toBeNull();
      expect(result.format).toBe('unknown');
    });

    it('should return null for "TABLET"', () => {
      const result = parseConcentration('TABLET');
      expect(result.success).toBe(false);
      expect(result.concentration).toBeNull();
    });

    it('should return null for "CAPSULE"', () => {
      const result = parseConcentration('CAPSULE');
      expect(result.success).toBe(false);
      expect(result.concentration).toBeNull();
    });

    it('should throw error for "0 MG/5 ML" (zero numerator)', () => {
      expect(() => parseConcentration('0 MG/5 ML')).toThrow('Concentration numerator must be greater than zero');
    });

    it('should throw error for "250 MG/0 ML" (zero denominator)', () => {
      expect(() => parseConcentration('250 MG/0 ML')).toThrow('Concentration denominator must be greater than zero');
    });

    it('should return null for "-250 MG/5 ML" (negative)', () => {
      const result = parseConcentration('-250 MG/5 ML');
      expect(result.success).toBe(false);
      expect(result.concentration).toBeNull();
    });

    it('should return null for invalid format "ABC/XYZ"', () => {
      const result = parseConcentration('ABC/XYZ');
      expect(result.success).toBe(false);
      expect(result.concentration).toBeNull();
    });
  });

  describe('isConcentrationString', () => {
    it('should return true for "250 MG/5 ML"', () => {
      expect(isConcentrationString('250 MG/5 ML')).toBe(true);
    });

    it('should return true for "U-100"', () => {
      expect(isConcentrationString('U-100')).toBe(true);
    });

    it('should return false for "TABLET"', () => {
      expect(isConcentrationString('TABLET')).toBe(false);
    });

    it('should return false for "CAPSULE"', () => {
      expect(isConcentrationString('CAPSULE')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isConcentrationString('')).toBe(false);
    });
  });

  describe('calculateConcentrationRatio - Ratio calculations', () => {
    it('should calculate 250 mg / 5 mL = 50 mg/mL', () => {
      const conc = calculateConcentrationRatio({
        value: 250,
        unit: 'MG',
        perValue: 5,
        perUnit: 'ML',
        rawString: '250 MG/5 ML',
      });
      expect(conc.ratio).toBe(50);
    });

    it('should calculate 100 mg / 1 mL = 100 mg/mL', () => {
      const conc = calculateConcentrationRatio({
        value: 100,
        unit: 'MG',
        perValue: 1,
        perUnit: 'ML',
        rawString: '100 MG/1 ML',
      });
      expect(conc.ratio).toBe(100);
    });

    it('should calculate 1000 mg / 5 mL = 200 mg/mL', () => {
      const conc = calculateConcentrationRatio({
        value: 1000,
        unit: 'MG',
        perValue: 5,
        perUnit: 'ML',
        rawString: '1000 MG/5 ML',
      });
      expect(conc.ratio).toBe(200);
    });

    it('should calculate 600 mg / 5 mL = 120 mg/mL', () => {
      const conc = calculateConcentrationRatio({
        value: 600,
        unit: 'MG',
        perValue: 5,
        perUnit: 'ML',
        rawString: '600 MG/5 ML',
      });
      expect(conc.ratio).toBe(120);
    });

    it('should calculate 125 mg / 5 mL = 25 mg/mL', () => {
      const conc = calculateConcentrationRatio({
        value: 125,
        unit: 'MG',
        perValue: 5,
        perUnit: 'ML',
        rawString: '125 MG/5 ML',
      });
      expect(conc.ratio).toBe(25);
    });
  });

  describe('normalizeConcentrationUnits', () => {
    it('should convert grams to milligrams', () => {
      const normalized = normalizeConcentrationUnits({
        value: 1,
        unit: 'G',
        perValue: 5,
        perUnit: 'ML',
        rawString: '1 G/5 ML',
      });
      expect(normalized.value).toBe(1000);
      expect(normalized.unit).toBe('MG');
    });

    it('should convert liters to milliliters', () => {
      const normalized = normalizeConcentrationUnits({
        value: 250,
        unit: 'MG',
        perValue: 1,
        perUnit: 'L',
        rawString: '250 MG/1 L',
      });
      expect(normalized.perValue).toBe(1000);
      expect(normalized.perUnit).toBe('ML');
    });

    it('should handle "GM" unit variation', () => {
      const normalized = normalizeConcentrationUnits({
        value: 2,
        unit: 'GM',
        perValue: 10,
        perUnit: 'ML',
        rawString: '2 GM/10 ML',
      });
      expect(normalized.value).toBe(2000);
      expect(normalized.unit).toBe('MG');
    });

    it('should preserve already normalized units', () => {
      const normalized = normalizeConcentrationUnits({
        value: 250,
        unit: 'MG',
        perValue: 5,
        perUnit: 'ML',
        rawString: '250 MG/5 ML',
      });
      expect(normalized.value).toBe(250);
      expect(normalized.unit).toBe('MG');
      expect(normalized.perValue).toBe(5);
      expect(normalized.perUnit).toBe('ML');
    });
  });

  describe('detectConcentrationFormat', () => {
    it('should detect "mg/ml" format', () => {
      expect(detectConcentrationFormat('250 MG/5 ML')).toBe('mg/ml');
    });

    it('should detect "g/ml" format', () => {
      expect(detectConcentrationFormat('1 G/5 ML')).toBe('g/ml');
    });

    it('should detect "units/ml" format for insulin', () => {
      expect(detectConcentrationFormat('U-100')).toBe('units/ml');
    });

    it('should return "unknown" for invalid format', () => {
      expect(detectConcentrationFormat('TABLET')).toBe('unknown');
    });
  });

  describe('Integration tests - Real-world examples', () => {
    it('should parse amoxicillin suspension (250 MG/5 ML)', () => {
      const result = parseConcentration('250 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.ratio).toBe(50);
      expect(result.format).toBe('mg/ml');
    });

    it('should parse azithromycin suspension (100 MG/1 ML)', () => {
      const result = parseConcentration('100 MG/1 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.ratio).toBe(100);
    });

    it('should parse augmentin suspension (600 MG/5 ML)', () => {
      const result = parseConcentration('600 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.ratio).toBe(120);
    });

    it('should parse insulin U-100', () => {
      const result = parseConcentration('U-100');
      expect(result.success).toBe(true);
      expect(result.concentration?.unit).toBe('UNITS');
      expect(result.concentration?.ratio).toBe(100);
    });

    it('should parse cephalexin suspension (250 MG/5 ML)', () => {
      const result = parseConcentration('250 MG/5 ML');
      expect(result.success).toBe(true);
      expect(result.concentration?.ratio).toBe(50);
    });
  });
});

