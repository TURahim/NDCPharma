/**
 * Rate Limiting Middleware
 * Per-user and per-role rate limiting with Firestore tracking
 */

import { Response, NextFunction } from 'express';
import { createLogger } from '@core-guardrails';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest, UserRole } from './auth';

const logger = createLogger({ service: 'rate-limit-middleware' });

/**
 * Rate limits by role (requests per hour)
 */
const RATE_LIMITS: Record<UserRole | 'anonymous', number> = {
  [UserRole.ADMIN]: Number.MAX_SAFE_INTEGER, // Unlimited
  [UserRole.PHARMACIST]: 200,
  [UserRole.PHARMACY_TECHNICIAN]: 100,
  anonymous: 100, // Increased for development/testing (was 10)
};

/**
 * Check and update rate limit for authenticated user using Firestore
 */
async function checkUserRateLimit(
  userId: string,
  role: UserRole
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; retryAfter?: number }> {
  const db = admin.firestore();
  const activityRef = db.collection('userActivity').doc(userId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const activityDoc = await transaction.get(activityRef);
      
      // If document doesn't exist, create it
      if (!activityDoc.exists) {
        const now = new Date();
        const resetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        
        transaction.set(activityRef, {
          userId,
          role,
          currentHourRequests: 1,
          totalRequests: 1,
          rateLimitResets: admin.firestore.Timestamp.fromDate(resetAt),
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        const limit = RATE_LIMITS[role];
        return {
          allowed: true,
          remaining: limit - 1,
          resetAt,
        };
      }

      const data = activityDoc.data()!;
      const now = new Date();
      const resetAt = data.rateLimitResets.toDate();

      // Check if we need to reset the counter
      if (now >= resetAt) {
        // Reset counter for new hour
        const newResetAt = new Date(now.getTime() + 60 * 60 * 1000);
        
        transaction.update(activityRef, {
          currentHourRequests: 1,
          totalRequests: admin.firestore.FieldValue.increment(1),
          rateLimitResets: admin.firestore.Timestamp.fromDate(newResetAt),
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const limit = RATE_LIMITS[role];
        return {
          allowed: true,
          remaining: limit - 1,
          resetAt: newResetAt,
        };
      }

      // Check current count against limit
      const currentCount = data.currentHourRequests || 0;
      const limit = RATE_LIMITS[role];

      if (currentCount >= limit) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      // Increment counter
      transaction.update(activityRef, {
        currentHourRequests: admin.firestore.FieldValue.increment(1),
        totalRequests: admin.firestore.FieldValue.increment(1),
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        allowed: true,
        remaining: limit - currentCount - 1,
        resetAt,
      };
    });

    return result;
  } catch (error) {
    logger.error('Error checking rate limit', error as Error, { userId, role });
    // Fail open - allow request if rate limit check fails
    return {
      allowed: true,
      remaining: RATE_LIMITS[role],
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}

/**
 * Simple in-memory rate limiting for anonymous/IP-based requests
 */
const anonymousLimits = new Map<string, { count: number; resetAt: Date }>();

function checkAnonymousRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
} {
  const now = new Date();
  const limit = RATE_LIMITS.anonymous;
  
  let record = anonymousLimits.get(ip);
  
  // Reset if expired or doesn't exist
  if (!record || now >= record.resetAt) {
    const resetAt = new Date(now.getTime() + 60 * 60 * 1000);
    record = { count: 0, resetAt };
    anonymousLimits.set(ip, record);
  }

  // Check limit
  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfter,
    };
  }

  // Increment and return
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Rate limiting middleware with per-user and per-role limits
 * 
 * For authenticated users: Uses Firestore to track per-user rate limits
 * For anonymous users: Uses in-memory tracking per IP address
 * 
 * Rate limits by role:
 * - admin: Unlimited
 * - pharmacist: 200 requests/hour
 * - pharmacy_technician: 100 requests/hour
 * - anonymous: 10 requests/hour
 */
export async function rateLimitMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let result: {
      allowed: boolean;
      remaining: number;
      resetAt: Date;
      retryAfter?: number;
    };

    let limit: number;
    let identifier: string;

    // Check if user is authenticated
    if (req.user) {
      // Authenticated user - use Firestore-based rate limiting
      identifier = req.user.uid;
      const role = req.user.role || UserRole.PHARMACY_TECHNICIAN; // Default to most restrictive
      limit = RATE_LIMITS[role];

      // Admins have unlimited access
      if (role === UserRole.ADMIN) {
        logger.debug('Admin user - bypassing rate limit', { uid: req.user.uid });
        next();
        return;
      }

      result = await checkUserRateLimit(req.user.uid, role);
      
      logger.debug('User rate limit check', {
        uid: req.user.uid,
        role,
        allowed: result.allowed,
        remaining: result.remaining,
      });
    } else {
      // Anonymous user - use IP-based rate limiting
      identifier = req.ip || 'unknown';
      limit = RATE_LIMITS.anonymous;
      result = checkAnonymousRateLimit(identifier);
      
      logger.debug('Anonymous rate limit check', {
        ip: identifier,
        allowed: result.allowed,
        remaining: result.remaining,
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        identifier,
        retryAfter: result.retryAfter,
        authenticated: !!req.user,
      });

      if (result.retryAfter) {
        res.setHeader('Retry-After', result.retryAfter.toString());
      }

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
          details: {
            limit,
            resetAt: result.resetAt.toISOString(),
            retryAfter: result.retryAfter,
          },
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Rate limit middleware error', error as Error);
    // Fail open - allow request if middleware errors
    next();
  }
}

