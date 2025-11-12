import { describe, it, expect } from 'vitest';
import {
  parsePackageSize,
  normalizeUnit,
  normalizeNDC,
  normalizeDosageForm,
  parseFDADate,
  extractRxCUI,
  filterByDosageForm,
  filterActivePackages,
  sortByPackageSize,
  mapFDAResultToNDCPackage,
} from '../src/internal/fdaMapper';
import type { FDANDCResult, NDCPackage } from '../src/internal/fdaTypes';

describe('fdaMapper - parsePackageSize', () => {
  it('should parse "100 TABLET in 1 BOTTLE" format', () => {
    const result = parsePackageSize('100 TABLET in 1 BOTTLE');
    expect(result.quantity).toBe(100);
    expect(result.unit).toBe('TABLET');
    expect(result.description).toBe('100 TABLET in 1 BOTTLE');
  });

  it('should parse "30 mL in 1 BOTTLE" format', () => {
    const result = parsePackageSize('30 mL in 1 BOTTLE');
    expect(result.quantity).toBe(30);
    expect(result.unit).toBe('ML');
  });

  it('should parse "1 KIT" format', () => {
    const result = parsePackageSize('1 KIT');
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe('KIT');
  });

  it('should parse "2.5 mL in 1 VIAL" format (decimal quantities)', () => {
    const result = parsePackageSize('2.5 mL in 1 VIAL');
    expect(result.quantity).toBe(2.5);
    expect(result.unit).toBe('ML');
  });

  it('should handle lowercase input', () => {
    const result = parsePackageSize('100 tablet in 1 bottle');
    expect(result.quantity).toBe(100);
    expect(result.unit).toBe('TABLET');
  });

  it('should handle "100 CAPSULE" format without container', () => {
    const result = parsePackageSize('100 CAPSULE');
    expect(result.quantity).toBe(100);
    expect(result.unit).toBe('CAPSULE');
  });

  it('should return UNKNOWN for unparseable descriptions', () => {
    const result = parsePackageSize('Invalid format');
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe('UNKNOWN');
  });

  it('should handle "500 MILLIGRAM" format', () => {
    const result = parsePackageSize('500 MILLIGRAM in 1 BOTTLE');
    expect(result.quantity).toBe(500);
    expect(result.unit).toBe('MG');
  });
});

describe('fdaMapper - normalizeUnit', () => {
  it('should normalize "TABLETS" to "TABLET"', () => {
    expect(normalizeUnit('TABLETS')).toBe('TABLET');
  });

  it('should normalize "CAPSULES" to "CAPSULE"', () => {
    expect(normalizeUnit('CAPSULES')).toBe('CAPSULE');
  });

  it('should normalize "MILLILITER" to "ML"', () => {
    expect(normalizeUnit('MILLILITER')).toBe('ML');
  });

  it('should normalize "MILLIGRAM" to "MG"', () => {
    expect(normalizeUnit('MILLIGRAM')).toBe('MG');
  });

  it('should handle lowercase input', () => {
    expect(normalizeUnit('tablet')).toBe('TABLET');
    expect(normalizeUnit('ml')).toBe('ML');
  });

  it('should return unknown units unchanged', () => {
    expect(normalizeUnit('CUSTOMUNIT')).toBe('CUSTOMUNIT');
  });

  it('should normalize "SYRINGES" to "SYRINGE"', () => {
    expect(normalizeUnit('SYRINGES')).toBe('SYRINGE');
  });
});

describe('fdaMapper - normalizeNDC', () => {
  it('should normalize 11-digit NDC without dashes', () => {
    const result = normalizeNDC('00071015623');
    expect(result).toBe('00071-0156-23');
  });

  it('should preserve already formatted NDC', () => {
    const result = normalizeNDC('00071-0156-23');
    expect(result).toBe('00071-0156-23');
  });

  it('should pad 10-digit NDC with leading zero', () => {
    const result = normalizeNDC('0071015623');
    expect(result).toBe('00071-0156-23');
  });

  it('should handle NDC with various separators', () => {
    const result = normalizeNDC('00071 0156 23');
    expect(result).toBe('00071-0156-23');
  });

  it('should format NDC from digits only', () => {
    const result = normalizeNDC('12345678901');
    expect(result).toBe('12345-6789-01');
  });
});

