/**
 * OpenAI Service
 * AI-enhanced NDC matching using GPT-4
 */
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import type { OpenAIServiceConfig, NDCRecommendationRequest, AIRecommendationResult, CircuitBreakerState } from './openaiTypes';
/**
 * OpenAI Service
 * Handles AI-enhanced NDC recommendations
 */
export declare class OpenAIService {
    private client;
    private logger;
    private config;
    private circuitBreaker;
    private readonly PRICING;
    constructor(config?: OpenAIServiceConfig);
    /**
     * Get NDC recommendation from AI
     * @param request Recommendation request
     * @returns AI recommendation result
     */
    getRecommendation(request: NDCRecommendationRequest): Promise<AIRecommendationResult>;
    /**
     * Check if OpenAI service is available
     * @returns True if available
     */
    isAvailable(): boolean;
    /**
     * Check if OpenAI is enabled (API key + feature flag)
     * @returns True if OpenAI client initialized and feature enabled
     */
    isEnabled(): boolean;
    /**
     * Lightweight chat completion helper for other modules
     * Reuses configured model unless overridden
     */
    chat(params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'> & {
        model?: string;
    }): Promise<ChatCompletion>;
    /**
     * Calculate usage metrics and estimated cost
     * @param usage OpenAI usage data
     * @param latency Request latency
     * @returns Usage metrics
     */
    private calculateUsage;
    /**
     * Handle and transform OpenAI errors
     * @param error Original error
     * @returns Transformed error
     */
    private handleError;
    /**
     * Update circuit breaker state based on failure
     */
    private updateCircuitBreaker;
    /**
     * Get circuit breaker state
     * @returns Current circuit breaker state
     */
    getCircuitBreakerState(): CircuitBreakerState;
    /**
     * Reset circuit breaker (for testing/admin)
     */
    resetCircuitBreaker(): void;
}
export declare const openaiService: OpenAIService;
//# sourceMappingURL=openaiService.d.ts.map