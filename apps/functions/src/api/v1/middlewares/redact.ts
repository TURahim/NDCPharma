/**
 * Redaction Middleware
 * Ensures no PHI in logs or responses
 */

import { Request, Response, NextFunction } from 'express';
import { sanitizeLogContext, createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'redaction-middleware' });

/**
 * Request logging with PHI redaction
 */
export function redactionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Sanitize request context for logging
  const context = sanitizeLogContext({
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
    
    const responseContext = sanitizeLogContext({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      executionTime,
    });
    
    logger.info('Request completed', responseContext);
  });
  
  next();
}

