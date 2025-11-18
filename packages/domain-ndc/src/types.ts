/**
 * Domain types for NDC business logic
 */

export interface Prescription {
  drugName: string;
  rxcui?: string;
  sig: string;
  daysSupply: number;
  dosageForm?: string;
  strength?: string;
}

export interface Package {
  ndc: string;
  packageSize: number;
  unit: string;
  dosageForm: string;
  isActive: boolean;
}

export interface MatchResult {
  recommendedPackages: Package[];
  totalQuantity: number;
  overfillPercentage: number;
  underfillPercentage: number;
  warnings: string[];
}

/**
 * Concentration information for liquid medications
 * Represents a concentration ratio (e.g., 250 MG/5 ML)
 */
export interface Concentration {
  /** Numerator value (e.g., 250) */
  value: number;
  /** Numerator unit (e.g., "MG") */
  unit: string;
  /** Denominator value (e.g., 5) */
  perValue: number;
  /** Denominator unit (e.g., "ML") */
  perUnit: string;
  /** Calculated ratio (e.g., 50 mg/mL) */
  ratio: number;
  /** Original string (e.g., "250 MG/5 ML") */
  rawString: string;
}

/**
 * Concentration format types
 */
export type ConcentrationFormat =
  | 'mg/ml'      // Standard liquid concentration (e.g., "250 MG/5 ML")
  | 'g/ml'       // Gram-based concentration (e.g., "1 G/5 ML")
  | 'units/ml'   // Insulin concentration (e.g., "U-100")
  | 'unknown';

/**
 * Result of concentration parsing
 */
export interface ConcentrationParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed concentration (null if parsing failed) */
  concentration: Concentration | null;
  /** Detected concentration format */
  format: ConcentrationFormat;
  /** Any warnings during parsing */
  warnings: string[];
}

