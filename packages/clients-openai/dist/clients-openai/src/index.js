"use strict";
/**
 * OpenAI Client Package
 * Public API for AI-enhanced NDC recommendations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPHI = exports.sanitizeForAI = exports.validateResponseStructure = exports.generateUserPrompt = exports.FEW_SHOT_EXAMPLES = exports.SYSTEM_PROMPT = exports.ndcRecommender = exports.NDCRecommender = exports.openaiService = exports.OpenAIService = void 0;
const openaiService_1 = require("./internal/openaiService");
Object.defineProperty(exports, "OpenAIService", { enumerable: true, get: function () { return openaiService_1.OpenAIService; } });
Object.defineProperty(exports, "openaiService", { enumerable: true, get: function () { return openaiService_1.openaiService; } });
const recommender_1 = require("./internal/recommender");
Object.defineProperty(exports, "NDCRecommender", { enumerable: true, get: function () { return recommender_1.NDCRecommender; } });
Object.defineProperty(exports, "ndcRecommender", { enumerable: true, get: function () { return recommender_1.ndcRecommender; } });
// Export prompt utilities (for testing/customization)
var prompts_1 = require("./internal/prompts");
Object.defineProperty(exports, "SYSTEM_PROMPT", { enumerable: true, get: function () { return prompts_1.SYSTEM_PROMPT; } });
Object.defineProperty(exports, "FEW_SHOT_EXAMPLES", { enumerable: true, get: function () { return prompts_1.FEW_SHOT_EXAMPLES; } });
Object.defineProperty(exports, "generateUserPrompt", { enumerable: true, get: function () { return prompts_1.generateUserPrompt; } });
Object.defineProperty(exports, "validateResponseStructure", { enumerable: true, get: function () { return prompts_1.validateResponseStructure; } });
// Export PHI sanitization utilities
var phiSanitizer_1 = require("./internal/phiSanitizer");
Object.defineProperty(exports, "sanitizeForAI", { enumerable: true, get: function () { return phiSanitizer_1.sanitizeForAI; } });
Object.defineProperty(exports, "detectPHI", { enumerable: true, get: function () { return phiSanitizer_1.detectPHI; } });
