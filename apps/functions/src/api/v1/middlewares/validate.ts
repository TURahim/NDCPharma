/**
 * Validation Middleware
 * Validates and sanitizes API requests
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'ValidationMiddleware' });

/**
 * Create validation middleware for a Zod schema
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate and parse request body
      const validated = await schema.parseAsync(req.body);
      
      // Replace request body with validated/sanitized data
      req.body = validated;
      
      logger.debug('Request validation successful', {
        path: req.path,
        method: req.method,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: error.errors,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        });
        return;
      }

      // Unexpected error
      logger.error('Unexpected validation error', error as Error, {
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during validation',
        },
      });
    }
  };
}

/**
 * Sanitize string input to prevent injection attacks
 * @param input Raw string input
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

/**
 * Validate drug name format
 * @param name Drug name
 * @returns True if valid
 */
export function isValidDrugName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 200) {
    return false;
  }
  
  // Allow letters, numbers, spaces, and common pharmaceutical characters
  // eslint-disable-next-line no-useless-escape
  const validPattern = /^[A-Za-z0-9\s\-\/\(\).]+$/;
  return validPattern.test(name);
}

/**
 * Validate RxCUI format
 * @param rxcui RxCUI string
 * @returns True if valid
 */
export function isValidRxCUI(rxcui: string): boolean {
  if (!rxcui) return false;
  
  // RxCUI should be numeric
  const validPattern = /^\d+$/;
  return validPattern.test(rxcui);
}

/**
 * Sanitize and validate drug input
 * @param drug Drug object
 * @returns Sanitized drug object
 */
export function sanitizeDrugInput(drug: { name?: string; rxcui?: string }): {
  name?: string;
  rxcui?: string;
} {
  const sanitized: { name?: string; rxcui?: string } = {};
  
  if (drug.name) {
    const cleanName = sanitizeString(drug.name);
    if (isValidDrugName(cleanName)) {
      sanitized.name = cleanName;
    }
  }
  
  if (drug.rxcui) {
    const cleanRxcui = sanitizeString(drug.rxcui);
    if (isValidRxCUI(cleanRxcui)) {
      sanitized.rxcui = cleanRxcui;
    }
  }
  
  return sanitized;
}

/**
 * Validate numeric range
 * @param value Value to validate
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns True if valid
 */
export function isWithinRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}
