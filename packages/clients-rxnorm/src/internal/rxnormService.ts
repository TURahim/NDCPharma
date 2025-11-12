/**
 * RxNorm API Service
 * Integrates with the National Library of Medicine's RxNorm API
 * API Documentation: https://rxnav.nlm.nih.gov/APIs.html
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { API_CONFIG } from "@core-config";
import { createLogger, RxNormAPIError } from "@core-guardrails";
import {
  RxCUI,
  RxNormSearchRequest,
  RxNormSearchResponse,
  RxNormApproximateMatchRequest,
  RxNormApproximateMatchResponse,
  RxNormSpellingSuggestionRequest,
  RxNormSpellingSuggestionResponse,
  RxNormPropertiesResponse,
  RxNormRelatedResponse,
  RxNormServiceConfig,
} from "./rxnormTypes";

/**
 * RxNorm API Service Class
 */
export class RxNormService {
  private client: AxiosInstance;
  private logger = createLogger({ service: "RxNormService" });
  private config: RxNormServiceConfig;

  constructor(config?: Partial<RxNormServiceConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || API_CONFIG.RXNORM_BASE_URL,
      apiKey: config?.apiKey,
      timeout: config?.timeout || API_CONFIG.TIMEOUT_MS,
      maxRetries: config?.maxRetries || API_CONFIG.MAX_RETRIES,
      retryDelay: config?.retryDelay || API_CONFIG.RETRY_DELAY_MS,
    };

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && { "api-key": this.config.apiKey }),
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use((config) => {
      this.logger.debug(`RxNorm API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`RxNorm API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(
          `RxNorm API Error: ${error.response?.status || "Network Error"}`,
          error
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for RxCUI by drug name (exact match)
   * GET /rxcui?name={drugName}
   */
  async searchByName(request: RxNormSearchRequest): Promise<RxNormSearchResponse> {
    const startTime = Date.now();

    try {
      const params: Record<string, string | number> = {
        name: request.name,
      };

      if (request.maxEntries) {
        params.maxEntries = request.maxEntries;
      }

      if (request.allSourcesTerm !== undefined) {
        params.allsrc = request.allSourcesTerm ? "1" : "0";
      }

      const response = await this.executeWithRetry<RxNormSearchResponse>(
        "/rxcui.json",
        params
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall("RxNorm", "/rxcui", "GET", 200, executionTime);

      return response;
    } catch (error) {
      throw this.handleError(error, "searchByName");
    }
  }

  /**
   * Get approximate matches for a drug name (fuzzy search)
   * GET /approximateTerm?term={term}
   */
  async getApproximateMatches(
    request: RxNormApproximateMatchRequest
  ): Promise<RxNormApproximateMatchResponse> {
    const startTime = Date.now();

    try {
      const params: Record<string, string | number> = {
        term: request.term,
      };

      if (request.maxEntries) {
        params.maxEntries = request.maxEntries;
      }

      if (request.option !== undefined) {
        params.option = request.option;
      }

      const response = await this.executeWithRetry<RxNormApproximateMatchResponse>(
        "/approximateTerm.json",
        params
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall("RxNorm", "/approximateTerm", "GET", 200, executionTime);

      return response;
    } catch (error) {
      throw this.handleError(error, "getApproximateMatches");
    }
  }

  /**
   * Get spelling suggestions for a drug name
   * GET /spellingsuggestions?name={name}
   */
  async getSpellingSuggestions(
    request: RxNormSpellingSuggestionRequest
  ): Promise<RxNormSpellingSuggestionResponse> {
    const startTime = Date.now();

    try {
      const params: Record<string, string | number> = {
        name: request.name,
      };

      if (request.maxEntries) {
        params.maxEntries = request.maxEntries;
      }

      const response = await this.executeWithRetry<RxNormSpellingSuggestionResponse>(
        "/spellingsuggestions.json",
        params
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall("RxNorm", "/spellingsuggestions", "GET", 200, executionTime);

      return response;
    } catch (error) {
      throw this.handleError(error, "getSpellingSuggestions");
    }
  }

  /**
   * Get drug properties by RxCUI
   * GET /rxcui/{rxcui}/properties
   */
  async getRxCUIProperties(rxcui: RxCUI): Promise<RxNormPropertiesResponse> {
    const startTime = Date.now();

    try {
      const response = await this.executeWithRetry<RxNormPropertiesResponse>(
        `/rxcui/${rxcui}/properties.json`
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall("RxNorm", `/rxcui/${rxcui}/properties`, "GET", 200, executionTime);

      return response;
    } catch (error) {
      throw this.handleError(error, "getRxCUIProperties");
    }
  }

  /**
   * Get related concepts for an RxCUI
   * GET /rxcui/{rxcui}/related?tty={tty}
   */
  async getRelatedConcepts(rxcui: RxCUI, termTypes?: string[]): Promise<RxNormRelatedResponse> {
    const startTime = Date.now();

    try {
      const params: Record<string, string> = {};
      
      if (termTypes && termTypes.length > 0) {
        params.tty = termTypes.join("+");
      }

      const response = await this.executeWithRetry<RxNormRelatedResponse>(
        `/rxcui/${rxcui}/related.json`,
        params
      );

      const executionTime = Date.now() - startTime;
      this.logger.logExternalAPICall("RxNorm", `/rxcui/${rxcui}/related`, "GET", 200, executionTime);

      return response;
    } catch (error) {
      throw this.handleError(error, "getRelatedConcepts");
    }
  }

  /**
   * Execute API request with retry logic
   */
  private async executeWithRetry<T>(
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.client.get<T>(endpoint, { params });
        return response.data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(API_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt - 1);
          this.logger.warn(`RxNorm API retry attempt ${attempt}/${this.config.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw lastError || new Error("RxNorm API request failed after all retries");
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown, operation: string): RxNormAPIError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const message = axiosError.response?.data || axiosError.message;

      return new RxNormAPIError(
        `RxNorm API error in ${operation}: ${message}`,
        {
          operation,
          status,
          message,
          endpoint: axiosError.config?.url,
        }
      );
    }

    if (error instanceof Error) {
      return new RxNormAPIError(`RxNorm API error in ${operation}: ${error.message}`, {
        operation,
        message: error.message,
      });
    }

    return new RxNormAPIError(`Unknown RxNorm API error in ${operation}`, { operation });
  }
}

/**
 * Create and export a singleton instance
 */
export const rxnormService = new RxNormService();

