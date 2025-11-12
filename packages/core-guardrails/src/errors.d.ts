/**
 * Custom Error Classes
 * Provides typed error handling with status codes and error codes
 */
/**
 * Base application error class
 */
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    details?: unknown | undefined;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean, details?: unknown | undefined);
    toJSON(): {
        error: any;
    };
}
/**
 * Validation Error (400)
 */
export declare class ValidationError extends AppError {
    constructor(message?: string, details?: unknown);
}
/**
 * Invalid Drug Name Error (400)
 */
export declare class InvalidDrugNameError extends AppError {
    constructor(drugName: string);
}
/**
 * Invalid NDC Error (400)
 */
export declare class InvalidNDCError extends AppError {
    constructor(ndc: string);
}
/**
 * Invalid SIG Error (400)
 */
export declare class InvalidSIGError extends AppError {
    constructor(sig: string);
}
/**
 * Invalid Days Supply Error (400)
 */
export declare class InvalidDaysSupplyError extends AppError {
    constructor(daysSupply: number);
}
/**
 * Not Found Error (404)
 */
export declare class NotFoundError extends AppError {
    constructor(message: string, code?: string, details?: unknown);
}
/**
 * Drug Not Found Error (404)
 */
export declare class DrugNotFoundError extends NotFoundError {
    constructor(drugName: string);
}
/**
 * NDC Not Found Error (404)
 */
export declare class NDCNotFoundError extends NotFoundError {
    constructor(rxcui?: string);
}
/**
 * RxCUI Not Found Error (404)
 */
export declare class RxCUINotFoundError extends NotFoundError {
    constructor(drugName: string);
}
/**
 * External API Error (502, 503)
 */
export declare class ExternalAPIError extends AppError {
    constructor(service: string, message?: string, statusCode?: number, details?: unknown);
}
/**
 * RxNorm API Error
 */
export declare class RxNormAPIError extends ExternalAPIError {
    constructor(message?: string, details?: unknown);
}
/**
 * FDA API Error
 */
export declare class FDAAPIError extends ExternalAPIError {
    constructor(message?: string, details?: unknown);
}
/**
 * OpenAI API Error
 */
export declare class OpenAIAPIError extends ExternalAPIError {
    constructor(message?: string, details?: unknown);
}
/**
 * Business Logic Error (422)
 */
export declare class BusinessLogicError extends AppError {
    constructor(message: string, code?: string, details?: unknown);
}
/**
 * Calculation Error
 */
export declare class CalculationError extends BusinessLogicError {
    constructor(message?: string, details?: unknown);
}
/**
 * No Valid Packages Error
 */
export declare class NoValidPackagesError extends BusinessLogicError {
    constructor(details?: unknown);
}
/**
 * Authentication Error (401)
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string, code?: string);
}
/**
 * Authorization Error (403)
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Rate Limit Error (429)
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string, details?: unknown);
}
/**
 * Database Error (500)
 */
export declare class DatabaseError extends AppError {
    constructor(message?: string, details?: unknown);
}
/**
 * Cache Error (500) - Non-critical, log but don't throw
 */
export declare class CacheError extends AppError {
    constructor(message?: string, details?: unknown);
}
/**
 * Type guard to check if error is an AppError
 */
export declare function isAppError(error: unknown): error is AppError;
/**
 * Convert unknown error to AppError
 */
export declare function toAppError(error: unknown): AppError;
