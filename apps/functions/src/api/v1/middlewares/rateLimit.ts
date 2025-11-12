/**
 * Rate Limiting Middleware
 * Limits requests per user/IP
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, createLogger } from '@core-guardrails';
import { API_CONFIG } from '@core-config';

const logger = createLogger({ service: 'rate-limit-middleware' });

// Create rate limiter instance
const rateLimiter = createRateLimiter(
  API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR,
  API_CONFIG.RATE_LIMIT.BURST
);

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use user ID if authenticated, otherwise use IP
  const identifier = req.ip || 'anonymous';
  
  const result = rateLimiter.checkLimit(identifier);
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', API_CONFIG.RATE_LIMIT.REQUESTS_PER_HOUR);
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

