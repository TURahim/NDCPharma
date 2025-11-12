/**
 * FDA NDC Directory API Service
 * OpenFDA Drug API: https://open.fda.gov/apis/drug/ndc/
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger } from '@core-guardrails';
import { API_CONFIG } from '@core-config';
import type {
  FDASearchRequest,
  FDASearchResponse,
  FDAServiceConfig,
  FDAErrorResponse,
} from './fdaTypes';

/**
 * FDA API Service
 * Handles HTTP communication with the openFDA NDC Directory API
 */
export class FDAService {
  private client: AxiosInstance;
  private logger = createLogger({ service: 'FDAService' });
  private config: Required<FDAServiceConfig>;

  constructor(config: FDAServiceConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || API_CONFIG.FDA_BASE_URL,
      apiKey: config.apiKey || process.env.FDA_API_KEY || '',
      timeout: config.timeout || API_CONFIG.DEFAULT_TIMEOUT_MS,
      maxRetries: config.maxRetries || API_CONFIG.MAX_RETRIES,
      retryDelay: config.retryDelay || API_CONFIG.RETRY_DELAY_MS,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NDC-Calculator/1.0',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use((config) => {
      this.logger.debug(`FDA API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
      });
      return config;
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`FDA API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        this.logger.error(`FDA API Error: ${error.message}`, error as Error, {
          url: error.config?.url,
          status: error.response?.status,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search NDCs by RxCUI
   * @param rxcui RxNorm Concept Unique Identifier
   * @param options Search options (limit, skip)
   * @returns FDA search response with NDC results
   */
  async searchByRxCUI(
    rxcui: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<FDASearchResponse> {
    const startTime = Date.now();
    
    try {
      const request: FDASearchRequest = {
        search: `openfda.rxcui:${rxcui}`,
        limit: options.limit || 100,
        skip: options.skip || 0,
      };

      const response = await this.executeWithRetry<FDASearchResponse>(
        '/drug/ndc.json',
        request
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall(
        'FDA',
        `/drug/ndc.json?search=openfda.rxcui:${rxcui}`,
        'GET',
        200,
        executionTime
      );

      this.logger.info(`Found ${response.results?.length || 0} NDCs for RxCUI ${rxcui}`, {
        rxcui,
        resultCount: response.results?.length || 0,
        executionTime,
      });

      return response;
    } catch (error) {
      throw this.handleError(error, 'searchByRxCUI', { rxcui });
    }
  }

  /**
   * Search NDCs by product NDC
   * @param productNdc Product NDC (5-4 or 5-3-2 format)
   * @returns FDA search response
   */
  async searchByProductNDC(productNdc: string): Promise<FDASearchResponse> {
    const startTime = Date.now();
    
    try {
      const request: FDASearchRequest = {
        search: `product_ndc:${productNdc}`,
        limit: 100,
      };

      const response = await this.executeWithRetry<FDASearchResponse>(
        '/drug/ndc.json',
        request
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall(
        'FDA',
        `/drug/ndc.json?search=product_ndc:${productNdc}`,
        'GET',
        200,
        executionTime
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'searchByProductNDC', { productNdc });
    }
  }

  /**
   * Search NDCs by package NDC
   * @param packageNdc Package NDC (11-digit format)
   * @returns FDA search response
   */
  async searchByPackageNDC(packageNdc: string): Promise<FDASearchResponse> {
    const startTime = Date.now();
    
    try {
      // Normalize NDC to 11-digit format without dashes
      const normalizedNdc = packageNdc.replace(/-/g, '');
      
      const request: FDASearchRequest = {
        search: `packaging.package_ndc:${normalizedNdc}`,
        limit: 10,
      };

      const response = await this.executeWithRetry<FDASearchResponse>(
        '/drug/ndc.json',
        request
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall(
        'FDA',
        `/drug/ndc.json?search=packaging.package_ndc:${normalizedNdc}`,
        'GET',
        200,
        executionTime
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'searchByPackageNDC', { packageNdc });
    }
  }

  /**
   * Search NDCs by generic name
   * @param genericName Generic drug name
   * @param options Search options
   * @returns FDA search response
   */
  async searchByGenericName(
    genericName: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<FDASearchResponse> {
    const startTime = Date.now();
    
    try {
      const request: FDASearchRequest = {
        search: `generic_name:"${genericName}"`,
        limit: options.limit || 100,
        skip: options.skip || 0,
      };

      const response = await this.executeWithRetry<FDASearchResponse>(
        '/drug/ndc.json',
        request
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall(
        'FDA',
        `/drug/ndc.json?search=generic_name:"${genericName}"`,
        'GET',
        200,
        executionTime
      );

      return response;
    } catch (error) {
      throw this.handleError(error, 'searchByGenericName', { genericName });
    }
  }

  /**
   * Execute FDA API request with retry logic
   * @param endpoint API endpoint path
   * @param request Search request parameters
   * @returns API response
   */
  private async executeWithRetry<T>(
    endpoint: string,
    request: FDASearchRequest
  ): Promise<T> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        const params: Record<string, string | number> = {
          search: request.search,
          limit: request.limit || 100,
        };

        if (request.skip) {
          params.skip = request.skip;
        }

        // Add API key if configured (for higher rate limits)
        if (this.config.apiKey) {
          params.api_key = this.config.apiKey;
        }

        const response = await this.client.get<T>(endpoint, { params });
        return response.data;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry on 4xx errors (client errors)
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            // Don't retry client errors (except rate limiting)
            break;
          }
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(`FDA API request failed, retrying in ${delay}ms (attempt ${attempt}/${this.config.maxRetries})`, {
            error: lastError,
            endpoint,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('FDA API request failed');
  }

  /**
   * Handle and transform FDA API errors
   * @param error Original error
   * @param operation Operation name
   * @param context Additional context
   * @returns Transformed error
   */
  private handleError(
    error: unknown,
    operation: string,
    context: Record<string, unknown>
  ): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<FDAErrorResponse>;
      const status = axiosError.response?.status;
      const fdaError = axiosError.response?.data?.error;

      let message = `FDA API ${operation} failed`;
      
      if (fdaError) {
        message = `FDA API Error: ${fdaError.message} (${fdaError.code})`;
      } else if (status === 404) {
        message = 'No results found in FDA database';
      } else if (status === 429) {
        message = 'FDA API rate limit exceeded';
      } else if (status && status >= 500) {
        message = 'FDA API server error';
      } else if (axiosError.code === 'ECONNABORTED') {
        message = 'FDA API request timeout';
      }

      this.logger.error(message, error as Error, {
        operation,
        status,
        ...context,
      });

      const customError = new Error(message);
      (customError as any).status = status;
      (customError as any).operation = operation;
      (customError as any).context = context;
      return customError;
    }

    this.logger.error(`Unexpected error in FDA API ${operation}`, error as Error, context);
    return error as Error;
  }

  /**
   * Sleep utility for retry delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const fdaService = new FDAService();

