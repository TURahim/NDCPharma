"use strict";
/**
 * Feature Flags
 * Controls optional and experimental features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_FLAGS = exports.ENABLE_ANALYTICS = exports.ENABLE_ADVANCED_CACHING = exports.ENABLE_OPENAI_ENHANCER = exports.USE_ENHANCED_NORMALIZATION = void 0;
/**
 * Enhanced normalization with 3-strategy approach (exact/fuzzy/spelling)
 * Default: true (keep existing sophisticated behavior)
 */
exports.USE_ENHANCED_NORMALIZATION = process.env.FEATURE_ENHANCED_NORM !== 'false';
/**
 * OpenAI enhancer for AI-powered matching
 * Default: false (OFF by default per requirements)
 */
exports.ENABLE_OPENAI_ENHANCER = process.env.FEATURE_OPENAI === 'true';
/**
 * Advanced caching features
 * Default: false (basic caching only for MVP)
 */
exports.ENABLE_ADVANCED_CACHING = process.env.FEATURE_CACHE_ADVANCED === 'true';
/**
 * Analytics and metrics collection
 * Default: true
 */
exports.ENABLE_ANALYTICS = process.env.ENABLE_ANALYTICS !== 'false';
/**
 * Feature Flags Object
 * Consolidated feature flags for easy access
 */
exports.FEATURE_FLAGS = {
    USE_ENHANCED_NORMALIZATION: exports.USE_ENHANCED_NORMALIZATION,
    ENABLE_OPENAI: exports.ENABLE_OPENAI_ENHANCER,
    ENABLE_ADVANCED_CACHING: exports.ENABLE_ADVANCED_CACHING,
    ENABLE_ANALYTICS: exports.ENABLE_ANALYTICS,
};
//# sourceMappingURL=flags.js.map