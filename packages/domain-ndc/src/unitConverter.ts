/**
 * Unit Converter Logic
 * Pure functions for converting between medication units
 * MVP: Tablets and capsules (solids)
 * Future: Liquids, inhalers, insulin
 */

/**
 * Supported medication unit types
 */
export type MedicationUnit =
  | 'TABLET'
  | 'CAPSULE'
  | 'ML'
  | 'L'
  | 'MG'
  | 'GM'
  | 'MCG'
  | 'UNIT' // Insulin units
  | 'PUFF' // Inhaler actuations
  | 'PATCH'
  | 'SUPPOSITORY'
  | 'UNKNOWN';

/**
 * Unit compatibility matrix
 * Defines which units can be converted to each other
 */
const UNIT_COMPATIBILITY: Record<string, string[]> = {
  TABLET: ['TABLET', 'CAPSULE'], // Tablets and capsules are interchangeable for counting
  CAPSULE: ['TABLET', 'CAPSULE'],
  ML: ['ML', 'L'],
  L: ['ML', 'L'],
  MG: ['MG', 'GM', 'MCG'],
  GM: ['MG', 'GM', 'MCG'],
  MCG: ['MG', 'GM', 'MCG'],
  UNIT: ['UNIT'], // Insulin units don't convert
  PUFF: ['PUFF'], // Inhaler puffs don't convert
  PATCH: ['PATCH'],
  SUPPOSITORY: ['SUPPOSITORY'],
};

/**
 * Conversion factors between compatible units
 */
const CONVERSION_FACTORS: Record<string, Record<string, number>> = {
  ML: {
    ML: 1,
    L: 0.001,
  },
  L: {
    L: 1,
    ML: 1000,
  },
  MG: {
    MG: 1,
    GM: 0.001,
    MCG: 1000,
  },
  GM: {
    GM: 1,
    MG: 1000,
    MCG: 1000000,
  },
  MCG: {
    MCG: 1,
    MG: 0.001,
    GM: 0.000001,
  },
};

/**
 * Check if two units are compatible for conversion
 * 
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @returns True if units can be converted
 */
export function areUnitsCompatible(fromUnit: string, toUnit: string): boolean {
  const normalizedFrom = fromUnit.toUpperCase().trim();
  const normalizedTo = toUnit.toUpperCase().trim();

  // Same unit is always compatible
  if (normalizedFrom === normalizedTo) {
    return true;
  }

  // Check compatibility matrix
  const compatibleUnits = UNIT_COMPATIBILITY[normalizedFrom];
  if (!compatibleUnits) {
    return false;
  }

  return compatibleUnits.includes(normalizedTo);
}

/**
 * Convert quantity from one unit to another
 * 
 * @param quantity - Quantity to convert
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @returns Converted quantity
 * @throws Error if units are not compatible
 * 
 * @example
 * ```typescript
 * convertUnit(1000, 'ML', 'L') // Returns 1
 * convertUnit(1, 'GM', 'MG') // Returns 1000
 * convertUnit(30, 'TABLET', 'CAPSULE') // Returns 30
 * ```
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number {
  if (quantity < 0) {
    throw new Error('Quantity must be non-negative');
  }

  const normalizedFrom = fromUnit.toUpperCase().trim();
  const normalizedTo = toUnit.toUpperCase().trim();

  // Same unit - no conversion needed
  if (normalizedFrom === normalizedTo) {
    return quantity;
  }

  // Check if units are compatible
  if (!areUnitsCompatible(normalizedFrom, normalizedTo)) {
    throw new Error(
      `Cannot convert from ${fromUnit} to ${toUnit}: incompatible units`
    );
  }

  // For solid dosage forms (tablets, capsules), quantity stays the same
  if (
    (normalizedFrom === 'TABLET' || normalizedFrom === 'CAPSULE') &&
    (normalizedTo === 'TABLET' || normalizedTo === 'CAPSULE')
  ) {
    return quantity;
  }

  // For units with conversion factors
  const conversionMap = CONVERSION_FACTORS[normalizedFrom];
  if (!conversionMap) {
    throw new Error(
      `No conversion factor available for ${fromUnit} to ${toUnit}`
    );
  }

  const factor = conversionMap[normalizedTo];
  if (factor === undefined) {
    throw new Error(
      `No conversion factor available for ${fromUnit} to ${toUnit}`
    );
  }

  return quantity * factor;
}

/**
 * Normalize unit string to standard format
 * 
 * @param unit - Raw unit string
 * @returns Normalized unit
 * 
 * @example
 * ```typescript
 * normalizeUnit('tablets') // Returns 'TABLET'
 * normalizeUnit('ml') // Returns 'ML'
 * normalizeUnit('  capsule  ') // Returns 'CAPSULE'
 * ```
 */
