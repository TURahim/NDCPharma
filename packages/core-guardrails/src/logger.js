"use strict";
/**
 * Structured Logging Utility
 * Provides consistent logging across the application with support for GCP Cloud Logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
exports.createLogger = createLogger;
const _core_config_1 = require("@core-config");
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
 */
function formatLogEntry(level, message, context) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...(context && { context }),
    };
    // In production, use structured JSON logging
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
//# sourceMappingURL=logger.js.map