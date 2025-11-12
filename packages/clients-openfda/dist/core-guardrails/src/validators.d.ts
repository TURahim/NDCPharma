/**
 * Input Validation Utilities
 * Provides validation helpers for sanitizing and validating user inputs
 */
/**
 * Validate drug name
 */
export declare function validateDrugName(drugName: string): string;
/**
 * Validate NDC format
 */
export declare function validateNDC(ndc: string): string;
/**
 * Normalize NDC to standard 11-digit format with dashes (XXXXX-XXXX-XX)
 */
export declare function normalizeNDC(ndc: string): string;
/**
 * Validate SIG (prescription directions)
 */
export declare function validateSIG(sig: string): string;
/**
 * Validate days' supply
 */
export declare function validateDaysSupply(daysSupply: number): number;
/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export declare function sanitizeString(input: string): string;
/**
 * Validate positive number
 */
export declare function validatePositiveNumber(value: number, fieldName: string): number;
/**
 * Validate integer
 */
export declare function validateInteger(value: number, fieldName: string): number;
/**
 * Validate email format
 */
export declare function validateEmail(email: string): string;
/**
 * Validate enum value
 */
export declare function validateEnum<T extends string>(value: string, enumValues: readonly T[], fieldName: string): T;
