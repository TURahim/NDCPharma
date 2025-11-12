/**
 * Shared Type Definitions
 * Common types used across the application
 */

/**
 * User roles
 */
export type UserRole = "pharmacist" | "pharmacy_technician" | "admin";

/**
 * Dosage form categories
 */
export type DosageFormCategory = "solid" | "liquid" | "injectable" | "topical" | "inhalation" | "special";

/**
 * Unit types
 */
export type UnitType = "solid" | "liquid" | "weight" | "volume" | "insulin" | "inhalation";

/**
 * Marketing status types
 */
export type MarketingStatus = "active" | "inactive" | "discontinued" | "recalled";

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

/**
 * Cache operation types
 */
export type CacheOperation = "hit" | "miss" | "set" | "invalidate";

/**
 * Warning severity levels
 */
export type WarningSeverity = "low" | "medium" | "high";

/**
 * API response status
 */
export type APIResponseStatus = "success" | "error";

/**
 * Calculation confidence levels
 */
export type ConfidenceLevel = "high" | "medium" | "low";

