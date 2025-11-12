/**
 * NDC Calculator Cloud Functions
 * Main entry point for Firebase Cloud Functions
 */

import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { CalculateRequestSchema } from '@api-contracts';
import { healthCheck } from './api/v1/health';
import { calculateHandler } from './api/v1/calculate';
import { validateBody } from './api/v1/middlewares/validate';
import { errorHandler } from './api/v1/middlewares/error';
import { rateLimitMiddleware } from './api/v1/middlewares/rateLimit';
import { redactionMiddleware } from './api/v1/middlewares/redact';
import { getCorsOrigins } from '@core-config';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'functions-main' });

// Create Express app
const app = express();

// Global middlewares
app.use(helmet());
app.use(cors({ origin: getCorsOrigins() }));
app.use(express.json());
app.use(redactionMiddleware);

// Routes
app.get('/v1/health', healthCheck);

app.post(
  '/v1/calculate',
  rateLimitMiddleware,
  validateBody(CalculateRequestSchema),
  calculateHandler
);

// Error handling
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

logger.info('NDC Calculator functions initialized');

