import { describe, it, expect } from 'vitest';
import {
  matchPackagesToQuantity,
  calculateOverfill,
  calculateUnderfill,
} from '../src/packageMatch';
import type { Package } from '../src/types';

describe('packageMatch - matchPackagesToQuantity', () => {
  const createPackage = (ndc: string, size: number, isActive = true): Package => ({
    ndc,
    packageSize: size,
    unit: 'TABLET',
    dosageForm: 'TABLET',
    isActive,
  });

  describe('exact matches', () => {
    it('should find exact match for 30 tablets', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 100),
        createPackage('00071-0156-24', 30),
        createPackage('00071-0156-25', 60),
      ];

      const result = matchPackagesToQuantity(30, packages);

      expect(result.recommendedPackages).toHaveLength(1);
      expect(result.recommendedPackages[0].packageSize).toBe(30);
      expect(result.totalQuantity).toBe(30);
      expect(result.overfillPercentage).toBe(0);
      expect(result.underfillPercentage).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should find exact match for 100 tablets', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 100),
        createPackage('00071-0156-24', 30),
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(100);
      expect(result.overfillPercentage).toBe(0);
    });

    it('should prefer exact match over larger packages', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 60),
        createPackage('00071-0156-24', 30),
        createPackage('00071-0156-25', 90),
      ];

      const result = matchPackagesToQuantity(30, packages);

      expect(result.recommendedPackages[0].ndc).toBe('00071-0156-24');
      expect(result.totalQuantity).toBe(30);
    });
  });

  describe('≤5% overfill matches', () => {
    it('should accept package with 3% overfill', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 31), // 3.3% overfill
      ];

      const result = matchPackagesToQuantity(30, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(31);
      expect(result.overfillPercentage).toBeCloseTo(3.33, 1);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept package with exactly 5% overfill', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 105), // 5% overfill
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(105);
      expect(result.overfillPercentage).toBe(5);
      expect(result.warnings).toHaveLength(0);
    });

    it('should prefer smallest package within 5% overfill', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 105), // 5% overfill
        createPackage('00071-0156-24', 103), // 3% overfill
        createPackage('00071-0156-25', 101), // 1% overfill
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(101);
      expect(result.overfillPercentage).toBe(1);
    });
  });

  describe('best single package', () => {
    it('should select smallest package that meets requirement', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 120), // 20% overfill
        createPackage('00071-0156-24', 110), // 10% overfill
        createPackage('00071-0156-25', 90),  // Too small
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(110);
      expect(result.overfillPercentage).toBe(10);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when overfill exceeds 10%', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 150), // 50% overfill
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.overfillPercentage).toBe(50);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Overfill exceeds 10%');
      expect(result.warnings[0]).toContain('50');
    });

    it('should not warn when overfill is exactly 10%', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 110), // 10% overfill
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.overfillPercentage).toBe(10);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when overfill is 10.1%', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 111), // 11% overfill
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.overfillPercentage).toBe(11);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('no suitable package', () => {
    it('should return empty when all packages too small', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 30),
        createPackage('00071-0156-24', 60),
        createPackage('00071-0156-25', 90),
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages).toHaveLength(0);
      expect(result.totalQuantity).toBe(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('No suitable package found');
    });

    it('should mention multi-package combinations in warning', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 50),
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.warnings[0]).toContain('Multi-package combinations not yet implemented');
    });
  });

  describe('active package filtering', () => {
    it('should filter out inactive packages', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 30, false), // Inactive
        createPackage('00071-0156-24', 60, true),  // Active
      ];

      const result = matchPackagesToQuantity(30, packages);

      // Should use 60-size package since 30-size is inactive
      expect(result.recommendedPackages[0].packageSize).toBe(60);
    });

    it('should warn when no active packages available', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 30, false),
        createPackage('00071-0156-24', 60, false),
      ];

      const result = matchPackagesToQuantity(30, packages);

      expect(result.recommendedPackages).toHaveLength(0);
      expect(result.warnings).toContain('No active packages available');
    });

    it('should work when all packages are active', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 30, true),
        createPackage('00071-0156-24', 60, true),
      ];

      const result = matchPackagesToQuantity(30, packages);

      expect(result.recommendedPackages).toHaveLength(1);
      expect(result.recommendedPackages[0].isActive).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should throw error for zero quantity', () => {
      const packages: Package[] = [createPackage('00071-0156-23', 30)];

      expect(() => matchPackagesToQuantity(0, packages)).toThrow(
        'Required quantity must be positive'
      );
    });

    it('should throw error for negative quantity', () => {
      const packages: Package[] = [createPackage('00071-0156-23', 30)];

      expect(() => matchPackagesToQuantity(-30, packages)).toThrow(
        'Required quantity must be positive'
      );
    });

    it('should throw error for empty package array', () => {
      expect(() => matchPackagesToQuantity(30, [])).toThrow(
        'No packages available'
      );
    });

    it('should handle fractional required quantity', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 31),
      ];

      const result = matchPackagesToQuantity(30.5, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(31);
    });

    it('should handle very large package sizes', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 1000),
      ];

      const result = matchPackagesToQuantity(30, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(1000);
      expect(result.overfillPercentage).toBeGreaterThan(10);
    });

    it('should sort packages correctly', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 100),
        createPackage('00071-0156-24', 30),
        createPackage('00071-0156-25', 60),
      ];

      const result = matchPackagesToQuantity(30, packages);

      // Should find the 30-size package even though it's in the middle
      expect(result.recommendedPackages[0].packageSize).toBe(30);
    });
  });

  describe('package selection algorithm', () => {
    it('should prioritize exact match over 5% overfill', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 105), // 5% overfill
        createPackage('00071-0156-24', 100), // Exact
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(100);
      expect(result.overfillPercentage).toBe(0);
    });

    it('should prioritize 5% overfill over larger overfill', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 120), // 20% overfill
        createPackage('00071-0156-24', 104), // 4% overfill
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(104);
      expect(result.overfillPercentage).toBe(4);
    });

    it('should select minimum overfill when all exceed 5%', () => {
      const packages: Package[] = [
        createPackage('00071-0156-23', 150), // 50% overfill
        createPackage('00071-0156-24', 120), // 20% overfill
        createPackage('00071-0156-25', 110), // 10% overfill
      ];

      const result = matchPackagesToQuantity(100, packages);

      expect(result.recommendedPackages[0].packageSize).toBe(110);
      expect(result.overfillPercentage).toBe(10);
    });
  });
});

