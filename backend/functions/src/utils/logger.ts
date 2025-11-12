/**
 * Structured Logging Utility
 * Provides consistent logging across the application with support for GCP Cloud Logging
 */

import { env } from "../config/environment";
import { LOG_LEVELS } from "../config/constants";

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
 * Log level priorities for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

/**
 * Check if a log level should be logged based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = env.LOG_LEVEL || "info";
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}

/**
 * Format log message as structured JSON for GCP Cloud Logging
 */
function formatLogEntry(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(context && { context }),
  };

  // In production, use structured JSON logging
  // In development, use human-readable format
  if (env.NODE_ENV === "production") {
    return JSON.stringify(logEntry);
  } else {
    const contextStr = context ? `\n  Context: ${JSON.stringify(context, null, 2)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const formattedLog = formatLogEntry(level, message, context);

  switch (level) {
    case LOG_LEVELS.DEBUG:
    case LOG_LEVELS.INFO:
      console.log(formattedLog);
      break;
    case LOG_LEVELS.WARN:
      console.warn(formattedLog);
      break;
    case LOG_LEVELS.ERROR:
    case LOG_LEVELS.CRITICAL:
      console.error(formattedLog);
      break;
  }
}

/**
 * Logger class with convenient methods
 */
export class Logger {
  constructor(private defaultContext?: LogContext) {}

  debug(message: string, context?: LogContext) {
    log(LOG_LEVELS.DEBUG, message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: LogContext) {
    log(LOG_LEVELS.INFO, message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: LogContext) {
    log(LOG_LEVELS.WARN, message, { ...this.defaultContext, ...context });
  }

  error(message: string, error?: Error, context?: LogContext) {
    log(LOG_LEVELS.ERROR, message, {
      ...this.defaultContext,
      ...context,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    });
  }

  critical(message: string, error?: Error, context?: LogContext) {
    log(LOG_LEVELS.CRITICAL, message, {
      ...this.defaultContext,
      ...context,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    });
  }

  /**
   * Log API request
   */
  logRequest(method: string, path: string, context?: LogContext) {
    if (env.ENABLE_REQUEST_LOGGING) {
      this.info(`${method} ${path}`, { ...this.defaultContext, method, path, ...context });
    }
  }

  /**
   * Log API response
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    executionTime: number,
    context?: LogContext
  ) {
    if (env.ENABLE_REQUEST_LOGGING) {
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
  logExternalAPICall(
    service: string,
    endpoint: string,
    method: string,
    statusCode?: number,
    executionTime?: number
  ) {
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
  logCacheOperation(operation: "hit" | "miss" | "set", key: string) {
    this.debug(`Cache ${operation}: ${key}`, {
      ...this.defaultContext,
      cacheOperation: operation,
      cacheKey: key,
    });
  }
}

/**
 * Create a logger instance with optional default context
 */
export function createLogger(defaultContext?: LogContext): Logger {
  return new Logger(defaultContext);
}

/**
 * Default logger instance
 */
export const logger = createLogger();

