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
export type ConcentrationFormat = 'mg/ml' | 'g/ml' | 'units/ml' | 'unknown';
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
/**
 * Input for liquid medication calculations
 */
export interface LiquidCalculationInput {
    /** Prescribed dose in milligrams */
    prescribedDoseMg: number;
    /** Frequency per day (e.g., 3 for TID) */
    frequency: number;
    /** Days supply */
    daysSupply: number;
    /** Concentration information */
    concentration: Concentration;
}
/**
 * Result of liquid medication calculation
 */
export interface LiquidCalculationResult {
    /** Prescribed dose in milligrams */
    prescribedDoseMg: number;
    /** Concentration used for calculation */
    concentration: Concentration;
    /** Milliliters per dose */
    mLPerDose: number;
    /** Milliliters per day */
    mLPerDay: number;
    /** Total milliliters needed */
    totalML: number;
    /** Formula showing calculation steps */
    formula: string;
    /** Any warnings about the calculation */
    warnings: string[];
    /** Whether calculation is valid */
    isValid: boolean;
}
/**
 * Dosage form type categories
 */
export declare enum DosageFormType {
    /** Solid dosage forms (tablets, capsules) */
    SOLID = "SOLID",
    /** Liquid dosage forms (suspensions, solutions, syrups) */
    LIQUID = "LIQUID",
    /** Injectable dosage forms (injections, vials) */
    INJECTABLE = "INJECTABLE",
    /** Special dosage forms (patches, inhalers) */
    SPECIAL = "SPECIAL"
}
