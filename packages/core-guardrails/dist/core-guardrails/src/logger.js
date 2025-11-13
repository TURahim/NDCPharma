"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
exports.generateCorrelationId = generateCorrelationId;
exports.createLogger = createLogger;
const _core_config_1 = require("@core-config");
const crypto_1 = require("crypto");
/**
 * GCP Cloud Logging severity levels
 * Maps to: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
 */
const GCP_SEVERITY_MAP = {
    debug: "DEBUG",
    info: "INFO",
    warn: "WARNING",
    error: "ERROR",
    critical: "CRITICAL",
};
/**
 * Generate a correlation ID for request tracking
 */
function generateCorrelationId() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Log level priorities for filtering
 */
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    critical: 4,
};
/**
 * Check if a log level should be logged based on current configuration
 */
function shouldLog(level) {
    const currentLevel = _core_config_1.env.LOG_LEVEL || "info";
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}
/**
 * Format log message as structured JSON for GCP Cloud Logging
 * Follows GCP Cloud Logging JSON format: https://cloud.google.com/logging/docs/structured-logging
 */
function formatLogEntry(level, message, context) {
    const timestamp = new Date().toISOString();
    // GCP Cloud Logging structured format
    const logEntry = {
        timestamp,
        severity: GCP_SEVERITY_MAP[level], // GCP-compatible severity
        message,
        // Add GCP trace context if available
        ...(context?.traceId && {
            "logging.googleapis.com/trace": `projects/${_core_config_1.env.GCP_PROJECT_ID || "ndcpharma-8f3c6"}/traces/${context.traceId}`,
        }),
        ...(context?.spanId && {
            "logging.googleapis.com/spanId": context.spanId,
        }),
        // Add correlation/request ID for distributed tracing
        ...(context?.correlationId && { correlationId: context.correlationId }),
        ...(context?.requestId && { requestId: context.requestId }),
        // Add service context
        ...(context?.service && { serviceContext: { service: context.service } }),
        // Add all other context
        ...(context && {
            context: Object.fromEntries(Object.entries(context).filter(([key]) => !["traceId", "spanId", "correlationId", "requestId", "service"].includes(key))),
        }),
    };
    // In production, use structured JSON logging (for GCP Cloud Logging)
    // In development, use human-readable format
    if (_core_config_1.env.NODE_ENV === "production") {
        return JSON.stringify(logEntry);
    }
    else {
        const contextStr = context ? `\n  Context: ${JSON.stringify(context, null, 2)}` : "";
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }
}
/**
 * Core logging function
 */
function log(level, message, context) {
    if (!shouldLog(level)) {
        return;
    }
    const formattedLog = formatLogEntry(level, message, context);
    switch (level) {
        case _core_config_1.LOG_LEVELS.DEBUG:
        case _core_config_1.LOG_LEVELS.INFO:
            console.log(formattedLog);
            break;
        case _core_config_1.LOG_LEVELS.WARN:
            console.warn(formattedLog);
            break;
        case _core_config_1.LOG_LEVELS.ERROR:
        case _core_config_1.LOG_LEVELS.CRITICAL:
            console.error(formattedLog);
            break;
    }
}
/**
 * Logger class with convenient methods
 */
class Logger {
    constructor(defaultContext) {
        this.defaultContext = defaultContext;
    }
    debug(message, context) {
        log(_core_config_1.LOG_LEVELS.DEBUG, message, { ...this.defaultContext, ...context });
    }
    info(message, context) {
        log(_core_config_1.LOG_LEVELS.INFO, message, { ...this.defaultContext, ...context });
    }
    warn(message, context) {
        log(_core_config_1.LOG_LEVELS.WARN, message, { ...this.defaultContext, ...context });
    }
    error(message, error, context) {
        log(_core_config_1.LOG_LEVELS.ERROR, message, {
            ...this.defaultContext,
            ...context,
            error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
        });
    }
    critical(message, error, context) {
        log(_core_config_1.LOG_LEVELS.CRITICAL, message, {
            ...this.defaultContext,
            ...context,
            error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
        });
    }
    /**
     * Log API request
     */
    logRequest(method, path, context) {
        if (_core_config_1.env.ENABLE_REQUEST_LOGGING) {
            this.info(`${method} ${path}`, { ...this.defaultContext, method, path, ...context });
        }
    }
    /**
     * Log API response
     */
    logResponse(method, path, statusCode, executionTime, context) {
        if (_core_config_1.env.ENABLE_REQUEST_LOGGING) {
            this.info(`${method} ${path} - ${statusCode} (${executionTime}ms)`, {
                ...this.defaultContext,
                method,
                path,
                statusCode,
                executionTime,
                ...context,
            });
        }
    }
    /**
     * Log external API call
     */
    logExternalAPICall(service, endpoint, method, statusCode, executionTime) {
        this.debug(`External API call: ${service} ${method} ${endpoint}`, {
            ...this.defaultContext,
            service,
            endpoint,
            method,
            statusCode,
            executionTime,
        });
    }
    /**
     * Log cache hit/miss
     */
    logCacheOperation(operation, key) {
        this.debug(`Cache ${operation}: ${key}`, {
            ...this.defaultContext,
            cacheOperation: operation,
            cacheKey: key,
        });
    }
}
exports.Logger = Logger;
/**
 * Create a logger instance with optional default context
 */
function createLogger(defaultContext) {
    return new Logger(defaultContext);
}
/**
 * Default logger instance
 */
exports.logger = createLogger();
