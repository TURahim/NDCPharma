/**
 * Liquid Calculator Tests
 * Comprehensive test suite for liquid medication calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLiquidQuantity,
  convertMgToML,
  validateLiquidDose,
  generateLiquidFormula,
  validateLiquidVolume,
  isReasonableLiquidVolume,
} from '../src/liquidCalculator';
import type { Concentration } from '../src/types';

// Helper to create concentration objects
function createConcentration(value: number, unit: string, perValue: number, perUnit: string): Concentration {
  return {
    value,
    unit,
    perValue,
    perUnit,
    ratio: value / perValue,
    rawString: `${value} ${unit}/${perValue} ${perUnit}`,
  };
}

describe('liquidCalculator', () => {
  describe('calculateLiquidQuantity - Standard calculations', () => {
    it('should calculate amoxicillin: 400 mg, 3×/day, 7 days, 250 mg/5 mL → 168 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 400,
        frequency: 3,
        daysSupply: 7,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(168);
      expect(result.mLPerDose).toBe(8);
      expect(result.mLPerDay).toBe(24);
      // Has warnings because dose doesn't align perfectly with concentration
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should calculate amoxicillin: 250 mg, 2×/day, 10 days, 250 mg/5 mL → 100 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 250,
        frequency: 2,
        daysSupply: 10,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(100);
      expect(result.mLPerDose).toBe(5);
      expect(result.mLPerDay).toBe(10);
    });

    it('should calculate azithromycin: 200 mg, 1×/day, 5 days, 100 mg/1 mL → 10 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 200,
        frequency: 1,
        daysSupply: 5,
        concentration: createConcentration(100, 'MG', 1, 'ML'),
      });
      
      expect(result.totalML).toBe(10);
      expect(result.mLPerDose).toBe(2);
      expect(result.mLPerDay).toBe(2);
    });

    it('should calculate augmentin: 600 mg, 2×/day, 10 days, 600 mg/5 mL → 100 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 600,
        frequency: 2,
        daysSupply: 10,
        concentration: createConcentration(600, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(100);
      expect(result.mLPerDose).toBe(5);
    });

    it('should calculate cefdinir: 300 mg, 2×/day, 10 days, 250 mg/5 mL → 120 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 300,
        frequency: 2,
        daysSupply: 10,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(120);
      expect(result.mLPerDose).toBe(6);
    });

    it('should calculate clarithromycin: 250 mg, 2×/day, 14 days, 125 mg/5 mL → 280 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 250,
        frequency: 2,
        daysSupply: 14,
        concentration: createConcentration(125, 'MG', 5, 'ML'),
      });
      
      // 250mg / (125mg/5mL ratio = 25mg/mL) = 10mL per dose
      // 10mL × 2 doses/day × 14 days = 280mL (not 560)
      expect(result.totalML).toBe(280);
      expect(result.mLPerDose).toBe(10);
    });

    it('should calculate penicillin: 250 mg, 4×/day, 10 days, 125 mg/5 mL → 400 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 250,
        frequency: 4,
        daysSupply: 10,
        concentration: createConcentration(125, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(400);
      expect(result.mLPerDose).toBe(10);
      expect(result.mLPerDay).toBe(40);
    });

    it('should calculate erythromycin: 400 mg, 3×/day, 7 days, 200 mg/5 mL → 210 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 400,
        frequency: 3,
        daysSupply: 7,
        concentration: createConcentration(200, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(210);
      expect(result.mLPerDose).toBe(10);
    });

    it('should calculate cephalexin: 500 mg, 2×/day, 7 days, 250 mg/5 mL → 140 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 500,
        frequency: 2,
        daysSupply: 7,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(140);
      expect(result.mLPerDose).toBe(10);
    });

    it('should calculate zithromax: 100 mg, 1×/day, 3 days, 100 mg/1 mL → 3 mL', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 100,
        frequency: 1,
        daysSupply: 3,
        concentration: createConcentration(100, 'MG', 1, 'ML'),
      });
      
      expect(result.totalML).toBe(3);
      expect(result.mLPerDose).toBe(1);
    });
  });

  describe('calculateLiquidQuantity - Fractional doses', () => {
    it('should handle 7.5 mL per dose', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 375,
        frequency: 2,
        daysSupply: 10,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDose).toBe(7.5);
      expect(result.totalML).toBe(150);
    });

    it('should handle 2.5 mL per dose', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 125,
        frequency: 2,
        daysSupply: 10,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDose).toBe(2.5);
      expect(result.totalML).toBe(50);
    });

    it('should handle 12.5 mL per dose', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 625,
        frequency: 2,
        daysSupply: 7,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDose).toBe(12.5);
      expect(result.totalML).toBe(175);
    });

    it('should handle 0.5 mL per dose', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 50,
        frequency: 1,
        daysSupply: 5,
        concentration: createConcentration(100, 'MG', 1, 'ML'),
      });
      
      expect(result.mLPerDose).toBe(0.5);
      expect(result.totalML).toBe(2.5);
    });

    it('should handle 15.5 mL per dose', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 775,
        frequency: 2,
        daysSupply: 7,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDose).toBe(15.5);
      expect(result.totalML).toBe(217);
    });
  });

  describe('calculateLiquidQuantity - High-frequency dosing', () => {
    it('should handle QID (4×/day)', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 250,
        frequency: 4,
        daysSupply: 7,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDay).toBe(20);
      expect(result.totalML).toBe(140);
    });

    it('should handle every 6 hours (4×/day)', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 500,
        frequency: 4,
        daysSupply: 5,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDay).toBe(40);
      expect(result.totalML).toBe(200);
    });

    it('should handle every 8 hours (3×/day)', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 400,
        frequency: 3,
        daysSupply: 10,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDay).toBe(24);
      expect(result.totalML).toBe(240);
    });

    it('should handle every 4 hours (6×/day)', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 250,
        frequency: 6,
        daysSupply: 5,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDay).toBe(30);
      expect(result.totalML).toBe(150);
    });

    it('should handle BID (2×/day)', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 400,
        frequency: 2,
        daysSupply: 10,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.mLPerDay).toBe(16);
      expect(result.totalML).toBe(160);
    });
  });

  describe('calculateLiquidQuantity - Long therapy durations', () => {
    it('should handle 30 days supply', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 250,
        frequency: 2,
        daysSupply: 30,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(300);
    });

    it('should handle 60 days supply', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 250,
        frequency: 1,
        daysSupply: 60,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(300);
    });

    it('should handle 90 days supply', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 200,
        frequency: 1,
        daysSupply: 90,
        concentration: createConcentration(100, 'MG', 1, 'ML'),
      });
      
      expect(result.totalML).toBe(180);
    });

    it('should handle 14 days supply', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 400,
        frequency: 2,
        daysSupply: 14,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(224);
    });

    it('should handle 21 days supply', () => {
      const result = calculateLiquidQuantity({
        prescribedDoseMg: 300,
        frequency: 2,
        daysSupply: 21,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      });
      
      expect(result.totalML).toBe(252);
    });
  });

  describe('convertMgToML', () => {
    it('should convert 400 mg with 50 mg/mL ratio to 8 mL', () => {
      const concentration = createConcentration(250, 'MG', 5, 'ML');
      expect(convertMgToML(400, concentration)).toBe(8);
    });

    it('should convert 250 mg with 50 mg/mL ratio to 5 mL', () => {
      const concentration = createConcentration(250, 'MG', 5, 'ML');
      expect(convertMgToML(250, concentration)).toBe(5);
    });

    it('should convert 600 mg with 120 mg/mL ratio to 5 mL', () => {
      const concentration = createConcentration(600, 'MG', 5, 'ML');
      expect(convertMgToML(600, concentration)).toBe(5);
    });

    it('should throw error for zero ratio', () => {
      const concentration = { ...createConcentration(250, 'MG', 5, 'ML'), ratio: 0 };
      expect(() => convertMgToML(400, concentration)).toThrow('Concentration ratio cannot be zero');
    });
  });

  describe('generateLiquidFormula', () => {
    it('should generate standard formula', () => {
      const formula = generateLiquidFormula(8, 3, 7, 168);
      expect(formula).toBe('8 mL/dose × 3 doses/day × 7 days = 168 mL');
    });

    it('should generate BID formula', () => {
      const formula = generateLiquidFormula(5, 2, 10, 100);
      expect(formula).toBe('5 mL/dose × 2 doses/day × 10 days = 100 mL');
    });

    it('should generate QID formula', () => {
      const formula = generateLiquidFormula(10, 4, 5, 200);
      expect(formula).toBe('10 mL/dose × 4 doses/day × 5 days = 200 mL');
    });

    it('should generate single dose formula', () => {
      const formula = generateLiquidFormula(5, 1, 1, 5);
      expect(formula).toBe('5 mL/dose × 1 dose/day × 1 day = 5 mL');
    });

    it('should generate fractional formula', () => {
      const formula = generateLiquidFormula(7.5, 2, 7, 105);
      expect(formula).toBe('7.5 mL/dose × 2 doses/day × 7 days = 105 mL');
    });
  });

  describe('isReasonableLiquidVolume', () => {
    it('should return true for 168 mL', () => {
      expect(isReasonableLiquidVolume(168)).toBe(true);
    });

    it('should return true for 5 mL (minimum)', () => {
      expect(isReasonableLiquidVolume(5)).toBe(true);
    });

    it('should return true for 1000 mL (maximum)', () => {
      expect(isReasonableLiquidVolume(1000)).toBe(true);
    });

    it('should return false for 4 mL (too small)', () => {
      expect(isReasonableLiquidVolume(4)).toBe(false);
    });

    it('should return false for 1001 mL (too large)', () => {
      expect(isReasonableLiquidVolume(1001)).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should throw error for zero dose', () => {
      expect(() => calculateLiquidQuantity({
        prescribedDoseMg: 0,
        frequency: 3,
        daysSupply: 7,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      })).toThrow('Prescribed dose must be greater than zero');
    });

    it('should throw error for zero frequency', () => {
      expect(() => calculateLiquidQuantity({
        prescribedDoseMg: 400,
        frequency: 0,
        daysSupply: 7,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      })).toThrow('Frequency must be greater than zero');
    });

    it('should throw error for zero days supply', () => {
      expect(() => calculateLiquidQuantity({
        prescribedDoseMg: 400,
        frequency: 3,
        daysSupply: 0,
        concentration: createConcentration(250, 'MG', 5, 'ML'),
      })).toThrow('Days supply must be greater than zero');
    });
  });
});

