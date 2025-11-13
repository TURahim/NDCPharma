/**
 * NDC Calculator Cloud Functions
 * Main entry point for Firebase Cloud Functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { CalculateRequestSchema } from '@api-contracts';
import { healthCheck } from './api/v1/health';
import { calculateHandler } from './api/v1/calculate';
import { validateRequest } from './api/v1/middlewares/validate';
import { errorHandler, asyncHandler } from './api/v1/middlewares/error';
import { rateLimitMiddleware } from './api/v1/middlewares/rateLimit';
import { redactionMiddleware } from './api/v1/middlewares/redact';
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

// Global middlewares
app.use(helmet());
app.use(cors({ origin: getCorsOrigins() }));
app.use(express.json());
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

// Example: Admin-only endpoint (commented out for now)
// app.get(
//   '/v1/admin/users',
//   asyncHandler(verifyToken),
//   checkRole([UserRole.ADMIN]),
//   asyncHandler(adminUsersHandler)
// );

// Example: Pharmacist or Admin endpoint
// app.get(
//   '/v1/reports',
//   asyncHandler(verifyToken),
//   checkRole([UserRole.PHARMACIST, UserRole.ADMIN]),
//   asyncHandler(reportsHandler)
// );

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

