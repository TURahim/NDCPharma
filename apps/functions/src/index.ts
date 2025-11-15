/**
 * NDC Calculator Cloud Functions
 * Main entry point for Firebase Cloud Functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { CalculateRequestSchema, AlternativesRequestSchema } from '@api-contracts';
import { healthCheck } from './api/v1/health';
import { calculateHandler } from './api/v1/calculate';
import { alternativesHandler } from './api/v1/alternatives';
import {
  getSystemAnalytics,
  getUserAnalytics,
  getAPIHealthMetrics,
} from './api/v1/analytics';
import { validateRequest } from './api/v1/middlewares/validate';
import { errorHandler, asyncHandler } from './api/v1/middlewares/error';
import { rateLimitMiddleware } from './api/v1/middlewares/rateLimit';
import { redactionMiddleware } from './api/v1/middlewares/redact';
import { loggingMiddleware } from './api/v1/middlewares/logging';
import { optionalAuth, verifyToken, checkRole, UserRole } from './api/v1/middlewares/auth';
import { getCorsOrigins } from '@core-config';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'functions-main' });

// Initialize Firebase Admin SDK (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
  logger.info('Firebase Admin SDK initialized');
}

// Create Express app
const app = express();

// CORS configuration with Vercel wildcard support
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getCorsOrigins();
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all Vercel preview/production deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Global middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(loggingMiddleware); // Request/response logging with correlation IDs
app.use(redactionMiddleware);

// Public Routes (no authentication required)
app.get('/v1/health', asyncHandler(healthCheck));

// Protected Routes (authentication required)
// Note: For MVP, we're making /v1/calculate require authentication
// In production, you might want to use optionalAuth for anonymous calculations with stricter rate limits
app.post(
  '/v1/calculate',
  asyncHandler(optionalAuth), // Optional auth - allows both authenticated and anonymous users
  asyncHandler(rateLimitMiddleware), // Rate limiting based on auth status
  validateRequest(CalculateRequestSchema),
  asyncHandler(calculateHandler)
);

// Alternatives endpoint (requires authentication)
app.post(
  '/v1/alternatives',
  asyncHandler(verifyToken), // Requires authentication
  asyncHandler(rateLimitMiddleware),
  validateRequest(AlternativesRequestSchema),
  asyncHandler(alternativesHandler)
);

// Analytics endpoints (require authentication)
// System analytics (admin only)
app.get(
  '/v1/analytics/system',
  asyncHandler(verifyToken),
  checkRole([UserRole.ADMIN]),
  asyncHandler(getSystemAnalytics)
);

// User-specific analytics (user can see own, admin can see any)
app.get(
  '/v1/analytics/users/:userId',
  asyncHandler(verifyToken),
  asyncHandler(getUserAnalytics)
);

// API health metrics (admin only)
app.get(
  '/v1/analytics/health',
  asyncHandler(verifyToken),
  checkRole([UserRole.ADMIN]),
  asyncHandler(getAPIHealthMetrics)
);

// Error handling (must be last)
app.use(errorHandler);

// Export Cloud Function
export const api = functions
  .region('us-central1')
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60,
  })
  .https
  .onRequest(app);

logger.info('NDC Calculator functions initialized with authentication');

