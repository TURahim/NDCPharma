/**
 * Request/Response Logging Middleware
 * 
 * Features:
 * - Logs all incoming requests and outgoing responses
 * - Correlation IDs for distributed tracing
 * - PHI/PII redaction (leverages @core-guardrails/redaction)
 * - Execution time tracking
 * - Error tracking
 * - GCP Cloud Logging integration
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger, generateCorrelationId, LogContext } from '@core-guardrails';
import { AuthenticatedRequest } from './auth';

const logger = createLogger({ service: 'request-logger' });

/**
 * Extract correlation ID from request headers or generate new one
 */
function getCorrelationId(req: Request): string {
  // Check for existing correlation ID in headers
  const existingId = 
    req.headers['x-correlation-id'] || 
    req.headers['x-request-id'] ||
    req.headers['x-trace-id'];
  
  if (existingId && typeof existingId === 'string') {
    return existingId;
  }
  
  // Generate new correlation ID
  return generateCorrelationId();
}

/**
 * Extract GCP trace context from headers
 * Format: "projects/[PROJECT_ID]/traces/[TRACE_ID]"
 */
function getGCPTraceContext(req: Request): { traceId?: string; spanId?: string } {
  const traceHeader = req.headers['x-cloud-trace-context'];
  
  if (!traceHeader || typeof traceHeader !== 'string') {
    return {};
  }
  
  // Parse: "TRACE_ID/SPAN_ID;o=TRACE_TRUE"
  const [trace, span] = traceHeader.split(';')[0].split('/');
  
  return {
    traceId: trace,
    spanId: span,
  };
}

/**
 * Redact sensitive data from request body for logging
 * This is a simple implementation - extend as needed
 */
function redactRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const redacted = { ...body };
  
  // Redact common sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'ssn',
    'social_security_number',
    'credit_card',
    'creditCard',
  ];
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  // Note: Drug names are NOT PHI by themselves (they're public knowledge)
  // Only patient-specific data is PHI
  
  return redacted;
}

/**
 * Request/Response Logging Middleware
 * 
 * Attaches correlation ID to request and logs request/response lifecycle
 */
export function loggingMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  
  // Extract or generate correlation ID
  const correlationId = getCorrelationId(req);
  const { traceId, spanId } = getGCPTraceContext(req);
  
  // Attach correlation ID to request for downstream use
  (req as any).correlationId = correlationId;
  (req as any).traceId = traceId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  if (traceId) {
    res.setHeader('X-Trace-ID', traceId);
  }
  
  // Build log context
  const logContext: LogContext = {
    correlationId,
    traceId,
    spanId,
    method: req.method,
    path: req.path,
    userId: req.user?.uid,
    userRole: req.user?.role,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
  
  // Log incoming request
  logger.info('Incoming request', {
    ...logContext,
    body: redactRequestBody(req.body),
    query: req.query,
  });
  
  // Capture original res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const executionTime = Date.now() - startTime;
    
    // Log response
    logger.info('Outgoing response', {
      ...logContext,
      statusCode: res.statusCode,
      executionTime,
      responseSize: JSON.stringify(body).length,
    });
    
    // Add execution time header
    res.setHeader('X-Execution-Time', `${executionTime}ms`);
    
    return originalJson(body);
  };
  
  // Capture response finish event for non-JSON responses
  res.on('finish', () => {
    // Only log if json() wasn't called (already logged above)
    if (!res.headersSent || res.getHeader('Content-Type')?.toString().includes('json')) {
      return;
    }
    
    const executionTime = Date.now() - startTime;
    
    logger.info('Request completed', {
      ...logContext,
      statusCode: res.statusCode,
      executionTime,
    });
  });
  
  // Capture errors
  const originalNext = next;
  next = function (err?: any) {
    if (err) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Request error', err, {
        ...logContext,
        executionTime,
        errorName: err?.name,
        errorMessage: err?.message,
      });
    }
    
    originalNext(err);
  };
  
  next();
}

/**
 * Create a child logger with correlation ID context
 * Use this in handlers to maintain correlation throughout the request lifecycle
 */
export function getRequestLogger(req: Request): ReturnType<typeof createLogger> {
  const correlationId = (req as any).correlationId;
  const traceId = (req as any).traceId;
  
  return createLogger({
    correlationId,
    traceId,
    service: 'ndc-calculator',
  });
}

