/**
 * Structured Logging Utility
 * Provides consistent logging across the application with support for GCP Cloud Logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
export interface LogContext {
    userId?: string;
    requestId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    executionTime?: number;
    error?: Error;
    [key: string]: unknown;
}
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
//# sourceMappingURL=logger.d.ts.map