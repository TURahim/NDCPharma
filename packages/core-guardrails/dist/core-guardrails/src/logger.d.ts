/**
 * Structured Logging Utility
 * Provides consistent logging across the application with support for GCP Cloud Logging
 *
 * Features:
 * - Correlation IDs for distributed tracing
 * - GCP Cloud Logging integration (structured JSON)
 * - PHI-safe logging (use with redaction middleware)
 * - Request/response lifecycle tracking
 * - Error tracking with stack traces
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
export interface LogContext {
    userId?: string;
    requestId?: string;
    correlationId?: string;
    traceId?: string;
    spanId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    executionTime?: number;
    error?: Error;
    service?: string;
    [key: string]: unknown;
}
/**
 * Generate a correlation ID for request tracking
 */
export declare function generateCorrelationId(): string;
/**
 * Logger class with convenient methods
 */
export declare class Logger {
    private defaultContext?;
    constructor(defaultContext?: LogContext | undefined);
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, error?: Error, context?: LogContext): void;
    critical(message: string, error?: Error, context?: LogContext): void;
    /**
     * Log API request
     */
    logRequest(method: string, path: string, context?: LogContext): void;
    /**
     * Log API response
     */
    logResponse(method: string, path: string, statusCode: number, executionTime: number, context?: LogContext): void;
    /**
     * Log external API call
     */
    logExternalAPICall(service: string, endpoint: string, method: string, statusCode?: number, executionTime?: number): void;
    /**
     * Log cache hit/miss
     */
    logCacheOperation(operation: "hit" | "miss" | "set", key: string): void;
}
/**
 * Create a logger instance with optional default context
 */
export declare function createLogger(defaultContext?: LogContext): Logger;
/**
 * Default logger instance
 */
export declare const logger: Logger;
