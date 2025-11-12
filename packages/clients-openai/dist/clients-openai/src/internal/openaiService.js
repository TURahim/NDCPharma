"use strict";
/**
 * OpenAI Service
 * AI-enhanced NDC matching using GPT-4
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiService = exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const _core_guardrails_1 = require("@core-guardrails");
const _core_config_1 = require("@core-config");
const prompts_1 = require("./prompts");
/**
 * OpenAI Service
 * Handles AI-enhanced NDC recommendations
 */
class OpenAIService {
    constructor(config = {}) {
        this.client = null;
        this.logger = (0, _core_guardrails_1.createLogger)({ service: 'OpenAIService' });
        // Pricing for GPT-4 (as of 2024, per 1K tokens)
        this.PRICING = {
            'gpt-4o': { input: 0.005, output: 0.015 },
            'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 },
        };
        this.config = {
            apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
            model: config.model || 'gpt-4o',
            maxTokens: config.maxTokens || 2000,
            temperature: config.temperature || 0.3, // Lower temperature for consistent medical advice
            timeout: config.timeout || 30000, // 30 seconds
            maxRetries: config.maxRetries || 2,
            retryDelay: config.retryDelay || 2000,
        };
        // Initialize circuit breaker
        this.circuitBreaker = {
            state: 'closed',
            failures: 0,
        };
        // Only initialize client if API key is available and feature is enabled
        if (this.config.apiKey && _core_config_1.FEATURE_FLAGS.ENABLE_OPENAI) {
            try {
                this.client = new openai_1.default({
                    apiKey: this.config.apiKey,
                    timeout: this.config.timeout,
                    maxRetries: this.config.maxRetries,
                });
                this.logger.info('OpenAI client initialized successfully');
            }
            catch (error) {
                this.logger.warn('Failed to initialize OpenAI client', {
                    error: error,
                });
            }
        }
        else {
            this.logger.info('OpenAI client not initialized (disabled or no API key)');
        }
    }
    /**
     * Get NDC recommendation from AI
     * @param request Recommendation request
     * @returns AI recommendation result
     */
    async getRecommendation(request) {
        const startTime = Date.now();
        // Check if OpenAI is available
        if (!this.isAvailable()) {
            return {
                success: false,
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'OpenAI service is not available or disabled',
                    type: 'api_error',
                },
                executionTime: Date.now() - startTime,
                usedFallback: false,
            };
        }
        // Check circuit breaker
        if (this.circuitBreaker.state === 'open') {
            const now = new Date();
            const nextRetry = this.circuitBreaker.nextRetryAt
                ? new Date(this.circuitBreaker.nextRetryAt)
                : now;
            if (now < nextRetry) {
                this.logger.warn('Circuit breaker is open, skipping OpenAI request');
                return {
                    success: false,
                    error: {
                        code: 'CIRCUIT_BREAKER_OPEN',
                        message: 'Circuit breaker is open due to previous failures',
                        type: 'api_error',
                    },
                    executionTime: Date.now() - startTime,
                    usedFallback: false,
                };
            }
            else {
                // Try half-open state
                this.circuitBreaker.state = 'half-open';
                this.logger.info('Circuit breaker moving to half-open state');
            }
        }
        try {
            const userPrompt = (0, prompts_1.generateUserPrompt)(request);
            this.logger.debug('Sending request to OpenAI', {
                model: this.config.model,
                promptLength: userPrompt.length,
            });
            const completion = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    { role: 'system', content: prompts_1.SYSTEM_PROMPT },
                    ...prompts_1.FEW_SHOT_EXAMPLES,
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                response_format: { type: 'json_object' },
            });
            const executionTime = Date.now() - startTime;
            // Extract and parse response
            const responseContent = completion.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error('Empty response from OpenAI');
            }
            let recommendation;
            try {
                recommendation = JSON.parse(responseContent);
            }
            catch (parseError) {
                throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
            }
            // Validate response structure
            if (!(0, prompts_1.validateResponseStructure)(recommendation)) {
                throw new Error('Invalid response structure from OpenAI');
            }
            // Calculate usage metrics
            const usage = this.calculateUsage(completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, executionTime);
            // Log successful API call
            this.logger.logExternalAPICall('OpenAI', `/chat/completions`, 'POST', 200, executionTime);
            this.logger.info('OpenAI recommendation generated successfully', {
                primaryNdc: recommendation.primaryRecommendation.ndc,
                alternativesCount: recommendation.alternatives.length,
                confidenceScore: recommendation.primaryRecommendation.confidenceScore,
                usage,
            });
            // Reset circuit breaker on success
            if (this.circuitBreaker.state === 'half-open') {
                this.circuitBreaker.state = 'closed';
                this.circuitBreaker.failures = 0;
                this.logger.info('Circuit breaker closed');
            }
            return {
                success: true,
                recommendation,
                usage,
                executionTime,
                usedFallback: false,
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const aiError = this.handleError(error);
            this.logger.error('OpenAI recommendation failed', error, {
                executionTime,
                circuitBreakerState: this.circuitBreaker.state,
            });
            // Update circuit breaker
            this.updateCircuitBreaker();
            return {
                success: false,
                error: aiError,
                executionTime,
                usedFallback: false,
            };
        }
    }
    /**
     * Check if OpenAI service is available
     * @returns True if available
     */
    isAvailable() {
        return (this.client !== null &&
            _core_config_1.FEATURE_FLAGS.ENABLE_OPENAI &&
            this.circuitBreaker.state !== 'open');
    }
    /**
     * Calculate usage metrics and estimated cost
     * @param usage OpenAI usage data
     * @param latency Request latency
     * @returns Usage metrics
     */
    calculateUsage(usage, latency) {
        const model = this.config.model;
        const pricing = this.PRICING[model] || this.PRICING['gpt-4o'];
        const promptCost = (usage.prompt_tokens / 1000) * pricing.input;
        const completionCost = (usage.completion_tokens / 1000) * pricing.output;
        const estimatedCost = promptCost + completionCost;
        return {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            estimatedCost: parseFloat(estimatedCost.toFixed(4)),
            latency,
            model: this.config.model,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Handle and transform OpenAI errors
     * @param error Original error
     * @returns Transformed error
     */
    handleError(error) {
        if (error instanceof openai_1.default.APIError) {
            let type = 'api_error';
            if (error.status === 429) {
                type = 'rate_limit';
            }
            else if (error.status === 401) {
                type = 'authentication';
            }
            else if (error.status === 400) {
                type = 'invalid_request';
            }
            return {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message,
                type,
                statusCode: error.status,
            };
        }
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                return {
                    code: 'TIMEOUT',
                    message: 'OpenAI request timed out',
                    type: 'timeout',
                };
            }
            return {
                code: 'UNKNOWN_ERROR',
                message: error.message,
                type: 'api_error',
            };
        }
        return {
            code: 'UNKNOWN_ERROR',
            message: 'An unknown error occurred',
            type: 'api_error',
        };
    }
    /**
     * Update circuit breaker state based on failure
     */
    updateCircuitBreaker() {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = new Date().toISOString();
        // Open circuit after 3 consecutive failures
        if (this.circuitBreaker.failures >= 3) {
            this.circuitBreaker.state = 'open';
            // Retry after 5 minutes
            const nextRetry = new Date(Date.now() + 5 * 60 * 1000);
            this.circuitBreaker.nextRetryAt = nextRetry.toISOString();
            this.logger.warn('Circuit breaker opened', {
                failures: this.circuitBreaker.failures,
                nextRetryAt: this.circuitBreaker.nextRetryAt,
            });
        }
    }
    /**
     * Get circuit breaker state
     * @returns Current circuit breaker state
     */
    getCircuitBreakerState() {
        return { ...this.circuitBreaker };
    }
    /**
     * Reset circuit breaker (for testing/admin)
     */
    resetCircuitBreaker() {
        this.circuitBreaker = {
            state: 'closed',
            failures: 0,
        };
        this.logger.info('Circuit breaker manually reset');
    }
}
exports.OpenAIService = OpenAIService;
// Export singleton instance
exports.openaiService = new OpenAIService();
