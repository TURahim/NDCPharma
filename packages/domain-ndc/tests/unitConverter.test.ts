import { describe, it, expect } from 'vitest';
import {
  areUnitsCompatible,
  convertUnit,
  normalizeUnit,
  getUnitCategory,
  isReasonableQuantity,
  formatQuantityWithUnit,
} from '../src/unitConverter';

describe('unitConverter - areUnitsCompatible', () => {
  it('should return true for same units', () => {
    expect(areUnitsCompatible('TABLET', 'TABLET')).toBe(true);
    expect(areUnitsCompatible('ML', 'ML')).toBe(true);
  });

  it('should return true for tablets and capsules', () => {
    expect(areUnitsCompatible('TABLET', 'CAPSULE')).toBe(true);
    expect(areUnitsCompatible('CAPSULE', 'TABLET')).toBe(true);
  });

  it('should return true for liquid units', () => {
    expect(areUnitsCompatible('ML', 'L')).toBe(true);
    expect(areUnitsCompatible('L', 'ML')).toBe(true);
  });

  it('should return true for weight units', () => {
    expect(areUnitsCompatible('MG', 'GM')).toBe(true);
    expect(areUnitsCompatible('GM', 'MG')).toBe(true);
    expect(areUnitsCompatible('MG', 'MCG')).toBe(true);
    expect(areUnitsCompatible('MCG', 'MG')).toBe(true);
    expect(areUnitsCompatible('GM', 'MCG')).toBe(true);
  });

  it('should return false for incompatible units', () => {
    expect(areUnitsCompatible('TABLET', 'ML')).toBe(false);
    expect(areUnitsCompatible('MG', 'ML')).toBe(false);
    expect(areUnitsCompatible('PUFF', 'TABLET')).toBe(false);
  });

  it('should return false for insulin units with others', () => {
    expect(areUnitsCompatible('UNIT', 'TABLET')).toBe(false);
    expect(areUnitsCompatible('UNIT', 'ML')).toBe(false);
  });

  it('should return false for inhaler puffs with others', () => {
    expect(areUnitsCompatible('PUFF', 'TABLET')).toBe(false);
    expect(areUnitsCompatible('PUFF', 'ML')).toBe(false);
  });

  it('should handle case insensitivity', () => {
    expect(areUnitsCompatible('tablet', 'TABLET')).toBe(true);
    expect(areUnitsCompatible('ml', 'ML')).toBe(true);
  });

  it('should handle whitespace', () => {
    expect(areUnitsCompatible('  TABLET  ', 'TABLET')).toBe(true);
  });

  it('should return false for unknown units', () => {
    expect(areUnitsCompatible('UNKNOWN', 'TABLET')).toBe(false);
  });
});

