"use strict";
/**
 * Error Handling Middleware
 * Catches and formats errors consistently
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const _core_guardrails_1 = require("@core-guardrails");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'error-middleware' });
/**
 * Error handling middleware
 */
function errorHandler(err, req, res, _next) {
    // Log error
    logger.error('Request error', err, {
        path: req.path,
        method: req.method,
    });
    // Handle AppError instances
    if (err instanceof _core_guardrails_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        });
        return;
    }
    // Handle specific error types
    if (err.name === 'RxCUINotFoundError' || err.name === 'DrugNotFoundError') {
        res.status(404).json({
            success: false,
            error: {
                code: 'DRUG_NOT_FOUND',
                message: err.message || 'Drug not found in database',
            },
        });
        return;
    }
    if (err.name === 'RxNormAPIError' || err.name === 'FDAAPIError') {
        res.status(503).json({
            success: false,
            error: {
                code: 'EXTERNAL_SERVICE_ERROR',
                message: 'External service temporarily unavailable',
            },
        });
        return;
    }
    // Handle generic errors
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal server error occurred',
        },
    });
}
/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=error.js.map