"use strict";
/**
 * Redaction Middleware
 * Ensures no PHI in logs or responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactionMiddleware = redactionMiddleware;
const _core_guardrails_1 = require("@core-guardrails");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'redaction-middleware' });
/**
 * Request logging with PHI redaction
 */
function redactionMiddleware(req, res, next) {
    // Sanitize request context for logging
    const context = (0, _core_guardrails_1.sanitizeLogContext)({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    logger.info('Request received', context);
    // Capture response time
    const startTime = Date.now();
    // Hook into response finish
    res.on('finish', () => {
        const executionTime = Date.now() - startTime;
        const responseContext = (0, _core_guardrails_1.sanitizeLogContext)({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            executionTime,
        });
        logger.info('Request completed', responseContext);
    });
    next();
}
//# sourceMappingURL=redact.js.map