/**
 * Application Constants
 * Centralized configuration values, API endpoints, and business rules
 */
/**
 * API Configuration
 */
export declare const API_CONFIG: {
    readonly RXNORM_BASE_URL: string;
    readonly FDA_BASE_URL: string;
    readonly OPENAI_MODEL: string;
    readonly TIMEOUT_MS: number;
    readonly DEFAULT_TIMEOUT_MS: 2000;
    readonly OPENAI_TIMEOUT_MS: 5000;
    readonly MAX_RETRIES: number;
    readonly RETRY_DELAY_MS: 1000;
    readonly RETRY_BACKOFF_MULTIPLIER: 2;
    readonly RATE_LIMIT: {
        readonly REQUESTS_PER_HOUR: number;
        readonly BURST: number;
        readonly WINDOW_MS: number;
    };
};
/**
 * Cache Configuration
 */
export declare const CACHE_CONFIG: {
    readonly ENABLED: boolean;
    readonly TTL: {
        readonly DRUG_NORMALIZATION: number;
        readonly NDC_DATA: number;
        readonly CALCULATION_RESULT: number;
    };
};
/**
 * Business Rules & Thresholds
 */
export declare const BUSINESS_RULES: {
    readonly MAX_DAYS_SUPPLY: 365;
    readonly MIN_DAYS_SUPPLY: 1;
    readonly MAX_DAILY_DOSE: 1000;
    readonly MIN_DAILY_DOSE: 0.01;
    readonly OVERFILL_THRESHOLD_PERCENT: 10;
    readonly UNDERFILL_ALLOWED_PERCENT: 0;
    readonly MAX_PACKAGES_PER_PRESCRIPTION: 5;
    readonly NDC_FORMAT_REGEX: RegExp;
    readonly INACTIVE_NDC_WARNING_DAYS: 30;
    readonly MIN_CONFIDENCE_SCORE: 0.7;
    readonly NORMALIZATION_ACCURACY_TARGET: 0.95;
};
/**
 * Dosage Forms
 */
export declare const DOSAGE_FORMS: {
    readonly SOLID: readonly ["TABLET", "CAPSULE", "CAPLET", "LOZENGE", "PILL"];
    readonly LIQUID: readonly ["SOLUTION", "SUSPENSION", "SYRUP", "ELIXIR", "LIQUID"];
    readonly INJECTABLE: readonly ["INJECTION", "VIAL", "AMPULE", "SYRINGE"];
    readonly TOPICAL: readonly ["CREAM", "OINTMENT", "GEL", "LOTION", "PATCH"];
    readonly INHALATION: readonly ["INHALER", "AEROSOL", "SPRAY", "NEBULIZER"];
    readonly SPECIAL: readonly ["KIT", "DEVICE", "APPLICATOR"];
};
/**
 * Unit Types and Conversions
 */
export declare const UNITS: {
    readonly SOLID: readonly ["TABLET", "CAPSULE", "CAPLET", "PILL", "EACH"];
    readonly LIQUID: readonly ["ML", "L", "OZ", "TSP", "TBSP"];
    readonly WEIGHT: readonly ["MG", "G", "MCG", "KG"];
    readonly VOLUME: readonly ["ML", "L", "CC"];
    readonly INSULIN: readonly ["UNIT", "UNITS"];
    readonly INHALATION: readonly ["PUFF", "PUFFS", "ACTUATION", "ACTUATIONS"];
    readonly CONVERSIONS: {
        readonly TSP_TO_ML: 5;
        readonly TBSP_TO_ML: 15;
        readonly OZ_TO_ML: 29.5735;
        readonly G_TO_MG: 1000;
        readonly MCG_TO_MG: 0.001;
        readonly KG_TO_G: 1000;
    };
};
/**
 * Error Codes
 */
export declare const ERROR_CODES: {
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly INVALID_DRUG_NAME: "INVALID_DRUG_NAME";
    readonly INVALID_NDC: "INVALID_NDC";
    readonly INVALID_SIG: "INVALID_SIG";
    readonly INVALID_DAYS_SUPPLY: "INVALID_DAYS_SUPPLY";
    readonly DRUG_NOT_FOUND: "DRUG_NOT_FOUND";
    readonly NDC_NOT_FOUND: "NDC_NOT_FOUND";
    readonly RXCUI_NOT_FOUND: "RXCUI_NOT_FOUND";
    readonly RXNORM_API_ERROR: "RXNORM_API_ERROR";
    readonly FDA_API_ERROR: "FDA_API_ERROR";
    readonly OPENAI_API_ERROR: "OPENAI_API_ERROR";
    readonly CALCULATION_ERROR: "CALCULATION_ERROR";
    readonly NO_VALID_PACKAGES: "NO_VALID_PACKAGES";
    readonly INACTIVE_NDC: "INACTIVE_NDC";
    readonly DOSAGE_FORM_MISMATCH: "DOSAGE_FORM_MISMATCH";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly CACHE_ERROR: "CACHE_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
};
/**
 * Error Messages
 */
export declare const ERROR_MESSAGES: Record<string, string>;
/**
 * User Roles
 */
export declare const USER_ROLES: {
    readonly PHARMACIST: "pharmacist";
    readonly PHARMACY_TECHNICIAN: "pharmacy_technician";
    readonly ADMIN: "admin";
};
/**
 * Log Levels
 */
export declare const LOG_LEVELS: {
    readonly DEBUG: "debug";
    readonly INFO: "info";
    readonly WARN: "warn";
    readonly ERROR: "error";
    readonly CRITICAL: "critical";
};
/**
 * HTTP Status Codes
 */
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
    readonly GATEWAY_TIMEOUT: 504;
};
/**
 * API Endpoints
 */
export declare const API_ENDPOINTS: {
    readonly CALCULATE: "/api/v1/calculate";
    readonly HEALTH: "/api/v1/health";
    readonly ANALYTICS: "/api/v1/analytics";
};
