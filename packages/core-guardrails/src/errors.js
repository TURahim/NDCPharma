"use strict";
/**
 * Custom Error Classes
 * Provides typed error handling with status codes and error codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheError = exports.DatabaseError = exports.RateLimitError = exports.AuthorizationError = exports.AuthenticationError = exports.NoValidPackagesError = exports.CalculationError = exports.BusinessLogicError = exports.OpenAIAPIError = exports.FDAAPIError = exports.RxNormAPIError = exports.ExternalAPIError = exports.RxCUINotFoundError = exports.NDCNotFoundError = exports.DrugNotFoundError = exports.NotFoundError = exports.InvalidDaysSupplyError = exports.InvalidSIGError = exports.InvalidNDCError = exports.InvalidDrugNameError = exports.ValidationError = exports.AppError = void 0;
exports.isAppError = isAppError;
exports.toAppError = toAppError;
const _core_config_1 = require("@core-config");
/**
 * Base application error class
 */
class AppError extends Error {
    constructor(message, statusCode = _core_config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, code = _core_config_1.ERROR_CODES.INTERNAL_ERROR, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                statusCode: this.statusCode,
                ...(this.details !== undefined ? { details: this.details } : {}),
            },
        };
    }
}
exports.AppError = AppError;
/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
    constructor(message, details) {
        super(message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.INVALID_INPUT], _core_config_1.HTTP_STATUS.BAD_REQUEST, _core_config_1.ERROR_CODES.INVALID_INPUT, true, details);
    }
}
exports.ValidationError = ValidationError;
/**
 * Invalid Drug Name Error (400)
 */
class InvalidDrugNameError extends AppError {
    constructor(drugName) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.INVALID_DRUG_NAME], _core_config_1.HTTP_STATUS.BAD_REQUEST, _core_config_1.ERROR_CODES.INVALID_DRUG_NAME, true, { drugName });
    }
}
exports.InvalidDrugNameError = InvalidDrugNameError;
/**
 * Invalid NDC Error (400)
 */
class InvalidNDCError extends AppError {
    constructor(ndc) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.INVALID_NDC], _core_config_1.HTTP_STATUS.BAD_REQUEST, _core_config_1.ERROR_CODES.INVALID_NDC, true, { ndc });
    }
}
exports.InvalidNDCError = InvalidNDCError;
/**
 * Invalid SIG Error (400)
 */
class InvalidSIGError extends AppError {
    constructor(sig) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.INVALID_SIG], _core_config_1.HTTP_STATUS.BAD_REQUEST, _core_config_1.ERROR_CODES.INVALID_SIG, true, { sig });
    }
}
exports.InvalidSIGError = InvalidSIGError;
/**
 * Invalid Days Supply Error (400)
 */
class InvalidDaysSupplyError extends AppError {
    constructor(daysSupply) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.INVALID_DAYS_SUPPLY], _core_config_1.HTTP_STATUS.BAD_REQUEST, _core_config_1.ERROR_CODES.INVALID_DAYS_SUPPLY, true, { daysSupply });
    }
}
exports.InvalidDaysSupplyError = InvalidDaysSupplyError;
/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
    constructor(message, code = _core_config_1.ERROR_CODES.DRUG_NOT_FOUND, details) {
        super(message, _core_config_1.HTTP_STATUS.NOT_FOUND, code, true, details);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Drug Not Found Error (404)
 */
class DrugNotFoundError extends NotFoundError {
    constructor(drugName) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.DRUG_NOT_FOUND], _core_config_1.ERROR_CODES.DRUG_NOT_FOUND, { drugName });
    }
}
exports.DrugNotFoundError = DrugNotFoundError;
/**
 * NDC Not Found Error (404)
 */
class NDCNotFoundError extends NotFoundError {
    constructor(rxcui) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.NDC_NOT_FOUND], _core_config_1.ERROR_CODES.NDC_NOT_FOUND, { rxcui });
    }
}
exports.NDCNotFoundError = NDCNotFoundError;
/**
 * RxCUI Not Found Error (404)
 */
class RxCUINotFoundError extends NotFoundError {
    constructor(drugName) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.RXCUI_NOT_FOUND], _core_config_1.ERROR_CODES.RXCUI_NOT_FOUND, { drugName });
    }
}
exports.RxCUINotFoundError = RxCUINotFoundError;
/**
 * External API Error (502, 503)
 */
