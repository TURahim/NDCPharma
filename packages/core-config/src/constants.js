"use strict";
/**
 * Application Constants
 * Centralized configuration values, API endpoints, and business rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ENDPOINTS = exports.HTTP_STATUS = exports.LOG_LEVELS = exports.USER_ROLES = exports.ERROR_MESSAGES = exports.ERROR_CODES = exports.UNITS = exports.DOSAGE_FORMS = exports.BUSINESS_RULES = exports.CACHE_CONFIG = exports.API_CONFIG = void 0;
const environment_1 = require("./environment");
/**
 * API Configuration
 */
exports.API_CONFIG = {
    // Base URLs
    RXNORM_BASE_URL: environment_1.env.RXNORM_BASE_URL,
    FDA_BASE_URL: environment_1.env.FDA_BASE_URL,
    OPENAI_MODEL: environment_1.env.OPENAI_MODEL,
    // Timeouts
    TIMEOUT_MS: environment_1.env.API_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS: 2000,
    OPENAI_TIMEOUT_MS: 5000,
    // Retry Configuration
    MAX_RETRIES: environment_1.env.MAX_RETRIES,
    RETRY_DELAY_MS: 1000,
    RETRY_BACKOFF_MULTIPLIER: 2,
    // Rate Limiting
    RATE_LIMIT: {
        REQUESTS_PER_HOUR: environment_1.env.RATE_LIMIT_REQUESTS_PER_HOUR,
        BURST: environment_1.env.RATE_LIMIT_BURST,
        WINDOW_MS: 60 * 60 * 1000, // 1 hour in milliseconds
    },
};
/**
 * Cache Configuration
 */
exports.CACHE_CONFIG = {
    ENABLED: environment_1.env.ENABLE_CACHING,
    TTL: {
        DRUG_NORMALIZATION: environment_1.env.CACHE_TTL_HOURS_DRUG * 60 * 60 * 1000, // 24 hours in ms
        NDC_DATA: environment_1.env.CACHE_TTL_HOURS_NDC * 60 * 60 * 1000, // 1 hour in ms
        CALCULATION_RESULT: 15 * 60 * 1000, // 15 minutes in ms
    },
};
/**
 * Business Rules & Thresholds
 */
exports.BUSINESS_RULES = {
    // Quantity Calculation
    MAX_DAYS_SUPPLY: 365,
    MIN_DAYS_SUPPLY: 1,
    MAX_DAILY_DOSE: 1000, // Maximum dose per day (units)
    MIN_DAILY_DOSE: 0.01, // Minimum dose per day (units)
    // Package Selection
    OVERFILL_THRESHOLD_PERCENT: 10, // Warn if overfill exceeds 10%
    UNDERFILL_ALLOWED_PERCENT: 0, // No underfill allowed
    MAX_PACKAGES_PER_PRESCRIPTION: 5, // Maximum number of packages to combine
    // NDC Validation
    NDC_FORMAT_REGEX: /^\d{5}-\d{4}-\d{2}$|^\d{5}-\d{3}-\d{2}$|^\d{10}$|^\d{11}$/,
    INACTIVE_NDC_WARNING_DAYS: 30, // Warn if NDC will be inactive within 30 days
    // Matching Accuracy
    MIN_CONFIDENCE_SCORE: 0.7, // Minimum confidence score for AI matching
    NORMALIZATION_ACCURACY_TARGET: 0.95, // 95% accuracy target
};
/**
 * Dosage Forms
 */
exports.DOSAGE_FORMS = {
    SOLID: ["TABLET", "CAPSULE", "CAPLET", "LOZENGE", "PILL"],
    LIQUID: ["SOLUTION", "SUSPENSION", "SYRUP", "ELIXIR", "LIQUID"],
    INJECTABLE: ["INJECTION", "VIAL", "AMPULE", "SYRINGE"],
    TOPICAL: ["CREAM", "OINTMENT", "GEL", "LOTION", "PATCH"],
    INHALATION: ["INHALER", "AEROSOL", "SPRAY", "NEBULIZER"],
    SPECIAL: ["KIT", "DEVICE", "APPLICATOR"],
};
/**
 * Unit Types and Conversions
 */
exports.UNITS = {
    SOLID: ["TABLET", "CAPSULE", "CAPLET", "PILL", "EACH"],
    LIQUID: ["ML", "L", "OZ", "TSP", "TBSP"],
    WEIGHT: ["MG", "G", "MCG", "KG"],
    VOLUME: ["ML", "L", "CC"],
    INSULIN: ["UNIT", "UNITS"],
    INHALATION: ["PUFF", "PUFFS", "ACTUATION", "ACTUATIONS"],
    // Conversion factors
    CONVERSIONS: {
        TSP_TO_ML: 5,
        TBSP_TO_ML: 15,
        OZ_TO_ML: 29.5735,
        G_TO_MG: 1000,
        MCG_TO_MG: 0.001,
        KG_TO_G: 1000,
    },
};
/**
 * Error Codes
 */
