import { describe, it, expect } from 'vitest';
import {
  calculateTotalQuantity,
  parseStructuredSIG,
} from '../src/quantity';

describe('quantity - calculateTotalQuantity', () => {
  it('should calculate total quantity for simple prescription', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 1,
      frequencyPerDay: 2,
      daysSupply: 30,
    });
    expect(result).toBe(60);
  });

  it('should calculate for twice daily dosing', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 2,
      frequencyPerDay: 2,
      daysSupply: 30,
    });
    expect(result).toBe(120);
  });

  it('should calculate for three times daily', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 1,
      frequencyPerDay: 3,
      daysSupply: 30,
    });
    expect(result).toBe(90);
  });

  it('should calculate for 90-day supply', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 1,
      frequencyPerDay: 1,
      daysSupply: 90,
    });
    expect(result).toBe(90);
  });

  it('should round up fractional doses', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 1.5,
      frequencyPerDay: 2,
      daysSupply: 30,
    });
    expect(result).toBe(90); // 1.5 * 2 * 30 = 90
  });

  it('should round up fractional result', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 2.5,
      frequencyPerDay: 1,
      daysSupply: 30,
    });
    expect(result).toBe(75); // 2.5 * 1 * 30 = 75
  });

  it('should handle decimal doses correctly', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 0.5,
      frequencyPerDay: 2,
      daysSupply: 30,
    });
    expect(result).toBe(30); // 0.5 * 2 * 30 = 30
  });

  it('should calculate for single dose daily', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 1,
      frequencyPerDay: 1,
      daysSupply: 7,
    });
    expect(result).toBe(7);
  });

  it('should calculate for four times daily', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 1,
      frequencyPerDay: 4,
      daysSupply: 10,
    });
    expect(result).toBe(40);
  });

  it('should throw error for zero dose', () => {
    expect(() =>
      calculateTotalQuantity({
        dosePerAdministration: 0,
        frequencyPerDay: 2,
        daysSupply: 30,
      })
    ).toThrow('All prescription values must be positive numbers');
  });

  it('should throw error for negative dose', () => {
    expect(() =>
      calculateTotalQuantity({
        dosePerAdministration: -1,
        frequencyPerDay: 2,
        daysSupply: 30,
      })
    ).toThrow('All prescription values must be positive numbers');
  });

  it('should throw error for zero frequency', () => {
    expect(() =>
      calculateTotalQuantity({
        dosePerAdministration: 1,
        frequencyPerDay: 0,
        daysSupply: 30,
      })
    ).toThrow('All prescription values must be positive numbers');
  });

  it('should throw error for negative frequency', () => {
    expect(() =>
      calculateTotalQuantity({
        dosePerAdministration: 1,
        frequencyPerDay: -2,
        daysSupply: 30,
      })
    ).toThrow('All prescription values must be positive numbers');
  });

  it('should throw error for zero days supply', () => {
    expect(() =>
      calculateTotalQuantity({
        dosePerAdministration: 1,
        frequencyPerDay: 2,
        daysSupply: 0,
      })
    ).toThrow('All prescription values must be positive numbers');
  });

  it('should throw error for negative days supply', () => {
    expect(() =>
      calculateTotalQuantity({
        dosePerAdministration: 1,
        frequencyPerDay: 2,
        daysSupply: -30,
      })
    ).toThrow('All prescription values must be positive numbers');
  });

  it('should throw error for days supply exceeding 365', () => {
    expect(() =>
      calculateTotalQuantity({
        dosePerAdministration: 1,
        frequencyPerDay: 2,
        daysSupply: 366,
      })
    ).toThrow('Days\' supply cannot exceed 365 days');
  });

  it('should allow exactly 365 days supply', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 1,
      frequencyPerDay: 1,
      daysSupply: 365,
    });
    expect(result).toBe(365);
  });

  it('should handle very small fractional doses', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 0.25,
      frequencyPerDay: 4,
      daysSupply: 30,
    });
    expect(result).toBe(30); // 0.25 * 4 * 30 = 30
  });

  it('should handle large doses', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 10,
      frequencyPerDay: 3,
      daysSupply: 30,
    });
    expect(result).toBe(900);
  });

  it('should calculate for 7-day supply', () => {
    const result = calculateTotalQuantity({
      dosePerAdministration: 2,
      frequencyPerDay: 2,
      daysSupply: 7,
    });
    expect(result).toBe(28);
  });
});

describe('quantity - parseStructuredSIG', () => {
  it('should parse basic structured SIG', () => {
    const result = parseStructuredSIG({
      dose: 1,
      frequency: 2,
      unit: 'tablet',
    });

    expect(result.dosePerAdministration).toBe(1);
    expect(result.frequencyPerDay).toBe(2);
    expect(result.unit).toBe('TABLET');
  });

  it('should uppercase unit', () => {
    const result = parseStructuredSIG({
      dose: 2,
      frequency: 1,
      unit: 'capsule',
    });

    expect(result.unit).toBe('CAPSULE');
  });

  it('should handle mixed case unit', () => {
    const result = parseStructuredSIG({
      dose: 1,
      frequency: 3,
      unit: 'TaBlEt',
    });

    expect(result.unit).toBe('TABLET');
  });

  it('should handle fractional dose', () => {
    const result = parseStructuredSIG({
      dose: 1.5,
      frequency: 2,
      unit: 'tablet',
    });

    expect(result.dosePerAdministration).toBe(1.5);
    expect(result.frequencyPerDay).toBe(2);
  });

  it('should handle decimal frequency', () => {
    const result = parseStructuredSIG({
      dose: 1,
      frequency: 0.5,
      unit: 'tablet',
    });

    expect(result.frequencyPerDay).toBe(0.5);
  });

  it('should parse ml unit', () => {
    const result = parseStructuredSIG({
      dose: 5,
      frequency: 2,
      unit: 'ml',
    });

    expect(result.unit).toBe('ML');
  });

  it('should parse puff unit', () => {
    const result = parseStructuredSIG({
      dose: 2,
      frequency: 4,
      unit: 'puff',
    });

    expect(result.unit).toBe('PUFF');
  });

  it('should handle unit with spaces', () => {
    const result = parseStructuredSIG({
      dose: 1,
      frequency: 1,
      unit: '  tablet  ',
    });

    expect(result.unit).toBe('  TABLET  ');
  });
});

