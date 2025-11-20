/**
 * Backend API Client
 * Handles communication with Firebase Cloud Functions backend
 */

import { CalculateRequest, CalculateResponse, AlternativeResponse, NDCPackage } from '@/types/api';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/ndcpharma-8f3c6/us-central1/api';

/**
 * Safely parse JSON responses. If the body is HTML (e.g., Firebase 404 page),
 * fall back to returning the raw text so we can surface a meaningful error
 * instead of throwing "Unexpected token < in JSON".
 */
async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { rawResponse: text };
  }
}

/**
 * Drug Search Request
 */
export interface SearchDrugRequest {
  drugName?: string;
  rxcui?: string;
  strength?: string;
  includeStrengths?: boolean;
}

/**
 * Drug Search Response
 */
export interface SearchDrugResponse {
  success: boolean;
  data?: {
    drug: {
      rxcui: string;
      name: string;
      dosageForm?: string;
      strength?: string;
    };
    packages: NDCPackage[];
    availableStrengths?: string[];
    totalPackages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

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

    const data = await parseJsonSafe(response);

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
      const defaultMessage =
        response.status === 404 && !data.error?.message
          ? 'API route not found. Please verify your API deployment and NEXT_PUBLIC_API_URL.'
          : data.error?.message || data.rawResponse || 'An unexpected error occurred';
      throw new APIError(
        defaultMessage,
        data.error?.code || 'UNKNOWN_ERROR',
        response.status,
        data.rawResponse ? { rawResponse: data.rawResponse } : data.error?.details
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

/**
 * Search for drug and retrieve available NDC packages
 * Used for Step 1-2 of the workflow (search + browse packages)
 */
export async function searchDrug(
  request: SearchDrugRequest,
  idToken: string | null
): Promise<SearchDrugResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token is available
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(`${API_URL}/v1/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    const data = await parseJsonSafe(response);

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

    // Handle drug not found
    if (response.status === 404) {
      throw new APIError(
        data.error?.message || 'Drug not found',
        data.error?.code || 'DRUG_NOT_FOUND',
        404,
        data.error?.details
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
      const defaultMessage =
        response.status === 404 && !data.error?.message
          ? 'API route not found. Please verify your API deployment and NEXT_PUBLIC_API_URL.'
          : data.error?.message || data.rawResponse || 'An unexpected error occurred';
      throw new APIError(
        defaultMessage,
        data.error?.code || 'UNKNOWN_ERROR',
        response.status,
        data.rawResponse ? { rawResponse: data.rawResponse } : data.error?.details
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

/**
 * Get alternative drugs for a drug not available in FDA database
 * Requires authentication
 */
export async function getAlternativeDrugs(
  drug: { name: string; rxcui: string },
  idToken: string | null
): Promise<AlternativeResponse> {
  try {
    if (!idToken) {
      throw new APIError(
        'Authentication required to access drug alternatives',
        'UNAUTHORIZED',
        401
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    };

    const response = await fetch(`${API_URL}/v1/alternatives`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ drug }),
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