describe('fdaMapper - normalizeDosageForm', () => {
  it('should uppercase and trim dosage forms', () => {
    expect(normalizeDosageForm('tablet')).toBe('TABLET');
    expect(normalizeDosageForm('  capsule  ')).toBe('CAPSULE');
    expect(normalizeDosageForm('Solution')).toBe('SOLUTION');
  });
});

describe('fdaMapper - parseFDADate', () => {
  it('should parse FDA date format YYYYMMDD', () => {
    const result = parseFDADate('20230115');
    expect(result).toBe('2023-01-15');
  });

  it('should return undefined for invalid dates', () => {
    expect(parseFDADate('')).toBeUndefined();
    expect(parseFDADate('invalid')).toBeUndefined();
    expect(parseFDADate(undefined)).toBeUndefined();
  });

  it('should handle various FDA dates', () => {
    expect(parseFDADate('20201231')).toBe('2020-12-31');
    expect(parseFDADate('19991201')).toBe('1999-12-01');
  });
});

describe('fdaMapper - extractRxCUI', () => {
  it('should extract first RxCUI from openfda metadata', () => {
    const openfda = {
      rxcui: ['104377', '104378'],
    };
    expect(extractRxCUI(openfda)).toBe('104377');
  });

  it('should return undefined if no RxCUI', () => {
    expect(extractRxCUI({})).toBeUndefined();
    expect(extractRxCUI({ rxcui: [] })).toBeUndefined();
    expect(extractRxCUI(undefined)).toBeUndefined();
  });
});

describe('fdaMapper - filterByDosageForm', () => {
  const packages: NDCPackage[] = [
    {
      ndc: '00071-0156-23',
      productNdc: '00071-0156',
      genericName: 'LISINOPRIL',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      packageSize: { quantity: 100, unit: 'TABLET', description: '100 TABLET in 1 BOTTLE' },
      activeIngredients: [],
      marketingStatus: { isActive: true, status: 'active' },
      labeler: 'Test Pharma',
    },
    {
      ndc: '00071-0157-23',
      productNdc: '00071-0157',
      genericName: 'LISINOPRIL',
      dosageForm: 'CAPSULE',
      route: ['ORAL'],
      packageSize: { quantity: 100, unit: 'CAPSULE', description: '100 CAPSULE in 1 BOTTLE' },
      activeIngredients: [],
      marketingStatus: { isActive: true, status: 'active' },
      labeler: 'Test Pharma',
    },
  ];

  it('should filter packages by dosage form', () => {
    const tablets = filterByDosageForm(packages, 'TABLET');
    expect(tablets).toHaveLength(1);
    expect(tablets[0].dosageForm).toBe('TABLET');
  });

  it('should handle case-insensitive filtering', () => {
    const capsules = filterByDosageForm(packages, 'capsule');
    expect(capsules).toHaveLength(1);
    expect(capsules[0].dosageForm).toBe('CAPSULE');
  });
});

describe('fdaMapper - filterActivePackages', () => {
  const packages: NDCPackage[] = [
    {
      ndc: '00071-0156-23',
      productNdc: '00071-0156',
      genericName: 'LISINOPRIL',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      packageSize: { quantity: 100, unit: 'TABLET', description: '100 TABLET in 1 BOTTLE' },
      activeIngredients: [],
      marketingStatus: { isActive: true, status: 'active' },
      labeler: 'Test Pharma',
    },
    {
      ndc: '00071-0157-23',
      productNdc: '00071-0157',
      genericName: 'OLD DRUG',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      packageSize: { quantity: 100, unit: 'TABLET', description: '100 TABLET in 1 BOTTLE' },
      activeIngredients: [],
      marketingStatus: { isActive: false, status: 'discontinued' },
      labeler: 'Test Pharma',
    },
  ];

  it('should filter only active packages', () => {
    const active = filterActivePackages(packages);
    expect(active).toHaveLength(1);
    expect(active[0].marketingStatus.isActive).toBe(true);
  });
});

