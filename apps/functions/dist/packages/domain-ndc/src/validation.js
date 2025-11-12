"use strict";
/**
 * NDC Validation Logic
 * Pure business logic for validating NDC codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNDCFormat = validateNDCFormat;
exports.validateNDCWithStatus = validateNDCWithStatus;
exports.normalizeNDC = normalizeNDC;
exports.extractProductNDC = extractProductNDC;
exports.isValidProductNDC = isValidProductNDC;
exports.areNDCsEqual = areNDCsEqual;
exports.isStandardFormat = isStandardFormat;
exports.parseNDCSegments = parseNDCSegments;
exports.validateNDCBatch = validateNDCBatch;
exports.filterValidNDCs = filterValidNDCs;
/**
 * NDC Format Configuration
 */
const NDC_FORMATS = {
    /** 11-digit format with dashes: XXXXX-XXXX-XX */
    WITH_DASHES: /^\d{5}-\d{4}-\d{2}$/,
    /** 11-digit format without dashes: XXXXXXXXXXX */
    WITHOUT_DASHES: /^\d{11}$/,
    /** 10-digit format: XXXXXXXXXX */
    TEN_DIGIT: /^\d{10}$/,
    /** Product NDC formats: XXXXX-XXXX or XXXXX-XXX-X */
    PRODUCT_NDC: /^\d{5}-\d{3,4}(-\d{1,2})?$/,
};
/**
 * Validate NDC format
 * Checks if the NDC code is properly formatted
 *
 * @param ndc NDC code to validate
 * @returns Validation result
 */
function validateNDCFormat(ndc) {
    const errors = [];
    const warnings = [];
    // Basic checks
    if (!ndc || typeof ndc !== 'string') {
        errors.push('NDC code is required and must be a string');
        return {
            isValid: false,
            errors,
            warnings,
        };
    }
    const trimmed = ndc.trim();
    if (trimmed.length === 0) {
        errors.push('NDC code cannot be empty');
        return {
            isValid: false,
            errors,
            warnings,
        };
    }
    // Check for valid format
    const isValidFormat = NDC_FORMATS.WITH_DASHES.test(trimmed) ||
        NDC_FORMATS.WITHOUT_DASHES.test(trimmed) ||
        NDC_FORMATS.TEN_DIGIT.test(trimmed);
    if (!isValidFormat) {
        errors.push('Invalid NDC format. Expected 10 or 11 digits, optionally with dashes (XXXXX-XXXX-XX)');
        return {
            isValid: false,
            errors,
            warnings,
        };
    }
    // Normalize NDC
    let normalizedNdc;
    try {
        normalizedNdc = normalizeNDC(trimmed);
    }
    catch (error) {
        errors.push(`Failed to normalize NDC: ${error.message}`);
        return {
            isValid: false,
            errors,
            warnings,
        };
    }
    // Validate normalized format
    if (!NDC_FORMATS.WITH_DASHES.test(normalizedNdc)) {
        errors.push('Failed to normalize NDC to standard format');
        return {
            isValid: false,
            normalizedNdc,
            errors,
            warnings,
        };
    }
    return {
        isValid: true,
        normalizedNdc,
        errors,
        warnings,
    };
}
/**
 * Validate NDC with marketing status
 * Checks both format and whether the NDC is currently active
 *
 * @param ndc NDC code to validate
 * @param marketingStatus Marketing status from FDA
 * @returns Validation result with marketing status
 */