describe('unitConverter - convertUnit', () => {
  describe('same unit conversions', () => {
    it('should return same quantity for same unit', () => {
      expect(convertUnit(30, 'TABLET', 'TABLET')).toBe(30);
      expect(convertUnit(100, 'ML', 'ML')).toBe(100);
    });
  });

  describe('solid unit conversions', () => {
    it('should convert tablets to capsules (count stays same)', () => {
      expect(convertUnit(30, 'TABLET', 'CAPSULE')).toBe(30);
    });

    it('should convert capsules to tablets (count stays same)', () => {
      expect(convertUnit(60, 'CAPSULE', 'TABLET')).toBe(60);
    });
  });

  describe('liquid unit conversions', () => {
    it('should convert ML to L', () => {
      expect(convertUnit(1000, 'ML', 'L')).toBe(1);
      expect(convertUnit(500, 'ML', 'L')).toBe(0.5);
      expect(convertUnit(2500, 'ML', 'L')).toBe(2.5);
    });

    it('should convert L to ML', () => {
      expect(convertUnit(1, 'L', 'ML')).toBe(1000);
      expect(convertUnit(0.5, 'L', 'ML')).toBe(500);
      expect(convertUnit(2.5, 'L', 'ML')).toBe(2500);
    });
  });

  describe('weight unit conversions', () => {
    it('should convert MG to GM', () => {
      expect(convertUnit(1000, 'MG', 'GM')).toBe(1);
      expect(convertUnit(500, 'MG', 'GM')).toBe(0.5);
      expect(convertUnit(2500, 'MG', 'GM')).toBe(2.5);
    });

    it('should convert GM to MG', () => {
      expect(convertUnit(1, 'GM', 'MG')).toBe(1000);
      expect(convertUnit(0.5, 'GM', 'MG')).toBe(500);
      expect(convertUnit(2.5, 'GM', 'MG')).toBe(2500);
    });

    it('should convert MG to MCG', () => {
      expect(convertUnit(1, 'MG', 'MCG')).toBe(1000);
      expect(convertUnit(0.5, 'MG', 'MCG')).toBe(500);
    });

    it('should convert MCG to MG', () => {
      expect(convertUnit(1000, 'MCG', 'MG')).toBe(1);
      expect(convertUnit(500, 'MCG', 'MG')).toBe(0.5);
    });

    it('should convert GM to MCG', () => {
      expect(convertUnit(1, 'GM', 'MCG')).toBe(1000000);
      expect(convertUnit(0.001, 'GM', 'MCG')).toBe(1000);
    });

    it('should convert MCG to GM', () => {
      expect(convertUnit(1000000, 'MCG', 'GM')).toBe(1);
      expect(convertUnit(1000, 'MCG', 'GM')).toBe(0.001);
    });
  });

  describe('error handling', () => {
    it('should throw error for negative quantity', () => {
      expect(() => convertUnit(-10, 'TABLET', 'CAPSULE')).toThrow(
        'Quantity must be non-negative'
      );
    });

    it('should allow zero quantity', () => {
      expect(convertUnit(0, 'TABLET', 'TABLET')).toBe(0);
    });

    it('should throw error for incompatible units', () => {
      expect(() => convertUnit(30, 'TABLET', 'ML')).toThrow(
        'Cannot convert from TABLET to ML: incompatible units'
      );
    });

    it('should throw error for unknown units', () => {
      expect(() => convertUnit(30, 'INVALID', 'TABLET')).toThrow(
        'incompatible units'
      );
    });
  });

  describe('case and whitespace handling', () => {
    it('should handle lowercase units', () => {
      expect(convertUnit(1000, 'ml', 'l')).toBe(1);
      expect(convertUnit(1, 'l', 'ml')).toBe(1000);
    });

    it('should handle mixed case', () => {
      expect(convertUnit(1000, 'Ml', 'L')).toBe(1);
    });

    it('should handle whitespace', () => {
      expect(convertUnit(30, '  TABLET  ', 'CAPSULE')).toBe(30);
    });
  });

  describe('decimal quantities', () => {
    it('should handle decimal tablets', () => {
      expect(convertUnit(30.5, 'TABLET', 'CAPSULE')).toBe(30.5);
    });

    it('should handle decimal liquids', () => {
      expect(convertUnit(100.5, 'ML', 'L')).toBe(0.1005);
    });

    it('should handle decimal weights', () => {
      expect(convertUnit(100.5, 'MG', 'GM')).toBe(0.1005);
    });
  });
});