class ExternalAPIError extends AppError {
    constructor(service, message, statusCode = _core_config_1.HTTP_STATUS.BAD_GATEWAY, details) {
        const code = `${service.toUpperCase()}_API_ERROR`;
        super(message || _core_config_1.ERROR_MESSAGES[code] || `${service} API error`, statusCode, code, true, details);
    }
}
exports.ExternalAPIError = ExternalAPIError;
/**
 * RxNorm API Error
 */
class RxNormAPIError extends ExternalAPIError {
    constructor(message, details) {
        super("RxNorm", message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.RXNORM_API_ERROR], _core_config_1.HTTP_STATUS.BAD_GATEWAY, details);
        this.code = _core_config_1.ERROR_CODES.RXNORM_API_ERROR;
    }
}
exports.RxNormAPIError = RxNormAPIError;
/**
 * FDA API Error
 */
class FDAAPIError extends ExternalAPIError {
    constructor(message, details) {
        super("FDA", message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.FDA_API_ERROR], _core_config_1.HTTP_STATUS.BAD_GATEWAY, details);
        this.code = _core_config_1.ERROR_CODES.FDA_API_ERROR;
    }
}
exports.FDAAPIError = FDAAPIError;
/**
 * OpenAI API Error
 */
class OpenAIAPIError extends ExternalAPIError {
    constructor(message, details) {
        super("OpenAI", message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.OPENAI_API_ERROR], _core_config_1.HTTP_STATUS.BAD_GATEWAY, details);
        this.code = _core_config_1.ERROR_CODES.OPENAI_API_ERROR;
    }
}
exports.OpenAIAPIError = OpenAIAPIError;
/**
 * Business Logic Error (422)
 */
class BusinessLogicError extends AppError {
    constructor(message, code = _core_config_1.ERROR_CODES.CALCULATION_ERROR, details) {
        super(message, _core_config_1.HTTP_STATUS.UNPROCESSABLE_ENTITY, code, true, details);
    }
}
exports.BusinessLogicError = BusinessLogicError;
/**
 * Calculation Error
 */
class CalculationError extends BusinessLogicError {
    constructor(message, details) {
        super(message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.CALCULATION_ERROR], _core_config_1.ERROR_CODES.CALCULATION_ERROR, details);
    }
}
exports.CalculationError = CalculationError;
/**
 * No Valid Packages Error
 */
class NoValidPackagesError extends BusinessLogicError {
    constructor(details) {
        super(_core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.NO_VALID_PACKAGES], _core_config_1.ERROR_CODES.NO_VALID_PACKAGES, details);
    }
}
exports.NoValidPackagesError = NoValidPackagesError;
/**
 * Authentication Error (401)
 */
class AuthenticationError extends AppError {
    constructor(message, code = _core_config_1.ERROR_CODES.UNAUTHORIZED) {
        super(message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.UNAUTHORIZED], _core_config_1.HTTP_STATUS.UNAUTHORIZED, code, true);
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization Error (403)
 */
class AuthorizationError extends AppError {
    constructor(message) {
        super(message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.FORBIDDEN], _core_config_1.HTTP_STATUS.FORBIDDEN, _core_config_1.ERROR_CODES.FORBIDDEN, true);
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Rate Limit Error (429)
 */
class RateLimitError extends AppError {
    constructor(message, details) {
        super(message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.RATE_LIMIT_EXCEEDED], _core_config_1.HTTP_STATUS.TOO_MANY_REQUESTS, _core_config_1.ERROR_CODES.RATE_LIMIT_EXCEEDED, true, details);
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Database Error (500)
 */
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.DATABASE_ERROR], _core_config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, _core_config_1.ERROR_CODES.DATABASE_ERROR, false, details);
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Cache Error (500) - Non-critical, log but don't throw
 */
class CacheError extends AppError {
    constructor(message, details) {
        super(message || _core_config_1.ERROR_MESSAGES[_core_config_1.ERROR_CODES.CACHE_ERROR], _core_config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, _core_config_1.ERROR_CODES.CACHE_ERROR, true, details);
    }
}
exports.CacheError = CacheError;
/**
 * Type guard to check if error is an AppError
 */
function isAppError(error) {
    return error instanceof AppError;
}
/**
 * Convert unknown error to AppError
 */
function toAppError(error) {
    if (isAppError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return new AppError(error.message, _core_config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, _core_config_1.ERROR_CODES.INTERNAL_ERROR, false);
    }
    return new AppError("An unexpected error occurred", _core_config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, _core_config_1.ERROR_CODES.INTERNAL_ERROR, false);
}
//# sourceMappingURL=errors.js.map