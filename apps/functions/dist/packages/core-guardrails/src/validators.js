"use strict";
/**
 * Input Validation Utilities
 * Provides validation helpers for sanitizing and validating user inputs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDrugName = validateDrugName;
exports.validateNDC = validateNDC;
exports.normalizeNDC = normalizeNDC;
exports.validateSIG = validateSIG;
exports.validateDaysSupply = validateDaysSupply;
exports.sanitizeString = sanitizeString;
exports.validatePositiveNumber = validatePositiveNumber;
exports.validateInteger = validateInteger;
exports.validateEmail = validateEmail;
exports.validateEnum = validateEnum;
const _core_config_1 = require("@core-config");
const errors_1 = require("./errors");
/**
 * Validate drug name
 */
function validateDrugName(drugName) {
    if (!drugName || typeof drugName !== "string") {
        throw new errors_1.InvalidDrugNameError(drugName);
    }
    const trimmed = drugName.trim();
    // Check minimum length
    if (trimmed.length < 2) {
        throw new errors_1.InvalidDrugNameError(trimmed);
    }
    // Check maximum length
    if (trimmed.length > 200) {
        throw new errors_1.InvalidDrugNameError(trimmed);
    }
    // Check for invalid characters (allow letters, numbers, spaces, hyphens, parentheses)
    const validPattern = /^[a-zA-Z0-9\s\-()/.]+$/;
    if (!validPattern.test(trimmed)) {
        throw new errors_1.InvalidDrugNameError(trimmed);
    }
    return trimmed;
}
/**
 * Validate NDC format
 */
function validateNDC(ndc) {
    if (!ndc || typeof ndc !== "string") {
        throw new errors_1.InvalidNDCError(ndc);
    }
    const trimmed = ndc.trim();
    // Check against NDC format regex
    if (!_core_config_1.BUSINESS_RULES.NDC_FORMAT_REGEX.test(trimmed)) {
        throw new errors_1.InvalidNDCError(trimmed);
    }
    return trimmed;
}
/**
 * Normalize NDC to standard 11-digit format with dashes (XXXXX-XXXX-XX)
 */
function normalizeNDC(ndc) {
    const validated = validateNDC(ndc);
    // If already in correct format, return as is
    if (/^\d{5}-\d{4}-\d{2}$/.test(validated)) {
        return validated;
    }
    // Remove all dashes
    const digitsOnly = validated.replace(/-/g, "");
    // Handle different formats
    if (digitsOnly.length === 10) {
        // 10-digit: convert to 11-digit by padding the middle segment
        // Format: XXXXX-XXX-XX → XXXXX-0XXX-XX
        return `${digitsOnly.slice(0, 5)}-0${digitsOnly.slice(5, 8)}-${digitsOnly.slice(8)}`;
    }
    else if (digitsOnly.length === 11) {
        // 11-digit: format with dashes
        return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}-${digitsOnly.slice(9)}`;
    }
    throw new errors_1.InvalidNDCError(ndc);
}
/**
 * Validate SIG (prescription directions)
 */
function validateSIG(sig) {
    if (!sig || typeof sig !== "string") {
        throw new errors_1.InvalidSIGError(sig);
    }
    const trimmed = sig.trim();
    // Check minimum length
    if (trimmed.length < 3) {
        throw new errors_1.InvalidSIGError(trimmed);
    }
    // Check maximum length
    if (trimmed.length > 500) {
        throw new errors_1.InvalidSIGError(trimmed);
    }
    // Basic sanitization: remove potentially dangerous characters
    const sanitized = trimmed.replace(/[<>{}]/g, "");
    return sanitized;
}
/**
 * Validate days' supply
 */
function validateDaysSupply(daysSupply) {
    if (typeof daysSupply !== "number" || isNaN(daysSupply)) {
        throw new errors_1.InvalidDaysSupplyError(daysSupply);
    }
    if (daysSupply < _core_config_1.BUSINESS_RULES.MIN_DAYS_SUPPLY || daysSupply > _core_config_1.BUSINESS_RULES.MAX_DAYS_SUPPLY) {
        throw new errors_1.InvalidDaysSupplyError(daysSupply);
    }
    // Round to nearest integer
    return Math.round(daysSupply);
}
/**
 * Sanitize string input (remove potentially dangerous characters)
 */
function sanitizeString(input) {
    if (!input || typeof input !== "string") {
        return "";
    }
    return input
        .trim()
        .replace(/[<>{}]/g, "") // Remove HTML/script tags
        .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
}
/**
 * Validate positive number
 */
function validatePositiveNumber(value, fieldName) {
    if (typeof value !== "number" || isNaN(value) || value <= 0) {
        throw new Error(`${fieldName} must be a positive number`);
    }
    return value;
}
/**
 * Validate integer
 */
function validateInteger(value, fieldName) {
    if (typeof value !== "number" || isNaN(value) || !Number.isInteger(value)) {
        throw new Error(`${fieldName} must be an integer`);
    }
    return value;
}
/**
 * Validate email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        throw new Error("Invalid email format");
    }
    return email.toLowerCase().trim();
}
/**
 * Validate enum value
 */
function validateEnum(value, enumValues, fieldName) {
    if (!enumValues.includes(value)) {
        throw new Error(`Invalid ${fieldName}. Must be one of: ${enumValues.join(", ")}`);
    }
    return value;
}
//# sourceMappingURL=validators.js.map