describe('unitConverter - normalizeUnit', () => {
  describe('tablet variations', () => {
    it('should normalize TABLETS to TABLET', () => {
      expect(normalizeUnit('TABLETS')).toBe('TABLET');
    });

    it('should normalize TAB to TABLET', () => {
      expect(normalizeUnit('TAB')).toBe('TABLET');
    });

    it('should normalize TABS to TABLET', () => {
      expect(normalizeUnit('TABS')).toBe('TABLET');
    });

    it('should keep TABLET as TABLET', () => {
      expect(normalizeUnit('TABLET')).toBe('TABLET');
    });
  });

  describe('capsule variations', () => {
    it('should normalize CAPSULES to CAPSULE', () => {
      expect(normalizeUnit('CAPSULES')).toBe('CAPSULE');
    });

    it('should normalize CAP to CAPSULE', () => {
      expect(normalizeUnit('CAP')).toBe('CAPSULE');
    });

    it('should normalize CAPS to CAPSULE', () => {
      expect(normalizeUnit('CAPS')).toBe('CAPSULE');
    });
  });

  describe('liquid variations', () => {
    it('should normalize MILLILITER to ML', () => {
      expect(normalizeUnit('MILLILITER')).toBe('ML');
    });

    it('should normalize MILLILITERS to ML', () => {
      expect(normalizeUnit('MILLILITERS')).toBe('ML');
    });

    it('should normalize LITER to L', () => {
      expect(normalizeUnit('LITER')).toBe('L');
    });

    it('should normalize LITERS to L', () => {
      expect(normalizeUnit('LITERS')).toBe('L');
    });
  });

  describe('weight variations', () => {
    it('should normalize MILLIGRAM to MG', () => {
      expect(normalizeUnit('MILLIGRAM')).toBe('MG');
    });

    it('should normalize MILLIGRAMS to MG', () => {
      expect(normalizeUnit('MILLIGRAMS')).toBe('MG');
    });

    it('should normalize GRAM to GM', () => {
      expect(normalizeUnit('GRAM')).toBe('GM');
    });

    it('should normalize GRAMS to GM', () => {
      expect(normalizeUnit('GRAMS')).toBe('GM');
    });

    it('should normalize G to GM', () => {
      expect(normalizeUnit('G')).toBe('GM');
    });

    it('should normalize MICROGRAM to MCG', () => {
      expect(normalizeUnit('MICROGRAM')).toBe('MCG');
    });

    it('should normalize MICROGRAMS to MCG', () => {
      expect(normalizeUnit('MICROGRAMS')).toBe('MCG');
    });

    it('should normalize UG to MCG', () => {
      expect(normalizeUnit('UG')).toBe('MCG');
    });
  });

  describe('special units', () => {
    it('should normalize UNITS to UNIT', () => {
      expect(normalizeUnit('UNITS')).toBe('UNIT');
    });

    it('should normalize PUFFS to PUFF', () => {
      expect(normalizeUnit('PUFFS')).toBe('PUFF');
    });

    it('should normalize ACTUATION to PUFF', () => {
      expect(normalizeUnit('ACTUATION')).toBe('PUFF');
    });

    it('should normalize ACTUATIONS to PUFF', () => {
      expect(normalizeUnit('ACTUATIONS')).toBe('PUFF');
    });

    it('should normalize PATCHES to PATCH', () => {
      expect(normalizeUnit('PATCHES')).toBe('PATCH');
    });

    it('should normalize SUPPOSITORIES to SUPPOSITORY', () => {
      expect(normalizeUnit('SUPPOSITORIES')).toBe('SUPPOSITORY');
    });

    it('should normalize SUPP to SUPPOSITORY', () => {
      expect(normalizeUnit('SUPP')).toBe('SUPPOSITORY');
    });
  });

  describe('case and whitespace', () => {
    it('should handle lowercase', () => {
      expect(normalizeUnit('tablet')).toBe('TABLET');
      expect(normalizeUnit('ml')).toBe('ML');
    });

    it('should handle mixed case', () => {
      expect(normalizeUnit('TaBlEt')).toBe('TABLET');
      expect(normalizeUnit('mL')).toBe('ML');
    });

    it('should trim whitespace', () => {
      expect(normalizeUnit('  TABLET  ')).toBe('TABLET');
      expect(normalizeUnit('  ml  ')).toBe('ML');
    });
  });

  describe('unknown units', () => {
    it('should return UNKNOWN for unrecognized units', () => {
      expect(normalizeUnit('INVALID')).toBe('UNKNOWN');
      expect(normalizeUnit('XYZ')).toBe('UNKNOWN');
    });
  });
});

