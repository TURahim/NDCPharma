/**
 * Validation Middleware
 * Validates request bodies against Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'validation-middleware' });

/**
 * Create validation middleware for a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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
      } else {
        next(error);
      }
    }
  };
}

