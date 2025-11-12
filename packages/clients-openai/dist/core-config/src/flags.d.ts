/**
 * Feature Flags
 * Controls optional and experimental features
 */
/**
 * Enhanced normalization with 3-strategy approach (exact/fuzzy/spelling)
 * Default: true (keep existing sophisticated behavior)
 */
export declare const USE_ENHANCED_NORMALIZATION: boolean;
/**
 * OpenAI enhancer for AI-powered matching
 * Default: false (OFF by default per requirements)
 */
export declare const ENABLE_OPENAI_ENHANCER: boolean;
/**
 * Advanced caching features
 * Default: false (basic caching only for MVP)
 */
export declare const ENABLE_ADVANCED_CACHING: boolean;
/**
 * Analytics and metrics collection
 * Default: true
 */
export declare const ENABLE_ANALYTICS: boolean;
/**
 * Feature Flags Object
 * Consolidated feature flags for easy access
 */
export declare const FEATURE_FLAGS: {
    readonly USE_ENHANCED_NORMALIZATION: boolean;
    readonly ENABLE_OPENAI: boolean;
    readonly ENABLE_ADVANCED_CACHING: boolean;
    readonly ENABLE_ANALYTICS: boolean;
};
//# sourceMappingURL=flags.d.ts.map