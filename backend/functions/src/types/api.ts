/**
 * API Contract Types
 * Request and response types for API endpoints
 */

import { WarningSeverity } from "./index";

/**
 * Base API Response
 */
export interface BaseAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> extends BaseAPIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment: string;
  version: string;
  services?: {
    rxnorm?: boolean;
    fda?: boolean;
    openai?: boolean;
    firestore?: boolean;
  };
}

/**
 * Warning object for calculation results
 */
export interface CalculationWarning {
  type: string;
  message: string;
  severity: WarningSeverity;
}

/**
 * Metadata for responses
 */
export interface ResponseMetadata {
  requestId?: string;
  timestamp: string;
  executionTime?: number;
  cached?: boolean;
  aiEnhanced?: boolean;
}