describe('fdaMapper - sortByPackageSize', () => {
  const packages: NDCPackage[] = [
    {
      ndc: '00071-0156-23',
      productNdc: '00071-0156',
      genericName: 'LISINOPRIL',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      packageSize: { quantity: 100, unit: 'TABLET', description: '100 TABLET in 1 BOTTLE' },
      activeIngredients: [],
      marketingStatus: { isActive: true, status: 'active' },
      labeler: 'Test Pharma',
    },
    {
      ndc: '00071-0157-23',
      productNdc: '00071-0157',
      genericName: 'LISINOPRIL',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      packageSize: { quantity: 30, unit: 'TABLET', description: '30 TABLET in 1 BOTTLE' },
      activeIngredients: [],
      marketingStatus: { isActive: true, status: 'active' },
      labeler: 'Test Pharma',
    },
    {
      ndc: '00071-0158-23',
      productNdc: '00071-0158',
      genericName: 'LISINOPRIL',
      dosageForm: 'TABLET',
      route: ['ORAL'],
      packageSize: { quantity: 60, unit: 'TABLET', description: '60 TABLET in 1 BOTTLE' },
      activeIngredients: [],
      marketingStatus: { isActive: true, status: 'active' },
      labeler: 'Test Pharma',
    },
  ];

  it('should sort packages by quantity ascending', () => {
    const sorted = sortByPackageSize(packages);
    expect(sorted[0].packageSize.quantity).toBe(30);
    expect(sorted[1].packageSize.quantity).toBe(60);
    expect(sorted[2].packageSize.quantity).toBe(100);
  });

  it('should not mutate original array', () => {
    const original = [...packages];
    sortByPackageSize(packages);
    expect(packages[0].packageSize.quantity).toBe(100); // Original order
  });
});

describe('fdaMapper - mapFDAResultToNDCPackage', () => {
  const mockFDAResult: FDANDCResult = {
    product_ndc: '00071-0156',
    generic_name: 'LISINOPRIL',
    brand_name: 'ZESTRIL',
    dosage_form: 'TABLET',
    route: ['ORAL'],
    product_type: 'HUMAN PRESCRIPTION DRUG',
    active_ingredients: [
      { name: 'LISINOPRIL', strength: '10 mg/1' },
    ],
    packaging: [
      {
        package_ndc: '00071-0156-23',
        description: '100 TABLET in 1 BOTTLE',
        marketing_start_date: '20230101',
      },
      {
        package_ndc: '00071-0156-30',
        description: '30 TABLET in 1 BOTTLE',
        marketing_start_date: '20230101',
      },
    ],
    labeler_name: 'AstraZeneca Pharmaceuticals LP',
    openfda: {
      rxcui: ['104377'],
    },
  };

  it('should map FDA result to multiple NDC packages', () => {
    const packages = mapFDAResultToNDCPackage(mockFDAResult);
    expect(packages).toHaveLength(2);
  });

  it('should correctly map package details', () => {
    const packages = mapFDAResultToNDCPackage(mockFDAResult);
    const pkg = packages[0];

    expect(pkg.ndc).toBe('00071-0156-23');
    expect(pkg.productNdc).toBe('00071-0156');
    expect(pkg.genericName).toBe('LISINOPRIL');
    expect(pkg.brandName).toBe('ZESTRIL');
    expect(pkg.dosageForm).toBe('TABLET');
    expect(pkg.route).toEqual(['ORAL']);
    expect(pkg.labeler).toBe('AstraZeneca Pharmaceuticals LP');
    expect(pkg.rxcui).toBe('104377');
  });

  it('should parse package size correctly', () => {
    const packages = mapFDAResultToNDCPackage(mockFDAResult);
    expect(packages[0].packageSize.quantity).toBe(100);
    expect(packages[0].packageSize.unit).toBe('TABLET');
  });

  it('should map active ingredients', () => {
    const packages = mapFDAResultToNDCPackage(mockFDAResult);
    expect(packages[0].activeIngredients).toHaveLength(1);
    expect(packages[0].activeIngredients[0].name).toBe('LISINOPRIL');
    expect(packages[0].activeIngredients[0].strength).toBe('10 mg/1');
  });

  it('should set marketing status to active', () => {
    const packages = mapFDAResultToNDCPackage(mockFDAResult);
    expect(packages[0].marketingStatus.isActive).toBe(true);
    expect(packages[0].marketingStatus.status).toBe('active');
  });
});

