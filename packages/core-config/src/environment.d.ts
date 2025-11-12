/**
 * Environment Configuration
 * Manages environment variables and secrets for the NDC Calculator
 */
import { z } from "zod";
/**
 * Environment variable schema using Zod for validation
 */
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    FIREBASE_PROJECT_ID: z.ZodOptional<z.ZodString>;
    FIREBASE_REGION: z.ZodDefault<z.ZodString>;
    RXNORM_API_KEY: z.ZodOptional<z.ZodString>;
    FDA_API_KEY: z.ZodOptional<z.ZodString>;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
    RXNORM_BASE_URL: z.ZodDefault<z.ZodString>;
    FDA_BASE_URL: z.ZodDefault<z.ZodString>;
    OPENAI_MODEL: z.ZodDefault<z.ZodString>;
    API_TIMEOUT_MS: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    MAX_RETRIES: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    CACHE_TTL_HOURS_DRUG: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    CACHE_TTL_HOURS_NDC: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    RATE_LIMIT_REQUESTS_PER_HOUR: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    RATE_LIMIT_BURST: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error", "critical"]>>;
    ENABLE_REQUEST_LOGGING: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    CORS_ALLOWED_ORIGINS: z.ZodDefault<z.ZodString>;
    JWT_EXPIRATION_HOURS: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    ENABLE_AI_MATCHING: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    ENABLE_CACHING: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    ENABLE_ANALYTICS: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "staging";
    FIREBASE_REGION: string;
    RXNORM_BASE_URL: string;
    FDA_BASE_URL: string;
    OPENAI_MODEL: string;
    API_TIMEOUT_MS: number;
    MAX_RETRIES: number;
    CACHE_TTL_HOURS_DRUG: number;
    CACHE_TTL_HOURS_NDC: number;
    RATE_LIMIT_REQUESTS_PER_HOUR: number;
    RATE_LIMIT_BURST: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error" | "critical";
    ENABLE_REQUEST_LOGGING: boolean;
    CORS_ALLOWED_ORIGINS: string;
    JWT_EXPIRATION_HOURS: number;
    ENABLE_AI_MATCHING: boolean;
    ENABLE_CACHING: boolean;
    ENABLE_ANALYTICS: boolean;
    FIREBASE_PROJECT_ID?: string | undefined;
    RXNORM_API_KEY?: string | undefined;
    FDA_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
}, {
    NODE_ENV?: "production" | "development" | "staging" | undefined;
    FIREBASE_PROJECT_ID?: string | undefined;
    FIREBASE_REGION?: string | undefined;
    RXNORM_API_KEY?: string | undefined;
    FDA_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
    RXNORM_BASE_URL?: string | undefined;
    FDA_BASE_URL?: string | undefined;
    OPENAI_MODEL?: string | undefined;
    API_TIMEOUT_MS?: string | undefined;
    MAX_RETRIES?: string | undefined;
    CACHE_TTL_HOURS_DRUG?: string | undefined;
    CACHE_TTL_HOURS_NDC?: string | undefined;
    RATE_LIMIT_REQUESTS_PER_HOUR?: string | undefined;
    RATE_LIMIT_BURST?: string | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | "critical" | undefined;
    ENABLE_REQUEST_LOGGING?: string | undefined;
    CORS_ALLOWED_ORIGINS?: string | undefined;
    JWT_EXPIRATION_HOURS?: string | undefined;
    ENABLE_AI_MATCHING?: string | undefined;
    ENABLE_CACHING?: string | undefined;
    ENABLE_ANALYTICS?: string | undefined;
}>;
/**
 * Validated and typed environment configuration
 */
export declare const env: {
    NODE_ENV: "production" | "development" | "staging";
    FIREBASE_REGION: string;
    RXNORM_BASE_URL: string;
    FDA_BASE_URL: string;
    OPENAI_MODEL: string;
    API_TIMEOUT_MS: number;
    MAX_RETRIES: number;
    CACHE_TTL_HOURS_DRUG: number;
    CACHE_TTL_HOURS_NDC: number;
    RATE_LIMIT_REQUESTS_PER_HOUR: number;
    RATE_LIMIT_BURST: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error" | "critical";
    ENABLE_REQUEST_LOGGING: boolean;
    CORS_ALLOWED_ORIGINS: string;
    JWT_EXPIRATION_HOURS: number;
    ENABLE_AI_MATCHING: boolean;
    ENABLE_CACHING: boolean;
    ENABLE_ANALYTICS: boolean;
    FIREBASE_PROJECT_ID?: string | undefined;
    RXNORM_API_KEY?: string | undefined;
    FDA_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
};
/**
 * Environment helper functions
 */
export declare const isDevelopment: boolean;
export declare const isStaging: boolean;
export declare const isProduction: boolean;
/**
 * Get CORS allowed origins as an array
 */
export declare function getCorsOrigins(): string[];
/**
 * Type export for environment configuration
 */
export type Environment = z.infer<typeof envSchema>;
export {};
