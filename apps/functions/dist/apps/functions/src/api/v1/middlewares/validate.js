"use strict";
/**
 * Validation Middleware
 * Validates and sanitizes API requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
exports.sanitizeString = sanitizeString;
exports.isValidDrugName = isValidDrugName;
exports.isValidRxCUI = isValidRxCUI;
exports.sanitizeDrugInput = sanitizeDrugInput;
exports.isWithinRange = isWithinRange;
const zod_1 = require("zod");
const _core_guardrails_1 = require("@core-guardrails");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'ValidationMiddleware' });
/**
 * Create validation middleware for a Zod schema
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
function validateRequest(schema) {
    return async (req, res, next) => {
        try {
            // Validate and parse request body
            const validated = await schema.parseAsync(req.body);
            // Replace request body with validated/sanitized data
            req.body = validated;
            logger.debug('Request validation successful', {
                path: req.path,
                method: req.method,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger.warn('Request validation failed', {
                    path: req.path,
                    method: req.method,
                    errors: error.errors,
                });
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid request data',
                        details: error.errors.map((err) => ({
                            field: err.path.join('.'),
                            message: err.message,
                            code: err.code,
                        })),
                    },
                });
                return;
            }
            // Unexpected error
            logger.error('Unexpected validation error', error, {
                path: req.path,
                method: req.method,
            });
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected error occurred during validation',
                },
            });
        }
    };
}
/**
 * Sanitize string input to prevent injection attacks
 * @param input Raw string input
 * @returns Sanitized string
 */
function sanitizeString(input) {
    if (!input)
        return '';
    // Remove potentially dangerous characters
    return input
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .trim();
}
/**
 * Validate drug name format
 * @param name Drug name
 * @returns True if valid
 */
function isValidDrugName(name) {
    if (!name || name.length < 2 || name.length > 200) {
        return false;
    }
    // Allow letters, numbers, spaces, and common pharmaceutical characters
    const validPattern = /^[A-Za-z0-9\s\-\/\(\).]+$/;
    return validPattern.test(name);
}
/**
 * Validate RxCUI format
 * @param rxcui RxCUI string
 * @returns True if valid
 */
function isValidRxCUI(rxcui) {
    if (!rxcui)
        return false;
    // RxCUI should be numeric
    const validPattern = /^\d+$/;
    return validPattern.test(rxcui);
}
/**
 * Sanitize and validate drug input
 * @param drug Drug object
 * @returns Sanitized drug object
 */
function sanitizeDrugInput(drug) {
    const sanitized = {};
    if (drug.name) {
        const cleanName = sanitizeString(drug.name);
        if (isValidDrugName(cleanName)) {
            sanitized.name = cleanName;
        }
    }
    if (drug.rxcui) {
        const cleanRxcui = sanitizeString(drug.rxcui);
        if (isValidRxCUI(cleanRxcui)) {
            sanitized.rxcui = cleanRxcui;
        }
    }
    return sanitized;
}
/**
 * Validate numeric range
 * @param value Value to validate
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns True if valid
 */
function isWithinRange(value, min, max) {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}
//# sourceMappingURL=validate.js.map