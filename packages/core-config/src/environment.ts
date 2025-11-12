/**
 * Environment Configuration
 * Manages environment variables and secrets for the NDC Calculator
 */

import * as dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env.local file in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.local" });
}

/**
 * Environment variable schema using Zod for validation
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),

  // Firebase Configuration
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_REGION: z.string().default("us-central1"),

  // External API Keys (ALL OPTIONAL per refactor requirements)
  RXNORM_API_KEY: z.string().optional(), // RxNorm API is public, key optional
  FDA_API_KEY: z.string().optional(), // FDA API key for higher rate limits
  OPENAI_API_KEY: z.string().optional(), // OpenAI is feature-flagged, OFF by default

  // API Configuration
  RXNORM_BASE_URL: z.string().url().default("https://rxnav.nlm.nih.gov/REST"),
  FDA_BASE_URL: z.string().url().default("https://api.fda.gov/drug/ndc.json"),
  OPENAI_MODEL: z.string().default("gpt-4-turbo-preview"),

  // Performance Settings
  API_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()).default("2000"),
  MAX_RETRIES: z.string().transform(Number).pipe(z.number().int().positive()).default("3"),
  CACHE_TTL_HOURS_DRUG: z.string().transform(Number).pipe(z.number().positive()).default("24"),
  CACHE_TTL_HOURS_NDC: z.string().transform(Number).pipe(z.number().positive()).default("1"),

  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_HOUR: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("100"),
  RATE_LIMIT_BURST: z.string().transform(Number).pipe(z.number().int().positive()).default("10"),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "critical"]).default("info"),
  ENABLE_REQUEST_LOGGING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),

  // Security
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  JWT_EXPIRATION_HOURS: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default("24"),

  // Feature Flags
  ENABLE_AI_MATCHING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  ENABLE_CACHING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  ENABLE_ANALYTICS: z
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
      throw new Error(
        `Environment validation failed:\n${missingVars.join("\n")}\n\nPlease check your .env.local file.`
      );
    }
    throw error;
  }
}

/**
 * Validated and typed environment configuration
 */
export const env = validateEnv();

/**
 * Environment helper functions
 */
export const isDevelopment = env.NODE_ENV === "development";
export const isStaging = env.NODE_ENV === "staging";
export const isProduction = env.NODE_ENV === "production";

/**
 * Get CORS allowed origins as an array
 */
export function getCorsOrigins(): string[] {
  return env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
}

/**
 * Type export for environment configuration
 */
export type Environment = z.infer<typeof envSchema>;

