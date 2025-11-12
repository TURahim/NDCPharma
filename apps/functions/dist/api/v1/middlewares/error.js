"use strict";
/**
 * Error Handling Middleware
 * Catches and formats errors consistently
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const _core_guardrails_1 = require("@core-guardrails");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'error-middleware' });
/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
    // Log error
    logger.error('Request error', {
        error: err.message,
        stack: err.stack,
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
    // Handle generic errors
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal server error occurred',
        },
    });
}
//# sourceMappingURL=error.js.map