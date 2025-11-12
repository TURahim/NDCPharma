"use strict";
/**
 * RxNorm API Service
 * Integrates with the National Library of Medicine's RxNorm API
 * API Documentation: https://rxnav.nlm.nih.gov/APIs.html
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rxnormService = exports.RxNormService = void 0;
const axios_1 = __importDefault(require("axios"));
const _core_config_1 = require("@core-config");
const _core_guardrails_1 = require("@core-guardrails");
/**
 * RxNorm API Service Class
 */
class RxNormService {
    constructor(config) {
        this.logger = (0, _core_guardrails_1.createLogger)({ service: "RxNormService" });
        this.config = {
            baseUrl: config?.baseUrl || _core_config_1.API_CONFIG.RXNORM_BASE_URL,
            apiKey: config?.apiKey,
            timeout: config?.timeout || _core_config_1.API_CONFIG.TIMEOUT_MS,
            maxRetries: config?.maxRetries || _core_config_1.API_CONFIG.MAX_RETRIES,
            retryDelay: config?.retryDelay || _core_config_1.API_CONFIG.RETRY_DELAY_MS,
        };
        // Create axios instance with default configuration
        this.client = axios_1.default.create({
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
        this.client.interceptors.response.use((response) => {
            this.logger.debug(`RxNorm API Response: ${response.status} ${response.config.url}`);
            return response;
        }, (error) => {
            this.logger.error(`RxNorm API Error: ${error.response?.status || "Network Error"}`, error);
            return Promise.reject(error);
        });
    }
    /**
     * Search for RxCUI by drug name (exact match)
     * GET /rxcui?name={drugName}
     */
    async searchByName(request) {
        const startTime = Date.now();
        try {
            const params = {
                name: request.name,
            };
            if (request.maxEntries) {
                params.maxEntries = request.maxEntries;
            }
            if (request.allSourcesTerm !== undefined) {
                params.allsrc = request.allSourcesTerm ? "1" : "0";
            }
            const response = await this.executeWithRetry("/rxcui.json", params);
            const executionTime = Date.now() - startTime;
            this.logger.logExternalAPICall("RxNorm", "/rxcui", "GET", 200, executionTime);
            return response;
        }
        catch (error) {
            throw this.handleError(error, "searchByName");
        }
    }
    /**
     * Get approximate matches for a drug name (fuzzy search)
     * GET /approximateTerm?term={term}
     */
    async getApproximateMatches(request) {
        const startTime = Date.now();
        try {
            const params = {
                term: request.term,
            };
            if (request.maxEntries) {
                params.maxEntries = request.maxEntries;
            }
            if (request.option !== undefined) {
                params.option = request.option;
            }
            const response = await this.executeWithRetry("/approximateTerm.json", params);
            const executionTime = Date.now() - startTime;
            this.logger.logExternalAPICall("RxNorm", "/approximateTerm", "GET", 200, executionTime);
            return response;
        }
        catch (error) {
            throw this.handleError(error, "getApproximateMatches");
        }
    }
    /**
     * Get spelling suggestions for a drug name
     * GET /spellingsuggestions?name={name}
     */
    async getSpellingSuggestions(request) {
        const startTime = Date.now();
        try {
            const params = {
                name: request.name,
            };
            if (request.maxEntries) {
                params.maxEntries = request.maxEntries;
            }
            const response = await this.executeWithRetry("/spellingsuggestions.json", params);
            const executionTime = Date.now() - startTime;
            this.logger.logExternalAPICall("RxNorm", "/spellingsuggestions", "GET", 200, executionTime);
            return response;
        }
        catch (error) {
            throw this.handleError(error, "getSpellingSuggestions");
        }
    }
    /**
     * Get drug properties by RxCUI
     * GET /rxcui/{rxcui}/properties
     */
    async getRxCUIProperties(rxcui) {
        const startTime = Date.now();
        try {
            const response = await this.executeWithRetry(`/rxcui/${rxcui}/properties.json`);
            const executionTime = Date.now() - startTime;
            this.logger.logExternalAPICall("RxNorm", `/rxcui/${rxcui}/properties`, "GET", 200, executionTime);
            return response;
        }
        catch (error) {
            throw this.handleError(error, "getRxCUIProperties");
        }
    }
    /**
     * Get related concepts for an RxCUI
     * GET /rxcui/{rxcui}/related?tty={tty}
     */
    async getRelatedConcepts(rxcui, termTypes) {
        const startTime = Date.now();
        try {
            const params = {};
            if (termTypes && termTypes.length > 0) {
                params.tty = termTypes.join("+");
            }
            const response = await this.executeWithRetry(`/rxcui/${rxcui}/related.json`, params);
            const executionTime = Date.now() - startTime;
            this.logger.logExternalAPICall("RxNorm", `/rxcui/${rxcui}/related`, "GET", 200, executionTime);
            return response;
        }
        catch (error) {
            throw this.handleError(error, "getRelatedConcepts");
        }
    }
    /**
     * Execute API request with retry logic
     */
    async executeWithRetry(endpoint, params) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await this.client.get(endpoint, { params });
                return response.data;
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx)
                if (axios_1.default.isAxiosError(error) && error.response?.status && error.response.status < 500) {
                    throw error;
                }
                // Wait before retrying (exponential backoff)
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(_core_config_1.API_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt - 1);
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
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Handle and transform errors
     */
    handleError(error, operation) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            const status = axiosError.response?.status;
            const message = axiosError.response?.data || axiosError.message;
            return new _core_guardrails_1.RxNormAPIError(`RxNorm API error in ${operation}: ${message}`, {
                operation,
                status,
                message,
                endpoint: axiosError.config?.url,
            });
        }
        if (error instanceof Error) {
            return new _core_guardrails_1.RxNormAPIError(`RxNorm API error in ${operation}: ${error.message}`, {
                operation,
                message: error.message,
            });
        }
        return new _core_guardrails_1.RxNormAPIError(`Unknown RxNorm API error in ${operation}`, { operation });
    }
}
exports.RxNormService = RxNormService;
/**
 * Create and export a singleton instance
 */
exports.rxnormService = new RxNormService();