exports.ERROR_CODES = {
    // Validation Errors (400)
    INVALID_INPUT: "INVALID_INPUT",
    INVALID_DRUG_NAME: "INVALID_DRUG_NAME",
    INVALID_NDC: "INVALID_NDC",
    INVALID_SIG: "INVALID_SIG",
    INVALID_DAYS_SUPPLY: "INVALID_DAYS_SUPPLY",
    // Not Found Errors (404)
    DRUG_NOT_FOUND: "DRUG_NOT_FOUND",
    NDC_NOT_FOUND: "NDC_NOT_FOUND",
    RXCUI_NOT_FOUND: "RXCUI_NOT_FOUND",
    // External API Errors (502, 503)
    RXNORM_API_ERROR: "RXNORM_API_ERROR",
    FDA_API_ERROR: "FDA_API_ERROR",
    OPENAI_API_ERROR: "OPENAI_API_ERROR",
    // Business Logic Errors (422)
    CALCULATION_ERROR: "CALCULATION_ERROR",
    NO_VALID_PACKAGES: "NO_VALID_PACKAGES",
    INACTIVE_NDC: "INACTIVE_NDC",
    DOSAGE_FORM_MISMATCH: "DOSAGE_FORM_MISMATCH",
    // System Errors (500)
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    CACHE_ERROR: "CACHE_ERROR",
    // Authentication Errors (401, 403)
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    INVALID_TOKEN: "INVALID_TOKEN",
    // Rate Limiting (429)
    RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
};
/**
 * Error Messages
 */
exports.ERROR_MESSAGES = {
    [exports.ERROR_CODES.INVALID_INPUT]: "Invalid input provided. Please check your request.",
    [exports.ERROR_CODES.INVALID_DRUG_NAME]: "Invalid drug name format.",
    [exports.ERROR_CODES.INVALID_NDC]: "Invalid NDC format. Expected format: XXXXX-XXXX-XX or 10-11 digits.",
    [exports.ERROR_CODES.INVALID_SIG]: "Invalid SIG (prescription directions) format.",
    [exports.ERROR_CODES.INVALID_DAYS_SUPPLY]: "Invalid days' supply. Must be between 1 and 365 days.",
    [exports.ERROR_CODES.DRUG_NOT_FOUND]: "Drug not found. Please check the drug name or NDC.",
    [exports.ERROR_CODES.NDC_NOT_FOUND]: "No valid NDCs found for the specified drug.",
    [exports.ERROR_CODES.RXCUI_NOT_FOUND]: "Unable to normalize drug name to RxCUI.",
    [exports.ERROR_CODES.RXNORM_API_ERROR]: "RxNorm API is temporarily unavailable. Please try again.",
    [exports.ERROR_CODES.FDA_API_ERROR]: "FDA API is temporarily unavailable. Please try again.",
    [exports.ERROR_CODES.OPENAI_API_ERROR]: "AI service is temporarily unavailable. Using fallback logic.",
    [exports.ERROR_CODES.CALCULATION_ERROR]: "Error calculating dispense quantity. Please review inputs.",
    [exports.ERROR_CODES.NO_VALID_PACKAGES]: "No valid package sizes found for the calculated quantity.",
    [exports.ERROR_CODES.INACTIVE_NDC]: "Warning: Selected NDC is inactive or discontinued.",
    [exports.ERROR_CODES.DOSAGE_FORM_MISMATCH]: "Dosage form mismatch between prescription and available NDCs.",
    [exports.ERROR_CODES.INTERNAL_ERROR]: "An internal server error occurred. Please try again later.",
    [exports.ERROR_CODES.DATABASE_ERROR]: "Database error occurred. Please try again.",
    [exports.ERROR_CODES.CACHE_ERROR]: "Cache error occurred. Proceeding without cache.",
    [exports.ERROR_CODES.UNAUTHORIZED]: "Authentication required. Please sign in.",
    [exports.ERROR_CODES.FORBIDDEN]: "You do not have permission to perform this action.",
    [exports.ERROR_CODES.TOKEN_EXPIRED]: "Authentication token has expired. Please sign in again.",
    [exports.ERROR_CODES.INVALID_TOKEN]: "Invalid authentication token.",
    [exports.ERROR_CODES.RATE_LIMIT_EXCEEDED]: "Rate limit exceeded. Please try again later.",
};
/**
 * User Roles
 */
exports.USER_ROLES = {
    PHARMACIST: "pharmacist",
    PHARMACY_TECHNICIAN: "pharmacy_technician",
    ADMIN: "admin",
};
/**
 * Log Levels
 */
exports.LOG_LEVELS = {
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
    CRITICAL: "critical",
};
/**
 * HTTP Status Codes
 */
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
};
/**
 * API Endpoints
 */
exports.API_ENDPOINTS = {
    CALCULATE: "/api/v1/calculate",
    HEALTH: "/api/v1/health",
    ANALYTICS: "/api/v1/analytics",
};
//# sourceMappingURL=constants.js.map