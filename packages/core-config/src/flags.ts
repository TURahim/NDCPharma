/**
 * Feature Flags
 * Controls optional and experimental features
 */

/**
 * Enhanced normalization with 3-strategy approach (exact/fuzzy/spelling)
 * Default: true (keep existing sophisticated behavior)
 */
export const USE_ENHANCED_NORMALIZATION = 
  process.env.FEATURE_ENHANCED_NORM !== 'false';

/**
 * OpenAI enhancer for AI-powered matching
 * Default: false (OFF by default per requirements)
 */
export const ENABLE_OPENAI_ENHANCER = 
  process.env.FEATURE_OPENAI === 'true';

/**
 * Advanced caching features
 * Default: false (basic caching only for MVP)
 */
export const ENABLE_ADVANCED_CACHING = 
  process.env.FEATURE_CACHE_ADVANCED === 'true';

/**
 * Analytics and metrics collection
 * Default: true
 */
export const ENABLE_ANALYTICS =
  process.env.ENABLE_ANALYTICS !== 'false';

/**
 * Feature Flags Object
 * Consolidated feature flags for easy access
 */
export const FEATURE_FLAGS = {
  USE_ENHANCED_NORMALIZATION,
  ENABLE_OPENAI: ENABLE_OPENAI_ENHANCER,
  ENABLE_ADVANCED_CACHING,
  ENABLE_ANALYTICS,
} as const;

