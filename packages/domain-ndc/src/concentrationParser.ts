/**
 * Concentration Parser
 * Parses concentration strings from medication data
 * Examples: "250 MG/5 ML", "1 G/5 ML", "U-100"
 */

import type { Concentration, ConcentrationFormat, ConcentrationParseResult } from './types';

/**
 * Parse concentration string to structured data
 * 
 * @param input - Concentration string (e.g., "250 MG/5 ML", "U-100")
 * @returns Parse result with concentration data or null if not parseable
 * 
 * @example
 * ```typescript
 * parseConcentration("250 MG/5 ML")
 * // Returns: { success: true, concentration: { value: 250, unit: "MG", perValue: 5, perUnit: "ML", ratio: 50, rawString: "250 MG/5 ML" }, format: "mg/ml", warnings: [] }
 * 
 * parseConcentration("U-100")
 * // Returns: { success: true, concentration: { value: 100, unit: "UNITS", perValue: 1, perUnit: "ML", ratio: 100, rawString: "U-100" }, format: "units/ml", warnings: [] }
 * 
 * parseConcentration("TABLET")
 * // Returns: { success: false, concentration: null, format: "unknown", warnings: [] }
 * ```
 */
export function parseConcentration(input: string): ConcentrationParseResult {
  const warnings: string[] = [];

  // Handle empty/null input
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return {
      success: false,
      concentration: null,
      format: 'unknown',
      warnings,
    };
  }

  const trimmed = input.trim();

  // Check if this looks like a concentration string
  if (!isConcentrationString(trimmed)) {
    return {
      success: false,
      concentration: null,
      format: 'unknown',
      warnings,
    };
  }

  // Try insulin format first (U-100, U-500, etc.)
  const insulinResult = parseInsulinFormat(trimmed);
  if (insulinResult) {
    const concentration = calculateConcentrationRatio(insulinResult);
    return {
      success: true,
      concentration,
      format: 'units/ml',
      warnings,
    };
  }

  // Try standard concentration format (e.g., "250 MG/5 ML")
  const standardResult = parseStandardFormat(trimmed);
  if (standardResult) {
    // Normalize units (convert grams to milligrams, etc.)
    const normalized = normalizeConcentrationUnits(standardResult);
    
    // Validate values
    if (normalized.value <= 0) {
      throw new Error('Concentration numerator must be greater than zero');
    }
    if (normalized.perValue <= 0) {
      throw new Error('Concentration denominator must be greater than zero');
    }
    if (normalized.value < 0 || normalized.perValue < 0) {
      throw new Error('Concentration values cannot be negative');
    }

    // Calculate ratio
    const concentration = calculateConcentrationRatio(normalized);
    
    // Detect format
    const format = detectConcentrationFormat(trimmed);
    
    return {
      success: true,
      concentration,
      format,
      warnings,
    };
  }

  // Unable to parse
  return {
    success: false,
    concentration: null,
    format: 'unknown',
    warnings,
  };
}

/**
 * Check if string contains concentration pattern
 * 
 * @param input - String to check
 * @returns True if string appears to contain concentration data
 */
