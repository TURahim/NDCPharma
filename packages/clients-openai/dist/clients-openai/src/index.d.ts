/**
 * OpenAI Client Package
 * Public API for AI-enhanced NDC recommendations
 */
import { OpenAIService, openaiService } from './internal/openaiService';
import { NDCRecommender, ndcRecommender } from './internal/recommender';
export { OpenAIService, openaiService };
export { NDCRecommender, ndcRecommender };
export type { NDCRecommendationRequest, NDCRecommendationResponse, OpenAIServiceConfig, OpenAIUsageMetrics, OpenAIError, AIRecommendationResult, CircuitBreakerState, } from './internal/openaiTypes';
export type { PackageRecommendation, EnhancedRecommendationResult, } from './internal/recommender';
export { SYSTEM_PROMPT, FEW_SHOT_EXAMPLES, generateUserPrompt, validateResponseStructure, } from './internal/prompts';
//# sourceMappingURL=index.d.ts.map