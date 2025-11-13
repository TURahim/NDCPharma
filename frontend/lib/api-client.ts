/**
 * Backend API Client
 * Handles communication with Firebase Cloud Functions backend
 */

import { CalculateRequest, CalculateResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/ndcpharma-8f3c6/us-central1/api';

export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function calculateNDC(
  request: CalculateRequest,
  idToken: string | null
): Promise<CalculateResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token is available
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(`${API_URL}/v1/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    const data = await response.json();

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new APIError(
        data.error?.message || 'Rate limit exceeded. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
        429,
        { retryAfter: retryAfter ? parseInt(retryAfter) : null }
      );
    }

    // Handle authentication errors
    if (response.status === 401) {
      throw new APIError(
        'Authentication required. Please sign in again.',
        'UNAUTHORIZED',
        401
      );
    }

    // Handle validation errors
    if (response.status === 400) {
      throw new APIError(
        data.error?.message || 'Invalid request. Please check your input.',
        data.error?.code || 'VALIDATION_ERROR',
        400,
        data.error?.details
      );
    }

    // Handle server errors
    if (response.status === 500) {
      throw new APIError(
        data.error?.message || 'Server error. Please try again later.',
        data.error?.code || 'SERVER_ERROR',
        500
      );
    }

    // Handle network or other errors
    if (!response.ok) {
      throw new APIError(
        data.error?.message || 'An unexpected error occurred',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Network error. Please check your connection and try again.',
        'NETWORK_ERROR',
        0
      );
    }

    // Handle other errors
    throw new APIError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}