describe('packageMatch - calculateOverfill', () => {
  it('should calculate overfill percentage correctly', () => {
    const result = calculateOverfill(110, 100);
    expect(result).toBe(10);
  });

  it('should return 0 for exact match', () => {
    const result = calculateOverfill(100, 100);
    expect(result).toBe(0);
  });

  it('should return 0 when dispensed less than required', () => {
    const result = calculateOverfill(90, 100);
    expect(result).toBe(0);
  });

  it('should calculate large overfill', () => {
    const result = calculateOverfill(200, 100);
    expect(result).toBe(100);
  });

  it('should calculate small overfill', () => {
    const result = calculateOverfill(101, 100);
    expect(result).toBe(1);
  });

  it('should handle fractional overfill', () => {
    const result = calculateOverfill(105.5, 100);
    expect(result).toBe(5.5);
  });

  it('should throw error for zero required quantity', () => {
    expect(() => calculateOverfill(100, 0)).toThrow(
      'Required quantity must be positive'
    );
  });

  it('should throw error for negative required quantity', () => {
    expect(() => calculateOverfill(100, -50)).toThrow(
      'Required quantity must be positive'
    );
  });

  it('should handle decimal quantities', () => {
    const result = calculateOverfill(31.5, 30);
    expect(result).toBe(5);
  });
});

describe('packageMatch - calculateUnderfill', () => {
  it('should calculate underfill percentage correctly', () => {
    const result = calculateUnderfill(90, 100);
    expect(result).toBe(10);
  });

  it('should return 0 for exact match', () => {
    const result = calculateUnderfill(100, 100);
    expect(result).toBe(0);
  });

  it('should return 0 when dispensed more than required', () => {
    const result = calculateUnderfill(110, 100);
    expect(result).toBe(0);
  });

  it('should calculate large underfill', () => {
    const result = calculateUnderfill(50, 100);
    expect(result).toBe(50);
  });

  it('should calculate small underfill', () => {
    const result = calculateUnderfill(99, 100);
    expect(result).toBe(1);
  });

  it('should handle fractional underfill', () => {
    const result = calculateUnderfill(94.5, 100);
    expect(result).toBe(5.5);
  });

  it('should throw error for zero required quantity', () => {
    expect(() => calculateUnderfill(50, 0)).toThrow(
      'Required quantity must be positive'
    );
  });

  it('should throw error for negative required quantity', () => {
    expect(() => calculateUnderfill(50, -100)).toThrow(
      'Required quantity must be positive'
    );
  });

  it('should handle decimal quantities', () => {
    const result = calculateUnderfill(28.5, 30);
    expect(result).toBe(5);
  });

  it('should calculate for very small underfill', () => {
    const result = calculateUnderfill(99.9, 100);
    expect(result).toBeCloseTo(0.1, 1);
  });
});

