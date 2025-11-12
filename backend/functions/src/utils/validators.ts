/**
 * Input Validation Utilities
 * Provides validation helpers for sanitizing and validating user inputs
 */

import { BUSINESS_RULES } from "../config/constants";
import {
  InvalidDrugNameError,
  InvalidNDCError,
  InvalidSIGError,
  InvalidDaysSupplyError,
} from "./errors";

/**
 * Validate drug name
 */
export function validateDrugName(drugName: string): string {
  if (!drugName || typeof drugName !== "string") {
    throw new InvalidDrugNameError(drugName);
  }

  const trimmed = drugName.trim();

  // Check minimum length
  if (trimmed.length < 2) {
    throw new InvalidDrugNameError(trimmed);
  }

  // Check maximum length
  if (trimmed.length > 200) {
    throw new InvalidDrugNameError(trimmed);
  }

  // Check for invalid characters (allow letters, numbers, spaces, hyphens, parentheses)
  const validPattern = /^[a-zA-Z0-9\s\-()/.]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidDrugNameError(trimmed);
  }

  return trimmed;
}

/**
 * Validate NDC format
 */
export function validateNDC(ndc: string): string {
  if (!ndc || typeof ndc !== "string") {
    throw new InvalidNDCError(ndc);
  }

  const trimmed = ndc.trim();

  // Check against NDC format regex
  if (!BUSINESS_RULES.NDC_FORMAT_REGEX.test(trimmed)) {
    throw new InvalidNDCError(trimmed);
  }

  return trimmed;
}

/**
 * Normalize NDC to standard 11-digit format with dashes (XXXXX-XXXX-XX)
 */
export function normalizeNDC(ndc: string): string {
  const validated = validateNDC(ndc);

  // If already in correct format, return as is
  if (/^\d{5}-\d{4}-\d{2}$/.test(validated)) {
    return validated;
  }

  // Remove all dashes
  const digitsOnly = validated.replace(/-/g, "");

  // Handle different formats
  if (digitsOnly.length === 10) {
    // 10-digit: convert to 11-digit by padding the middle segment
    // Format: XXXXX-XXX-XX → XXXXX-0XXX-XX
    return `${digitsOnly.slice(0, 5)}-0${digitsOnly.slice(5, 8)}-${digitsOnly.slice(8)}`;
  } else if (digitsOnly.length === 11) {
    // 11-digit: format with dashes
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}-${digitsOnly.slice(9)}`;
  }

  throw new InvalidNDCError(ndc);
}

/**
 * Validate SIG (prescription directions)
 */
export function validateSIG(sig: string): string {
  if (!sig || typeof sig !== "string") {
    throw new InvalidSIGError(sig);
  }

  const trimmed = sig.trim();

  // Check minimum length
  if (trimmed.length < 3) {
    throw new InvalidSIGError(trimmed);
  }

  // Check maximum length
  if (trimmed.length > 500) {
    throw new InvalidSIGError(trimmed);
  }

  // Basic sanitization: remove potentially dangerous characters
  const sanitized = trimmed.replace(/[<>{}]/g, "");

  return sanitized;
}

/**
 * Validate days' supply
 */
export function validateDaysSupply(daysSupply: number): number {
  if (typeof daysSupply !== "number" || isNaN(daysSupply)) {
    throw new InvalidDaysSupplyError(daysSupply);
  }

  if (daysSupply < BUSINESS_RULES.MIN_DAYS_SUPPLY || daysSupply > BUSINESS_RULES.MAX_DAYS_SUPPLY) {
    throw new InvalidDaysSupplyError(daysSupply);
  }

  // Round to nearest integer
  return Math.round(daysSupply);
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>{}]/g, "") // Remove HTML/script tags
    .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number, fieldName: string): number {
  if (typeof value !== "number" || isNaN(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return value;
}

/**
 * Validate integer
 */
export function validateInteger(value: number, fieldName: string): number {
  if (typeof value !== "number" || isNaN(value) || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return value;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
  return email.toLowerCase().trim();
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  enumValues: readonly T[],
  fieldName: string
): T {
  if (!enumValues.includes(value as T)) {
    throw new Error(
      `Invalid ${fieldName}. Must be one of: ${enumValues.join(", ")}`
    );
  }
  return value as T;
}

