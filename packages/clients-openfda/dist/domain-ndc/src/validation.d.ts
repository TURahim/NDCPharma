/**
 * NDC Validation Logic
 * Pure business logic for validating NDC codes
 */
import type { NDCValidationResult, MarketingStatus } from '@clients-openfda/internal/fdaTypes';
/**
 * Validate NDC format
 * Checks if the NDC code is properly formatted
 *
 * @param ndc NDC code to validate
 * @returns Validation result
 */
export declare function validateNDCFormat(ndc: string): NDCValidationResult;
/**
 * Validate NDC with marketing status
 * Checks both format and whether the NDC is currently active
 *
 * @param ndc NDC code to validate
 * @param marketingStatus Marketing status from FDA
 * @returns Validation result with marketing status
 */
export declare function validateNDCWithStatus(ndc: string, marketingStatus?: MarketingStatus): NDCValidationResult;
/**
 * Normalize NDC to 11-digit format with dashes (XXXXX-XXXX-XX)
 *
 * Handles various input formats:
 * - 10 digits: pad labeler code with leading zero
 * - 11 digits: format with dashes
 * - Already formatted: return as-is
 *
 * @param ndc Raw NDC code
 * @returns Normalized NDC (XXXXX-XXXX-XX)
 */
export declare function normalizeNDC(ndc: string): string;
/**
 * Extract product NDC from package NDC
 * Package NDC: XXXXX-XXXX-XX (11 digits)
 * Product NDC: XXXXX-XXXX (9 digits)
 *
 * @param packageNdc Package NDC (11-digit)
 * @returns Product NDC (9-digit)
 */
export declare function extractProductNDC(packageNdc: string): string;
/**
 * Validate product NDC format
 * Product NDC should be 9 digits in XXXXX-XXXX format
 *
 * @param productNdc Product NDC to validate
 * @returns True if valid format
 */
export declare function isValidProductNDC(productNdc: string): boolean;
/**
 * Compare two NDC codes for equality
 * Normalizes both NDCs before comparison
 *
 * @param ndc1 First NDC code
 * @param ndc2 Second NDC code
 * @returns True if NDCs are equivalent
 */
export declare function areNDCsEqual(ndc1: string, ndc2: string): boolean;
/**
 * Check if NDC is in the standard 11-digit format
 * @param ndc NDC code to check
 * @returns True if in standard format (XXXXX-XXXX-XX)
 */
export declare function isStandardFormat(ndc: string): boolean;
/**
 * Parse NDC segments
 * Returns the three segments of an NDC code
 *
 * @param ndc NDC code (normalized)
 * @returns Parsed segments: {labeler, product, package}
 */
export interface NDCSegments {
    /** Labeler code (5 digits) */
    labeler: string;
    /** Product code (4 digits) */
    product: string;
    /** Package code (2 digits) */
    package: string;
}
/**
 * Parse NDC into segments
 * @param ndc NDC code to parse
 * @returns NDC segments
 */
export declare function parseNDCSegments(ndc: string): NDCSegments;
/**
 * Validate a batch of NDCs
 * @param ndcs Array of NDC codes to validate
 * @returns Map of NDC to validation result
 */
export declare function validateNDCBatch(ndcs: string[]): Map<string, NDCValidationResult>;
/**
 * Filter valid NDCs from a batch
 * @param ndcs Array of NDC codes
 * @returns Array of valid, normalized NDCs
 */
export declare function filterValidNDCs(ndcs: string[]): string[];
