/**
 * Custom Error Classes
 * Provides typed error handling with status codes and error codes
 */

import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from "@core-config";

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public code: string = ERROR_CODES.INTERNAL_ERROR,
    public isOperational: boolean = true,
    public details?: unknown
  ) {
    super(message);
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

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(message?: string, details?: unknown) {
    super(
      message || ERROR_MESSAGES[ERROR_CODES.INVALID_INPUT],
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
      true,
      details
    );
  }
}

/**
 * Invalid Drug Name Error (400)
 */
export class InvalidDrugNameError extends AppError {
  constructor(drugName: string) {
    super(
      ERROR_MESSAGES[ERROR_CODES.INVALID_DRUG_NAME],
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_DRUG_NAME,
      true,
      { drugName }
    );
  }
}

/**
 * Invalid NDC Error (400)
 */
export class InvalidNDCError extends AppError {
  constructor(ndc: string) {
    super(
      ERROR_MESSAGES[ERROR_CODES.INVALID_NDC],
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_NDC,
      true,
      { ndc }
    );
  }
}

/**
 * Invalid SIG Error (400)
 */
export class InvalidSIGError extends AppError {
  constructor(sig: string) {
    super(
      ERROR_MESSAGES[ERROR_CODES.INVALID_SIG],
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_SIG,
      true,
      { sig }
    );
  }
}

/**
 * Invalid Days Supply Error (400)
 */
export class InvalidDaysSupplyError extends AppError {
  constructor(daysSupply: number) {
    super(
      ERROR_MESSAGES[ERROR_CODES.INVALID_DAYS_SUPPLY],
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_DAYS_SUPPLY,
      true,
      { daysSupply }
    );
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: string = ERROR_CODES.DRUG_NOT_FOUND, details?: unknown) {
    super(message, HTTP_STATUS.NOT_FOUND, code, true, details);
  }
}

/**
 * Drug Not Found Error (404)
 */
export class DrugNotFoundError extends NotFoundError {
  constructor(drugName: string) {
    super(ERROR_MESSAGES[ERROR_CODES.DRUG_NOT_FOUND], ERROR_CODES.DRUG_NOT_FOUND, { drugName });
  }
}

/**
 * NDC Not Found Error (404)
 */
export class NDCNotFoundError extends NotFoundError {
  constructor(rxcui?: string) {
    super(ERROR_MESSAGES[ERROR_CODES.NDC_NOT_FOUND], ERROR_CODES.NDC_NOT_FOUND, { rxcui });
  }
}

/**
 * RxCUI Not Found Error (404)
 */
export class RxCUINotFoundError extends NotFoundError {
  constructor(drugName: string) {
    super(ERROR_MESSAGES[ERROR_CODES.RXCUI_NOT_FOUND], ERROR_CODES.RXCUI_NOT_FOUND, { drugName });
  }
}

/**
 * External API Error (502, 503)
 */
export class ExternalAPIError extends AppError {
  constructor(
    service: string,
    message?: string,
    statusCode: number = HTTP_STATUS.BAD_GATEWAY,
    details?: unknown
  ) {
    const code = `${service.toUpperCase()}_API_ERROR`;
    super(
      message || ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || `${service} API error`,
      statusCode,
      code,
      true,
      details
    );
  }
}

/**
 * RxNorm API Error
 */
export class RxNormAPIError extends ExternalAPIError {
  constructor(message?: string, details?: unknown) {
    super(
      "RxNorm",
      message || ERROR_MESSAGES[ERROR_CODES.RXNORM_API_ERROR],
      HTTP_STATUS.BAD_GATEWAY,
      details
    );
    this.code = ERROR_CODES.RXNORM_API_ERROR;
  }
}

/**
 * FDA API Error
 */
export class FDAAPIError extends ExternalAPIError {
  constructor(message?: string, details?: unknown) {
    super(
      "FDA",
      message || ERROR_MESSAGES[ERROR_CODES.FDA_API_ERROR],
      HTTP_STATUS.BAD_GATEWAY,
      details
    );
    this.code = ERROR_CODES.FDA_API_ERROR;
  }
}

/**
 * OpenAI API Error
 */
export class OpenAIAPIError extends ExternalAPIError {
  constructor(message?: string, details?: unknown) {
    super(
      "OpenAI",
      message || ERROR_MESSAGES[ERROR_CODES.OPENAI_API_ERROR],
      HTTP_STATUS.BAD_GATEWAY,
      details
    );
    this.code = ERROR_CODES.OPENAI_API_ERROR;
  }
}

/**
 * Business Logic Error (422)
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, code: string = ERROR_CODES.CALCULATION_ERROR, details?: unknown) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, code, true, details);
  }
}

/**
 * Calculation Error
 */
export class CalculationError extends BusinessLogicError {
  constructor(message?: string, details?: unknown) {
    super(
      message || ERROR_MESSAGES[ERROR_CODES.CALCULATION_ERROR],
      ERROR_CODES.CALCULATION_ERROR,
      details
    );
  }
}

/**
 * No Valid Packages Error
 */
export class NoValidPackagesError extends BusinessLogicError {
  constructor(details?: unknown) {
    super(
      ERROR_MESSAGES[ERROR_CODES.NO_VALID_PACKAGES],
      ERROR_CODES.NO_VALID_PACKAGES,
      details
    );
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message?: string, code: string = ERROR_CODES.UNAUTHORIZED) {
    super(
      message || ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED],
      HTTP_STATUS.UNAUTHORIZED,
      code,
      true
    );
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message?: string) {
    super(
      message || ERROR_MESSAGES[ERROR_CODES.FORBIDDEN],
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
      true
    );
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends AppError {
  constructor(message?: string, details?: unknown) {
    super(
      message || ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED],
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      true,
      details
    );
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends AppError {
  constructor(message?: string, details?: unknown) {
    super(
      message || ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
      false,
      details
    );
  }
}

/**
 * Cache Error (500) - Non-critical, log but don't throw
 */
export class CacheError extends AppError {
  constructor(message?: string, details?: unknown) {
    super(
      message || ERROR_MESSAGES[ERROR_CODES.CACHE_ERROR],
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.CACHE_ERROR,
      true,
      details
    );
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, false);
  }

  return new AppError(
    "An unexpected error occurred",
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_ERROR,
    false
  );
}

