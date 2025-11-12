/**
 * Error Handling Middleware
 * Catches and formats errors consistently
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'error-middleware' });

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Request error', err, {
    path: req.path,
    method: req.method,
  });
  
  // Handle AppError instances
  if (err instanceof AppError) {
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