describe('unitConverter - getUnitCategory', () => {
  it('should categorize solids', () => {
    expect(getUnitCategory('TABLET')).toBe('solid');
    expect(getUnitCategory('CAPSULE')).toBe('solid');
  });

  it('should categorize liquids', () => {
    expect(getUnitCategory('ML')).toBe('liquid');
    expect(getUnitCategory('L')).toBe('liquid');
  });

  it('should categorize weights', () => {
    expect(getUnitCategory('MG')).toBe('weight');
    expect(getUnitCategory('GM')).toBe('weight');
    expect(getUnitCategory('MCG')).toBe('weight');
  });

  it('should categorize special units', () => {
    expect(getUnitCategory('UNIT')).toBe('special');
    expect(getUnitCategory('PUFF')).toBe('special');
    expect(getUnitCategory('PATCH')).toBe('special');
    expect(getUnitCategory('SUPPOSITORY')).toBe('special');
  });

  it('should categorize unknown', () => {
    expect(getUnitCategory('INVALID')).toBe('unknown');
  });
});

describe('unitConverter - isReasonableQuantity', () => {
  describe('solid quantities', () => {
    it('should accept reasonable tablet quantities', () => {
      expect(isReasonableQuantity(30, 'TABLET')).toBe(true);
      expect(isReasonableQuantity(60, 'TABLET')).toBe(true);
      expect(isReasonableQuantity(90, 'TABLET')).toBe(true);
      expect(isReasonableQuantity(500, 'TABLET')).toBe(true);
    });

    it('should reject zero or negative', () => {
      expect(isReasonableQuantity(0, 'TABLET')).toBe(false);
      expect(isReasonableQuantity(-10, 'TABLET')).toBe(false);
    });

    it('should reject extremely large quantities', () => {
      expect(isReasonableQuantity(2000, 'TABLET')).toBe(false);
    });

    it('should accept up to 1000 tablets', () => {
      expect(isReasonableQuantity(1000, 'TABLET')).toBe(true);
      expect(isReasonableQuantity(1001, 'TABLET')).toBe(false);
    });
  });

  describe('liquid quantities', () => {
    it('should accept reasonable ML quantities', () => {
      expect(isReasonableQuantity(100, 'ML')).toBe(true);
      expect(isReasonableQuantity(500, 'ML')).toBe(true);
      expect(isReasonableQuantity(1000, 'ML')).toBe(true);
    });

    it('should accept reasonable L quantities', () => {
      expect(isReasonableQuantity(1, 'L')).toBe(true);
      expect(isReasonableQuantity(2.5, 'L')).toBe(true);
    });

    it('should reject very large liquid quantities', () => {
      expect(isReasonableQuantity(20000, 'ML')).toBe(false);
      expect(isReasonableQuantity(20, 'L')).toBe(false);
    });

    it('should accept small ML quantities', () => {
      expect(isReasonableQuantity(1, 'ML')).toBe(true);
      expect(isReasonableQuantity(0.5, 'ML')).toBe(false);
    });
  });

  describe('weight quantities', () => {
    it('should accept wide range for weight units', () => {
      expect(isReasonableQuantity(100, 'MG')).toBe(true);
      expect(isReasonableQuantity(1000, 'MG')).toBe(true);
      expect(isReasonableQuantity(1, 'GM')).toBe(true);
      expect(isReasonableQuantity(500, 'MCG')).toBe(true);
    });

    it('should accept very small weights', () => {
      expect(isReasonableQuantity(0.001, 'MG')).toBe(true);
      expect(isReasonableQuantity(0.01, 'GM')).toBe(true);
    });

    it('should reject extremely large weights', () => {
      expect(isReasonableQuantity(200000, 'MG')).toBe(false);
    });
  });

  describe('special unit quantities', () => {
    it('should accept reasonable puff quantities', () => {
      expect(isReasonableQuantity(60, 'PUFF')).toBe(true);
      expect(isReasonableQuantity(200, 'PUFF')).toBe(true);
    });

    it('should accept reasonable insulin unit quantities', () => {
      expect(isReasonableQuantity(300, 'UNIT')).toBe(true);
      expect(isReasonableQuantity(1000, 'UNIT')).toBe(true);
    });

    it('should accept reasonable patch quantities', () => {
      expect(isReasonableQuantity(10, 'PATCH')).toBe(true);
      expect(isReasonableQuantity(50, 'PATCH')).toBe(true);
    });

    it('should reject excessive puffs', () => {
      expect(isReasonableQuantity(1000, 'PUFF')).toBe(false);
    });

    it('should reject excessive insulin units', () => {
      expect(isReasonableQuantity(20000, 'UNIT')).toBe(false);
    });

    it('should reject excessive patches', () => {
      expect(isReasonableQuantity(200, 'PATCH')).toBe(false);
    });
  });

  describe('unknown units', () => {
    it('should accept any positive quantity for unknown units', () => {
      expect(isReasonableQuantity(1, 'UNKNOWN')).toBe(true);
      expect(isReasonableQuantity(1000000, 'UNKNOWN')).toBe(true);
    });

    it('should reject zero or negative for unknown units', () => {
      expect(isReasonableQuantity(0, 'UNKNOWN')).toBe(false);
      expect(isReasonableQuantity(-10, 'UNKNOWN')).toBe(false);
    });
  });
});

