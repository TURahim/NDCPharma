/**
 * Package Matching Logic
 * Pure functions for matching quantities to packages and computing over/underfill
 */
import { Package, MatchResult } from "./types";
/**
 * Match required quantity to available packages
 * Prefers exact match, ≤5% overfill, else shows top-3 combinations
 *
 * @param requiredQuantity - Total quantity needed
 * @param availablePackages - Array of available packages
 * @returns Match result with recommendations
 */
export declare function matchPackagesToQuantity(requiredQuantity: number, availablePackages: Package[]): MatchResult;
/**
 * Calculate overfill percentage
 *
 * @param dispensed - Quantity being dispensed
 * @param required - Quantity required
 * @returns Overfill percentage
 */
export declare function calculateOverfill(dispensed: number, required: number): number;
/**
 * Calculate underfill percentage
 *
 * @param dispensed - Quantity being dispensed
 * @param required - Quantity required
 * @returns Underfill percentage
 */
export declare function calculateUnderfill(dispensed: number, required: number): number;
