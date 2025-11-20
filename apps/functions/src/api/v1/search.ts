/**
 * Drug Search Endpoint
 * Search-only endpoint for drug lookup without calculation
 */

import { Request, Response } from 'express';
import { createLogger } from '@core-guardrails';
import {
  performDrugSearch,
  type DrugSearchRequest,
  type DrugSearchResult,
} from '../../services/drug-search/searchService';
import { DrugSearchError } from '../../services/drug-search/errors';

const logger = createLogger({ service: 'SearchEndpoint' });

/**
 * Search request interface
 */
export interface SearchRequest extends DrugSearchRequest {}

/**
 * Search response interface
 */
export interface SearchResponse {
  success: boolean;
  data?: DrugSearchResult;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * POST /api/v1/search
 * Search for drug and retrieve available packages
 */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const request = req.body as SearchRequest;
  const context = {
    requestId: req.headers['x-request-id']?.toString() || `req_${Date.now()}`,
    correlationId: req.headers['x-correlation-id']?.toString() || req.id || 'search',
  };

  try {
    const result = await performDrugSearch(request, context);

    const response: SearchResponse = {
      success: true,
      data: result,
    };

    logger.info('Drug search succeeded', {
      requestId: context.requestId,
      correlationId: context.correlationId,
      durationMs: Date.now() - startTime,
      packagesReturned: result.packages.length,
    });

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof DrugSearchError) {
      logger.warn('Drug search failed with known error', {
        code: error.code,
        message: error.message,
        details: error.details,
        durationMs: Date.now() - startTime,
        request,
      });

      const response: SearchResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };

      res.status(error.statusCode).json(response);
      return;
    }

    const err = error as Error;
    logger.error('Drug search failed unexpectedly', err, {
      durationMs: Date.now() - startTime,
      request,
    });

    const response: SearchResponse = {
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: err.message || 'An unexpected error occurred during drug search',
        details: {
          stack: err.stack,
        },
      },
    };

    res.status(500).json(response);
  }
}

