"use strict";
/**
 * Rate Limiting Middleware
 * Limits requests per user/IP
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = rateLimitMiddleware;
const _core_guardrails_1 = require("@core-guardrails");
const _core_config_1 = require("@core-config");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'rate-limit-middleware' });
// Create rate limiter instance
const rateLimiter = (0, _core_guardrails_1.createRateLimiter)(_core_config_1.API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR, _core_config_1.API_CONFIG.RATE_LIMIT.BURST);
/**
 * Rate limiting middleware
 */
function rateLimitMiddleware(req, res, next) {
    // Use user ID if authenticated, otherwise use IP
    const identifier = req.ip || 'anonymous';
    const result = rateLimiter.checkLimit(identifier);
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', _core_config_1.API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);
    if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
            identifier,
            retryAfter: result.retryAfter,
        });
        res.setHeader('Retry-After', result.retryAfter || 60);
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Rate limit exceeded. Please try again later.',
                details: {
                    retryAfter: result.retryAfter,
                },
            },
        });
        return;
    }
    next();
}
//# sourceMappingURL=rateLimit.js.map