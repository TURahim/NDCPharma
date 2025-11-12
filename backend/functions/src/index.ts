/**
 * Main Entry Point for Firebase Cloud Functions
 * NDC Packaging & Quantity Calculator Backend
 */

import * as functions from "firebase-functions";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { initializeFirebase } from "./config/firebase";
import { getCorsOrigins, env } from "./config/environment";
import { logger } from "./utils/logger";
import { isAppError, AppError } from "./utils/errors";
import { HTTP_STATUS } from "./config/constants";

// Initialize Firebase Admin SDK
initializeFirebase();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  logger.logRequest(req.method, req.path, {
    requestId: req.headers["x-request-id"] as string,
    userAgent: req.headers["user-agent"],
  });

  // Log response when finished
  res.on("finish", () => {
    const executionTime = Date.now() - startTime;
    logger.logResponse(req.method, req.path, res.statusCode, executionTime, {
      requestId: req.headers["x-request-id"] as string,
    });
  });

  next();
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: "1.0.0",
  });
});

// API v1 routes placeholder
app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    status: "healthy",
    service: "NDC Calculator API",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: HTTP_STATUS.NOT_FOUND,
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error
  logger.error("Unhandled error", err, {
    path: req.path,
    method: req.method,
    requestId: req.headers["x-request-id"] as string,
  });

  // Handle AppError instances
  if (isAppError(err)) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle unknown errors
  const appError = new AppError(
    env.NODE_ENV === "production" ? "Internal server error" : err.message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );

  res.status(appError.statusCode).json(appError.toJSON());
});

// Export Cloud Function
export const api = functions
  .region(env.FIREBASE_REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
    maxInstances: 100,
  })
  .https.onRequest(app);

// Log startup
logger.info("NDC Calculator Backend initialized", {
  environment: env.NODE_ENV,
  region: env.FIREBASE_REGION,
  features: {
    aiMatching: env.ENABLE_AI_MATCHING,
    caching: env.ENABLE_CACHING,
    analytics: env.ENABLE_ANALYTICS,
  },
});