function validateNDCWithStatus(ndc, marketingStatus) {
    // First validate format
    const formatValidation = validateNDCFormat(ndc);
    if (!formatValidation.isValid) {
        return formatValidation;
    }
    const warnings = [...formatValidation.warnings];
    const errors = [...formatValidation.errors];
    // Check marketing status
    if (marketingStatus) {
        const { isActive, status, endDate, startDate } = marketingStatus;
        if (!isActive) {
            if (status === 'discontinued') {
                warnings.push('NDC is discontinued and no longer marketed');
            }
            else if (status === 'expired') {
                warnings.push('NDC listing has expired');
            }
            else {
                warnings.push('NDC marketing status is unknown or inactive');
            }
        }
        // Check for upcoming expiration
        if (isActive && endDate) {
            const daysUntilExpiration = calculateDaysUntilDate(endDate);
            if (daysUntilExpiration !== null && daysUntilExpiration <= 30) {
                warnings.push(`NDC will be discontinued in ${daysUntilExpiration} days`);
            }
        }
        // Check if not yet marketed
        if (startDate) {
            const daysUntilStart = calculateDaysUntilDate(startDate);
            if (daysUntilStart !== null && daysUntilStart > 0) {
                warnings.push(`NDC will start marketing in ${daysUntilStart} days`);
            }
        }
        return {
            isValid: formatValidation.isValid,
            normalizedNdc: formatValidation.normalizedNdc,
            isActive,
            marketingStatus,
            errors,
            warnings,
        };
    }
    return formatValidation;
}
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
function normalizeNDC(ndc) {
    if (!ndc) {
        throw new Error('NDC code is required');
    }
    const trimmed = ndc.trim();
    // Already in correct format
    if (NDC_FORMATS.WITH_DASHES.test(trimmed)) {
        return trimmed;
    }
    // Remove all non-numeric characters
    const digits = trimmed.replace(/\D/g, '');
    // Validate digit count
    if (digits.length < 10 || digits.length > 11) {
        throw new Error(`Invalid NDC length: ${digits.length} digits. Expected 10 or 11 digits.`);
    }
    // Pad to 11 digits if necessary (10-digit NDCs need leading zero in labeler code)
    const padded = digits.length === 10 ? '0' + digits : digits;
    // Format as XXXXX-XXXX-XX
    return `${padded.slice(0, 5)}-${padded.slice(5, 9)}-${padded.slice(9, 11)}`;
}
/**
 * Extract product NDC from package NDC
 * Package NDC: XXXXX-XXXX-XX (11 digits)
 * Product NDC: XXXXX-XXXX (9 digits)
 *
 * @param packageNdc Package NDC (11-digit)
 * @returns Product NDC (9-digit)
 */
function extractProductNDC(packageNdc) {
    const normalized = normalizeNDC(packageNdc);
    // Remove package code (last 3 characters: "-XX")
    return normalized.slice(0, -3);
}
/**
 * Validate product NDC format
 * Product NDC should be 9 digits in XXXXX-XXXX format
 *
 * @param productNdc Product NDC to validate
 * @returns True if valid format
 */
function isValidProductNDC(productNdc) {
    const trimmed = productNdc.trim();
    // Check format: XXXXX-XXXX
    const productNdcRegex = /^\d{5}-\d{4}$/;
    if (productNdcRegex.test(trimmed)) {
        return true;
    }
    // Try normalizing if it's just 9 digits
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 9) {
        return true;
    }
    return false;
}
/**
 * Compare two NDC codes for equality
 * Normalizes both NDCs before comparison
 *
 * @param ndc1 First NDC code
 * @param ndc2 Second NDC code
 * @returns True if NDCs are equivalent
 */
function areNDCsEqual(ndc1, ndc2) {
    try {
        const normalized1 = normalizeNDC(ndc1);
        const normalized2 = normalizeNDC(ndc2);
        return normalized1 === normalized2;
    }
    catch {
        return false;
    }
}
/**
 * Calculate days until a given date
 * @param dateString ISO 8601 date string (YYYY-MM-DD)
 * @returns Days until date (positive = future, negative = past), or null if invalid
 */
function calculateDaysUntilDate(dateString) {
    try {
        const targetDate = new Date(dateString);
        const today = new Date();
        // Reset time to midnight for accurate day calculation
        targetDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffMs = targetDate.getTime() - today.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    catch {
        return null;
    }
}
/**
 * Check if NDC is in the standard 11-digit format
 * @param ndc NDC code to check
 * @returns True if in standard format (XXXXX-XXXX-XX)
 */
function isStandardFormat(ndc) {
    return NDC_FORMATS.WITH_DASHES.test(ndc.trim());
}
/**
 * Parse NDC into segments
 * @param ndc NDC code to parse
 * @returns NDC segments
 */
function parseNDCSegments(ndc) {
    const normalized = normalizeNDC(ndc);
    const parts = normalized.split('-');
    if (parts.length !== 3) {
        throw new Error('Invalid NDC format after normalization');
    }
    return {
        labeler: parts[0],
        product: parts[1],
        package: parts[2],
    };
}
/**
 * Validate a batch of NDCs
 * @param ndcs Array of NDC codes to validate
 * @returns Map of NDC to validation result
 */
function validateNDCBatch(ndcs) {
    const results = new Map();
    for (const ndc of ndcs) {
        const validation = validateNDCFormat(ndc);
        results.set(ndc, validation);
    }
    return results;
}
/**
 * Filter valid NDCs from a batch
 * @param ndcs Array of NDC codes
 * @returns Array of valid, normalized NDCs
 */
function filterValidNDCs(ndcs) {
    const valid = [];
    for (const ndc of ndcs) {
        const validation = validateNDCFormat(ndc);
        if (validation.isValid && validation.normalizedNdc) {
            valid.push(validation.normalizedNdc);
        }
    }
    return valid;
}
//# sourceMappingURL=validation.js.map