export function isConcentrationString(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const normalized = input.toUpperCase().trim();

  // Check for insulin format (U-100, U-500, etc.)
  if (/^U-\d+$/.test(normalized)) {
    return true;
  }

  // Check for standard concentration format (number UNIT / number UNIT)
  // Examples: "250 MG/5 ML", "1 G/5 ML", "100MG/1ML"
  if (/\d+\.?\d*\s*[A-Z]+\s*\/\s*\d+\.?\d*\s*[A-Z]+/i.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Parse standard concentration format (e.g., "250 MG/5 ML")
 * 
 * @param input - Concentration string
 * @returns Parsed concentration (without ratio calculated) or null
 */
function parseStandardFormat(input: string): Omit<Concentration, 'ratio'> | null {
  // Pattern: NUMBER UNIT / NUMBER UNIT
  // Handles: "250 MG/5 ML", "250 mg / 5 ml", "250MG/5ML", "1 G/5 ML"
  const pattern = /^(\d+\.?\d*)\s*([A-Z]+)\s*\/\s*(\d+\.?\d*)\s*([A-Z]+)$/i;
  const match = input.trim().match(pattern);

  if (!match) {
    return null;
  }

  const [, valueStr, unit, perValueStr, perUnit] = match;

  return {
    value: parseFloat(valueStr),
    unit: unit.toUpperCase(),
    perValue: parseFloat(perValueStr),
    perUnit: perUnit.toUpperCase(),
    rawString: input.trim(),
  };
}

/**
 * Parse insulin concentration format (e.g., "U-100")
 * 
 * @param input - Insulin concentration string
 * @returns Parsed concentration or null
 */
function parseInsulinFormat(input: string): Omit<Concentration, 'ratio'> | null {
  // Pattern: U-NUMBER (e.g., U-100, U-500)
  const pattern = /^U-(\d+)$/i;
  const match = input.trim().toUpperCase().match(pattern);

  if (!match) {
    return null;
  }

  const [, unitsStr] = match;

  return {
    value: parseFloat(unitsStr),
    unit: 'UNITS',
    perValue: 1,
    perUnit: 'ML',
    rawString: input.trim(),
  };
}

/**
 * Normalize concentration units (convert grams to milligrams, etc.)
 * 
 * @param concentration - Concentration with potentially non-normalized units
 * @returns Concentration with normalized units
 */
export function normalizeConcentrationUnits(
  concentration: Omit<Concentration, 'ratio'>
): Omit<Concentration, 'ratio'> {
  let value = concentration.value;
  let unit = concentration.unit.toUpperCase();
  let perValue = concentration.perValue;
  let perUnit = concentration.perUnit.toUpperCase();

  // Normalize numerator unit
  if (unit === 'G' || unit === 'GM' || unit === 'GRAM' || unit === 'GRAMS') {
    // Convert grams to milligrams
    value = value * 1000;
    unit = 'MG';
  } else if (unit === 'MG' || unit === 'MILLIGRAM' || unit === 'MILLIGRAMS') {
    unit = 'MG';
  } else if (unit === 'MCG' || unit === 'UG' || unit === 'MICROGRAM' || unit === 'MICROGRAMS') {
    unit = 'MCG';
  }

  // Normalize denominator unit
  if (perUnit === 'L' || perUnit === 'LITER' || perUnit === 'LITERS') {
    // Convert liters to milliliters
    perValue = perValue * 1000;
    perUnit = 'ML';
  } else if (perUnit === 'ML' || perUnit === 'MILLILITER' || perUnit === 'MILLILITERS') {
    perUnit = 'ML';
  }

  return {
    value,
    unit,
    perValue,
    perUnit,
    rawString: concentration.rawString,
  };
}

/**
 * Calculate concentration ratio (mg/mL or units/mL)
 * 
 * @param concentration - Concentration without ratio
 * @returns Concentration with ratio calculated
 */
export function calculateConcentrationRatio(
  concentration: Omit<Concentration, 'ratio'>
): Concentration {
  if (concentration.perValue === 0) {
    throw new Error('Cannot calculate ratio: denominator is zero');
  }

  const ratio = concentration.value / concentration.perValue;

  return {
    ...concentration,
    ratio,
  };
}

/**
 * Detect concentration format type
 * 
 * @param input - Concentration string
 * @returns Detected format
 */
export function detectConcentrationFormat(input: string): ConcentrationFormat {
  const normalized = input.toUpperCase().trim();

  // Insulin format
  if (/^U-\d+$/i.test(normalized)) {
    return 'units/ml';
  }

  // Gram-based concentration
  if (/\d+\.?\d*\s*G\s*\/\s*\d+\.?\d*\s*ML/i.test(normalized)) {
    return 'g/ml';
  }

  // Standard mg/mL format
  if (/\d+\.?\d*\s*MG\s*\/\s*\d+\.?\d*\s*ML/i.test(normalized)) {
    return 'mg/ml';
  }

  return 'unknown';
}

