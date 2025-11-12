/**
 * Rate Limiting
 * Token bucket implementation with in-memory burst + Firestore counters
 */
import { Firestore } from 'firebase-admin/firestore';
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /**
     * Maximum requests per window
     */
    maxRequests: number;
    /**
     * Window duration in milliseconds
     */
    windowMs: number;
    /**
     * Burst capacity (in-memory, allows temporary spikes)
     */
    burstCapacity: number;
    /**
     * Token refill rate per second
     */
    refillRate: number;
}
/**
 * Rate limit result
 */
export interface RateLimitResult {
    /**
     * Whether the request is allowed
     */
    allowed: boolean;
    /**
     * Remaining requests in current window
     */
    remaining: number;
    /**
     * When the rate limit resets (Unix timestamp)
     */
    resetAt: number;
    /**
     * Retry after (seconds, if rate limited)
     */
    retryAfter?: number;
}
/**
 * In-memory rate limiter (token bucket)
 * For MVP, we use in-memory only. Future: persist to Firestore for multi-instance support
 */
export declare class RateLimiter {
    private config;
    private buckets;
    constructor(config: RateLimitConfig);
    /**
     * Check if a request should be rate limited
     *
     * @param identifier - User identifier (userId, IP, etc.)
     * @returns Rate limit result
     */
    checkLimit(identifier: string): RateLimitResult;
    /**
     * Cleanup inactive buckets
     */
    private cleanup;
    /**
     * Reset rate limit for a user (admin function)
     *
     * @param identifier - User identifier
     */
    reset(identifier: string): void;
}
/**
 * Create default rate limiter from config
 *
 * @param requestsPerHour - Maximum requests per hour
 * @param burstCapacity - Burst capacity (optional, defaults to 20% of hourly limit)
 * @returns Rate limiter instance
 */
export declare function createRateLimiter(requestsPerHour?: number, burstCapacity?: number): RateLimiter;
/**
 * Firestore-backed rate limiter (for multi-instance support)
 * Future implementation for production
 */
export declare class FirestoreRateLimiter {
    private db;
    private config;
    constructor(db: Firestore, config: RateLimitConfig);
    checkLimit(identifier: string): Promise<RateLimitResult>;
}
