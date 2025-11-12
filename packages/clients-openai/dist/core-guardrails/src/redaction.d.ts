/**
 * PHI Redaction Middleware
 * Ensures no Protected Health Information (PHI) appears in logs or cache
 */
/**
 * Redact PHI from a string
 *
 * @param text - Text that may contain PHI
 * @returns Text with PHI redacted
 */
export declare function redactPHI(text: string): string;
/**
 * Redact PHI from an object (deep)
 *
 * @param obj - Object that may contain PHI
 * @returns Object with PHI redacted
 */
export declare function redactObjectPHI<T>(obj: T): T;
/**
 * Create a cache key with PHI redacted
 * Ensures cache keys never contain identifiable information
 *
 * @param parts - Parts of the cache key
 * @returns Safe cache key
 */
export declare function createSafeCacheKey(...parts: (string | number | boolean)[]): string;
/**
 * Compliance mode check
 * When enabled, minimal logging and aggressive PHI filtering
 */
export declare function isComplianceMode(): boolean;
/**
 * Sanitize log context for compliance
 * Removes all potentially sensitive fields
 *
 * @param context - Log context object
 * @returns Sanitized context
 */
export declare function sanitizeLogContext(context: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=redaction.d.ts.map