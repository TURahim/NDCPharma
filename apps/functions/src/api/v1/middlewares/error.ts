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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

