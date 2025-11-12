"use strict";
/**
 * Validation Middleware
 * Validates request bodies against Zod schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
const zod_1 = require("zod");
const _core_guardrails_1 = require("@core-guardrails");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'validation-middleware' });
/**
 * Create validation middleware for a Zod schema
 */
function validateBody(schema) {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.body);
            req.body = validated;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));
                logger.warn('Validation failed', { errors });
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_INPUT',
                        message: 'Request validation failed',
                        details: errors,
                    },
                });
            }
            else {
                next(error);
            }
        }
    };
}
//# sourceMappingURL=validate.js.map