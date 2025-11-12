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
 * Token bucket for a single user
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private capacity: number,
    private refillRate: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  /**
   * Try to consume a token
   * 
   * @returns True if token was consumed, false if bucket empty
   */
  consume(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  /**
   * Get remaining tokens
   */
  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
  
  /**
   * Get time until next token (seconds)
   */
  getRetryAfter(): number {
    if (this.tokens >= 1) return 0;
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }
}

/**
 * In-memory rate limiter (token bucket)
 * For MVP, we use in-memory only. Future: persist to Firestore for multi-instance support
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  
  constructor(private config: RateLimitConfig) {
    this.buckets = new Map();
    
    // Cleanup old buckets every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Check if a request should be rate limited
   * 
   * @param identifier - User identifier (userId, IP, etc.)
   * @returns Rate limit result
   */
  checkLimit(identifier: string): RateLimitResult {
    let bucket = this.buckets.get(identifier);
    
    if (!bucket) {
      bucket = new TokenBucket(
        this.config.burstCapacity,
        this.config.refillRate
      );
      this.buckets.set(identifier, bucket);
    }
    
    const allowed = bucket.consume();
    const remaining = bucket.getRemaining();
    const retryAfter = bucket.getRetryAfter();
    const resetAt = Date.now() + (retryAfter * 1000);
    
    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : retryAfter,
    };
  }
  
  /**
   * Cleanup inactive buckets
   */
  private cleanup(): void {
    // In a full implementation, we'd check last access time
    // For now, clear all buckets periodically
    if (this.buckets.size > 1000) {
      this.buckets.clear();
    }
  }
  
  /**
   * Reset rate limit for a user (admin function)
   * 
   * @param identifier - User identifier
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }
}

/**
 * Create default rate limiter from config
 * 
 * @param requestsPerHour - Maximum requests per hour
 * @param burstCapacity - Burst capacity (optional, defaults to 20% of hourly limit)
 * @returns Rate limiter instance
 */
export function createRateLimiter(
  requestsPerHour: number = 100,
  burstCapacity?: number
): RateLimiter {
  const config: RateLimitConfig = {
    maxRequests: requestsPerHour,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstCapacity: burstCapacity || Math.ceil(requestsPerHour * 0.2),
    refillRate: requestsPerHour / 3600, // tokens per second
  };
  
  return new RateLimiter(config);
}

/**
 * Firestore-backed rate limiter (for multi-instance support)
 * Future implementation for production
 */
export class FirestoreRateLimiter {
  constructor(
    private readonly _db: Firestore,
    private readonly _config: RateLimitConfig
  ) {}
  
  async checkLimit(_identifier: string): Promise<RateLimitResult> {
    void this._db;
    void this._config;
    void _identifier;

    // TODO: Implement Firestore-backed rate limiting
    // For now, throw error to indicate not implemented
    throw new Error('Firestore rate limiting not yet implemented');
  }
}

