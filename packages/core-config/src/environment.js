"use strict";
/**
 * Environment Configuration
 * Manages environment variables and secrets for the NDC Calculator
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = exports.isStaging = exports.isDevelopment = exports.env = void 0;
exports.getCorsOrigins = getCorsOrigins;
const dotenv = __importStar(require("dotenv"));
const zod_1 = require("zod");
// Load environment variables from .env.local file in development
if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: ".env.local" });
}
/**
 * Environment variable schema using Zod for validation
 */
const envSchema = zod_1.z.object({
    // Node Environment
    NODE_ENV: zod_1.z.enum(["development", "staging", "production"]).default("development"),
    // Firebase Configuration
    FIREBASE_PROJECT_ID: zod_1.z.string().optional(),
    FIREBASE_REGION: zod_1.z.string().default("us-central1"),
    // External API Keys (ALL OPTIONAL per refactor requirements)
    RXNORM_API_KEY: zod_1.z.string().optional(), // RxNorm API is public, key optional
    FDA_API_KEY: zod_1.z.string().optional(), // FDA API key for higher rate limits
    OPENAI_API_KEY: zod_1.z.string().optional(), // OpenAI is feature-flagged, OFF by default
    // API Configuration
    RXNORM_BASE_URL: zod_1.z.string().url().default("https://rxnav.nlm.nih.gov/REST"),
    FDA_BASE_URL: zod_1.z.string().url().default("https://api.fda.gov/drug/ndc.json"),
    OPENAI_MODEL: zod_1.z.string().default("gpt-4-turbo-preview"),
    // Performance Settings
    API_TIMEOUT_MS: zod_1.z.string().transform(Number).pipe(zod_1.z.number().positive()).default("2000"),
    MAX_RETRIES: zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().positive()).default("3"),
    CACHE_TTL_HOURS_DRUG: zod_1.z.string().transform(Number).pipe(zod_1.z.number().positive()).default("24"),
    CACHE_TTL_HOURS_NDC: zod_1.z.string().transform(Number).pipe(zod_1.z.number().positive()).default("1"),
    // Rate Limiting
    RATE_LIMIT_REQUESTS_PER_HOUR: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().int().positive())
        .default("100"),
    RATE_LIMIT_BURST: zod_1.z.string().transform(Number).pipe(zod_1.z.number().int().positive()).default("10"),
    // Logging
    LOG_LEVEL: zod_1.z.enum(["debug", "info", "warn", "error", "critical"]).default("info"),
    ENABLE_REQUEST_LOGGING: zod_1.z
        .string()
        .transform((val) => val === "true")
        .default("true"),
    // Security
    CORS_ALLOWED_ORIGINS: zod_1.z.string().default("http://localhost:3000"),
    JWT_EXPIRATION_HOURS: zod_1.z
        .string()
        .transform(Number)
        .pipe(zod_1.z.number().positive())
        .default("24"),
    // Feature Flags
    ENABLE_AI_MATCHING: zod_1.z
        .string()
        .transform((val) => val === "true")
        .default("true"),
    ENABLE_CACHING: zod_1.z
        .string()
        .transform((val) => val === "true")
        .default("true"),
    ENABLE_ANALYTICS: zod_1.z
        .string()
        .transform((val) => val === "true")
        .default("true"),
});
/**
 * Validate and parse environment variables
 */
function validateEnv() {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const missingVars = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
            throw new Error(`Environment validation failed:\n${missingVars.join("\n")}\n\nPlease check your .env.local file.`);
        }
        throw error;
    }
}
/**
 * Validated and typed environment configuration
 */
exports.env = validateEnv();
/**
 * Environment helper functions
 */
exports.isDevelopment = exports.env.NODE_ENV === "development";
exports.isStaging = exports.env.NODE_ENV === "staging";
exports.isProduction = exports.env.NODE_ENV === "production";
/**
 * Get CORS allowed origins as an array
 */
function getCorsOrigins() {
    return exports.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
}
//# sourceMappingURL=environment.js.map