describe('unitConverter - formatQuantityWithUnit', () => {
  describe('solid units', () => {
    it('should format singular tablet', () => {
      expect(formatQuantityWithUnit(1, 'TABLET')).toBe('1 TABLET');
    });

    it('should format plural tablets', () => {
      expect(formatQuantityWithUnit(30, 'TABLET')).toBe('30 TABLETS');
      expect(formatQuantityWithUnit(2, 'TABLET')).toBe('2 TABLETS');
    });

    it('should format singular capsule', () => {
      expect(formatQuantityWithUnit(1, 'CAPSULE')).toBe('1 CAPSULE');
    });

    it('should format plural capsules', () => {
      expect(formatQuantityWithUnit(60, 'CAPSULE')).toBe('60 CAPSULES');
    });

    it('should format patches', () => {
      expect(formatQuantityWithUnit(1, 'PATCH')).toBe('1 PATCH');
      expect(formatQuantityWithUnit(10, 'PATCH')).toBe('10 PATCHES');
    });

    it('should format suppositories', () => {
      expect(formatQuantityWithUnit(1, 'SUPPOSITORY')).toBe('1 SUPPOSITORY');
      expect(formatQuantityWithUnit(12, 'SUPPOSITORY')).toBe('12 SUPPOSITORIES');
    });
  });

  describe('puffs', () => {
    it('should format singular puff', () => {
      expect(formatQuantityWithUnit(1, 'PUFF')).toBe('1 PUFF');
    });

    it('should format plural puffs', () => {
      expect(formatQuantityWithUnit(60, 'PUFF')).toBe('60 PUFFS');
      expect(formatQuantityWithUnit(2, 'PUFF')).toBe('2 PUFFS');
    });
  });

  describe('non-pluralized units', () => {
    it('should not pluralize liquid units', () => {
      expect(formatQuantityWithUnit(100, 'ML')).toBe('100 ML');
      expect(formatQuantityWithUnit(1, 'ML')).toBe('1 ML');
      expect(formatQuantityWithUnit(2, 'L')).toBe('2 L');
    });

    it('should not pluralize weight units', () => {
      expect(formatQuantityWithUnit(500, 'MG')).toBe('500 MG');
      expect(formatQuantityWithUnit(1, 'GM')).toBe('1 GM');
      expect(formatQuantityWithUnit(100, 'MCG')).toBe('100 MCG');
    });

    it('should not pluralize insulin units', () => {
      expect(formatQuantityWithUnit(300, 'UNIT')).toBe('300 UNIT');
      expect(formatQuantityWithUnit(1, 'UNIT')).toBe('1 UNIT');
    });
  });

  describe('decimal quantities', () => {
    it('should format decimal tablets', () => {
      expect(formatQuantityWithUnit(30.5, 'TABLET')).toBe('30.5 TABLETS');
    });

    it('should format decimal liquids', () => {
      expect(formatQuantityWithUnit(100.5, 'ML')).toBe('100.5 ML');
      expect(formatQuantityWithUnit(1.5, 'L')).toBe('1.5 L');
    });
  });

  describe('case handling', () => {
    it('should handle lowercase units', () => {
      expect(formatQuantityWithUnit(30, 'tablet')).toBe('30 TABLETS');
      expect(formatQuantityWithUnit(100, 'ml')).toBe('100 ML');
    });
  });
});

