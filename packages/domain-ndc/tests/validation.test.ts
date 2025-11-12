import { describe, it, expect } from 'vitest';
import {
  validateNDCFormat,
  validateNDCWithStatus,
  normalizeNDC,
  extractProductNDC,
  isValidProductNDC,
  areNDCsEqual,
  isStandardFormat,
  parseNDCSegments,
  validateNDCBatch,
  filterValidNDCs,
} from '../src/validation';
import type { MarketingStatus } from '@clients-openfda/internal/fdaTypes';

describe('validation - validateNDCFormat', () => {
  it('should validate correct 11-digit NDC with dashes', () => {
    const result = validateNDCFormat('00071-0156-23');
    expect(result.isValid).toBe(true);
    expect(result.normalizedNdc).toBe('00071-0156-23');
    expect(result.errors).toHaveLength(0);
  });

  it('should validate 11-digit NDC without dashes', () => {
    const result = validateNDCFormat('00071015623');
    expect(result.isValid).toBe(true);
    expect(result.normalizedNdc).toBe('00071-0156-23');
  });

  it('should validate 10-digit NDC (pads with leading zero)', () => {
    const result = validateNDCFormat('0071015623');
    expect(result.isValid).toBe(true);
    expect(result.normalizedNdc).toBe('00071-0156-23');
  });

  it('should reject empty NDC', () => {
    const result = validateNDCFormat('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('NDC code cannot be empty');
  });

  it('should reject NDC with invalid length', () => {
    const result = validateNDCFormat('123');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject NDC with letters', () => {
    const result = validateNDCFormat('0007A-0156-23');
    expect(result.isValid).toBe(false);
  });

  it('should handle whitespace', () => {
    const result = validateNDCFormat('  00071-0156-23  ');
    expect(result.isValid).toBe(true);
    expect(result.normalizedNdc).toBe('00071-0156-23');
  });

  it('should reject null/undefined NDC', () => {
    const result1 = validateNDCFormat(null as any);
    expect(result1.isValid).toBe(false);

    const result2 = validateNDCFormat(undefined as any);
    expect(result2.isValid).toBe(false);
  });
});

describe('validation - validateNDCWithStatus', () => {
  const activeStatus: MarketingStatus = {
    isActive: true,
    status: 'active',
    startDate: '2023-01-01',
  };

  const discontinuedStatus: MarketingStatus = {
    isActive: false,
    status: 'discontinued',
    endDate: '2023-12-31',
  };

  it('should validate active NDC', () => {
    const result = validateNDCWithStatus('00071-0156-23', activeStatus);
    expect(result.isValid).toBe(true);
    expect(result.isActive).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn about discontinued NDC', () => {
    const result = validateNDCWithStatus('00071-0156-23', discontinuedStatus);
    expect(result.isValid).toBe(true);
    expect(result.isActive).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('discontinued');
  });

  it('should validate without status (format only)', () => {
    const result = validateNDCWithStatus('00071-0156-23');
    expect(result.isValid).toBe(true);
    expect(result.isActive).toBeUndefined();
  });

  it('should fail format validation first', () => {
    const result = validateNDCWithStatus('invalid', activeStatus);
    expect(result.isValid).toBe(false);
  });
});

describe('validation - normalizeNDC', () => {
  it('should normalize 11-digit NDC without dashes', () => {
    expect(normalizeNDC('00071015623')).toBe('00071-0156-23');
  });

  it('should preserve already normalized NDC', () => {
    expect(normalizeNDC('00071-0156-23')).toBe('00071-0156-23');
  });

  it('should pad 10-digit NDC', () => {
    expect(normalizeNDC('0071015623')).toBe('00071-0156-23');
  });

  it('should remove various separators', () => {
    expect(normalizeNDC('00071 0156 23')).toBe('00071-0156-23');
    expect(normalizeNDC('00071/0156/23')).toBe('00071-0156-23');
  });

  it('should throw error for invalid length', () => {
    expect(() => normalizeNDC('123')).toThrow('Invalid NDC length');
    expect(() => normalizeNDC('123456789012')).toThrow('Invalid NDC length');
  });

  it('should throw error for empty NDC', () => {
    expect(() => normalizeNDC('')).toThrow('NDC code is required');
  });

  it('should handle whitespace', () => {
    expect(normalizeNDC('  00071-0156-23  ')).toBe('00071-0156-23');
  });
});

describe('validation - extractProductNDC', () => {
  it('should extract product NDC from package NDC', () => {
    const result = extractProductNDC('00071-0156-23');
    expect(result).toBe('00071-0156');
  });

  it('should handle non-normalized input', () => {
    const result = extractProductNDC('00071015623');
    expect(result).toBe('00071-0156');
  });

  it('should work with various package codes', () => {
    expect(extractProductNDC('12345-6789-01')).toBe('12345-6789');
    expect(extractProductNDC('00000-0000-99')).toBe('00000-0000');
  });
});

describe('validation - isValidProductNDC', () => {
  it('should validate correct product NDC format', () => {
    expect(isValidProductNDC('00071-0156')).toBe(true);
    expect(isValidProductNDC('12345-6789')).toBe(true);
  });

  it('should validate 9-digit product NDC without dashes', () => {
    expect(isValidProductNDC('000710156')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidProductNDC('00071-0156-23')).toBe(false); // Package NDC
    expect(isValidProductNDC('123')).toBe(false); // Too short
    expect(isValidProductNDC('abcd-efgh')).toBe(false); // Contains letters
  });

  it('should handle whitespace', () => {
    expect(isValidProductNDC('  00071-0156  ')).toBe(true);
  });
});

describe('validation - areNDCsEqual', () => {
  it('should return true for identical NDCs', () => {
    expect(areNDCsEqual('00071-0156-23', '00071-0156-23')).toBe(true);
  });

  it('should return true for equivalent NDCs with different formatting', () => {
    expect(areNDCsEqual('00071-0156-23', '00071015623')).toBe(true);
    expect(areNDCsEqual('0071015623', '00071-0156-23')).toBe(true);
  });

  it('should return false for different NDCs', () => {
    expect(areNDCsEqual('00071-0156-23', '00071-0156-24')).toBe(false);
  });

  it('should return false for invalid NDCs', () => {
    expect(areNDCsEqual('invalid', '00071-0156-23')).toBe(false);
    expect(areNDCsEqual('00071-0156-23', 'invalid')).toBe(false);
  });
});

describe('validation - isStandardFormat', () => {
  it('should return true for standard format NDC', () => {
    expect(isStandardFormat('00071-0156-23')).toBe(true);
    expect(isStandardFormat('12345-6789-01')).toBe(true);
  });

  it('should return false for non-standard formats', () => {
    expect(isStandardFormat('00071015623')).toBe(false);
    expect(isStandardFormat('0071-0156-23')).toBe(false); // 4 digits in labeler
    expect(isStandardFormat('00071-156-23')).toBe(false); // 3 digits in product
  });

  it('should handle whitespace', () => {
    expect(isStandardFormat('  00071-0156-23  ')).toBe(true);
  });
});

describe('validation - parseNDCSegments', () => {
  it('should parse NDC into segments', () => {
    const segments = parseNDCSegments('00071-0156-23');
    expect(segments.labeler).toBe('00071');
    expect(segments.product).toBe('0156');
    expect(segments.package).toBe('23');
  });

  it('should parse non-normalized NDC', () => {
    const segments = parseNDCSegments('00071015623');
    expect(segments.labeler).toBe('00071');
    expect(segments.product).toBe('0156');
    expect(segments.package).toBe('23');
  });

  it('should throw error for invalid NDC', () => {
    expect(() => parseNDCSegments('invalid')).toThrow();
  });
});

describe('validation - validateNDCBatch', () => {
  it('should validate multiple NDCs', () => {
    const ndcs = ['00071-0156-23', '12345-6789-01', 'invalid'];
    const results = validateNDCBatch(ndcs);

    expect(results.size).toBe(3);
    expect(results.get('00071-0156-23')?.isValid).toBe(true);
    expect(results.get('12345-6789-01')?.isValid).toBe(true);
    expect(results.get('invalid')?.isValid).toBe(false);
  });

  it('should handle empty array', () => {
    const results = validateNDCBatch([]);
    expect(results.size).toBe(0);
  });

  it('should normalize valid NDCs in results', () => {
    const ndcs = ['00071015623'];
    const results = validateNDCBatch(ndcs);
    const result = results.get('00071015623');

    expect(result?.isValid).toBe(true);
    expect(result?.normalizedNdc).toBe('00071-0156-23');
  });
});

describe('validation - filterValidNDCs', () => {
  it('should filter and return only valid NDCs', () => {
    const ndcs = ['00071-0156-23', 'invalid', '12345-6789-01', '123'];
    const valid = filterValidNDCs(ndcs);

    expect(valid).toHaveLength(2);
    expect(valid).toContain('00071-0156-23');
    expect(valid).toContain('12345-6789-01');
  });

  it('should normalize valid NDCs', () => {
    const ndcs = ['00071015623', '12345678901'];
    const valid = filterValidNDCs(ndcs);

    expect(valid).toHaveLength(2);
    expect(valid[0]).toBe('00071-0156-23');
    expect(valid[1]).toBe('12345-6789-01');
  });

  it('should return empty array for all invalid NDCs', () => {
    const ndcs = ['invalid', '123', 'abc'];
    const valid = filterValidNDCs(ndcs);

    expect(valid).toHaveLength(0);
  });

  it('should handle empty array', () => {
    const valid = filterValidNDCs([]);
    expect(valid).toHaveLength(0);
  });
});