export function normalizeUnit(unit: string): MedicationUnit {
  const normalized = unit.toUpperCase().trim();

  // Common variations
  const unitMappings: Record<string, MedicationUnit> = {
    TABLET: 'TABLET',
    TABLETS: 'TABLET',
    TAB: 'TABLET',
    TABS: 'TABLET',
    CAPSULE: 'CAPSULE',
    CAPSULES: 'CAPSULE',
    CAP: 'CAPSULE',
    CAPS: 'CAPSULE',
    ML: 'ML',
    MILLILITER: 'ML',
    MILLILITERS: 'ML',
    L: 'L',
    LITER: 'L',
    LITERS: 'L',
    MG: 'MG',
    MILLIGRAM: 'MG',
    MILLIGRAMS: 'MG',
    GM: 'GM',
    G: 'GM',
    GRAM: 'GM',
    GRAMS: 'GM',
    MCG: 'MCG',
    UG: 'MCG',
    MICROGRAM: 'MCG',
    MICROGRAMS: 'MCG',
    UNIT: 'UNIT',
    UNITS: 'UNIT',
    PUFF: 'PUFF',
    PUFFS: 'PUFF',
    ACTUATION: 'PUFF',
    ACTUATIONS: 'PUFF',
    PATCH: 'PATCH',
    PATCHES: 'PATCH',
    SUPPOSITORY: 'SUPPOSITORY',
    SUPPOSITORIES: 'SUPPOSITORY',
    SUPP: 'SUPPOSITORY',
  };

  return unitMappings[normalized] || 'UNKNOWN';
}

/**
 * Get the unit category for grouping purposes
 * 
 * @param unit - Medication unit
 * @returns Unit category
 */
export function getUnitCategory(unit: string): 'solid' | 'liquid' | 'weight' | 'special' | 'unknown' {
  const normalized = normalizeUnit(unit);

  const categories: Record<MedicationUnit, 'solid' | 'liquid' | 'weight' | 'special' | 'unknown'> = {
    TABLET: 'solid',
    CAPSULE: 'solid',
    ML: 'liquid',
    L: 'liquid',
    MG: 'weight',
    GM: 'weight',
    MCG: 'weight',
    UNIT: 'special',
    PUFF: 'special',
    PATCH: 'special',
    SUPPOSITORY: 'special',
    UNKNOWN: 'unknown',
  };

  return categories[normalized];
}

/**
 * Validate if quantity makes sense for given unit
 * 
 * @param quantity - Quantity to validate
 * @param unit - Medication unit
 * @returns True if quantity is reasonable for the unit
 */
export function isReasonableQuantity(quantity: number, unit: string): boolean {
  if (quantity <= 0) {
    return false;
  }

  const normalized = normalizeUnit(unit);
  const category = getUnitCategory(normalized);

  // Reasonable ranges per category
  switch (category) {
    case 'solid':
      // Tablets/capsules: typically 1-500 per prescription
      return quantity >= 1 && quantity <= 1000;
    
    case 'liquid':
      // Liquids: typically 1mL-5000mL (5L) per prescription
      if (normalized === 'L') {
        return quantity >= 0.001 && quantity <= 10;
      }
      return quantity >= 1 && quantity <= 10000;
    
    case 'weight':
      // Weight units can vary widely depending on medication
      return quantity >= 0.001 && quantity <= 100000;
    
    case 'special':
      // Special units: vary by type
      if (normalized === 'PUFF') {
        return quantity >= 1 && quantity <= 500; // Inhaler puffs
      }
      if (normalized === 'UNIT') {
        return quantity >= 1 && quantity <= 10000; // Insulin units
      }
      if (normalized === 'PATCH') {
        return quantity >= 1 && quantity <= 100;
      }
      return quantity >= 1 && quantity <= 500;
    
    default:
      // Unknown units: allow any positive number
      return quantity > 0;
  }
}

/**
 * Format quantity with unit for display
 * 
 * @param quantity - Quantity to format
 * @param unit - Medication unit
 * @returns Formatted string
 * 
 * @example
 * ```typescript
 * formatQuantityWithUnit(30, 'TABLET') // Returns "30 TABLETS"
 * formatQuantityWithUnit(1, 'TABLET') // Returns "1 TABLET"
 * formatQuantityWithUnit(100.5, 'ML') // Returns "100.5 ML"
 * ```
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  const normalized = normalizeUnit(unit);
  
  // Special case for SUPPOSITORY (irregular plural: SUPPOSITORIES)
  if (normalized === 'SUPPOSITORY') {
    return quantity === 1 ? `${quantity} SUPPOSITORY` : `${quantity} SUPPOSITORIES`;
  }
  
  // Special case for PATCH (irregular plural: PATCHES)
  if (normalized === 'PATCH') {
    return quantity === 1 ? `${quantity} PATCH` : `${quantity} PATCHES`;
  }
  
  // Special case for PUFF (irregular plural: PUFFS)
  if (normalized === 'PUFF') {
    return quantity === 1 ? `${quantity} PUFF` : `${quantity} PUFFS`;
  }
  
  // Pluralize other solid units when quantity > 1
  if ((normalized === 'TABLET' || normalized === 'CAPSULE') && quantity !== 1) {
    return `${quantity} ${normalized}S`;
  }
  
  return `${quantity} ${normalized}`;
}

