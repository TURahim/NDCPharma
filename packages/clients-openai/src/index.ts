/**
 * OpenAI Client Package
 * Public API for AI-enhanced NDC recommendations
 */

import { OpenAIService, openaiService } from './internal/openaiService';
import { NDCRecommender, ndcRecommender } from './internal/recommender';

// Export public API
export { OpenAIService, openaiService };
export { NDCRecommender, ndcRecommender };

// Export types
export type {
  NDCRecommendationRequest,
  NDCRecommendationResponse,
  OpenAIServiceConfig,
  OpenAIUsageMetrics,
  OpenAIError,
  AIRecommendationResult,
  CircuitBreakerState,
} from './internal/openaiTypes';

export type {
  PackageRecommendation,
  EnhancedRecommendationResult,
} from './internal/recommender';

// Export prompt utilities (for testing/customization)
export {
  SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  generateUserPrompt,
  validateResponseStructure,
} from './internal/prompts';

