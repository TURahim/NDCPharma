"use strict";
/**
 * Package Matching Logic
 * Pure functions for matching quantities to packages and computing over/underfill
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchPackagesToQuantity = matchPackagesToQuantity;
exports.calculateOverfill = calculateOverfill;
exports.calculateUnderfill = calculateUnderfill;
/**
 * Match required quantity to available packages
 * Prefers exact match, ≤5% overfill, else shows top-3 combinations
 *
 * @param requiredQuantity - Total quantity needed
 * @param availablePackages - Array of available packages
 * @returns Match result with recommendations
 */
function matchPackagesToQuantity(requiredQuantity, availablePackages) {
    if (requiredQuantity <= 0) {
        throw new Error("Required quantity must be positive");
    }
    if (availablePackages.length === 0) {
        throw new Error("No packages available");
    }
    // Filter to active packages only
    const activePackages = availablePackages.filter(p => p.isActive);
    if (activePackages.length === 0) {
        return {
            recommendedPackages: [],
            totalQuantity: 0,
            overfillPercentage: 0,
            underfillPercentage: 0,
            warnings: ["No active packages available"],
        };
    }
    // Sort packages by size (ascending)
    const sortedPackages = [...activePackages].sort((a, b) => a.packageSize - b.packageSize);
    // Try to find exact match
    const exactMatch = sortedPackages.find(p => p.packageSize === requiredQuantity);
    if (exactMatch) {
        return {
            recommendedPackages: [exactMatch],
            totalQuantity: exactMatch.packageSize,
            overfillPercentage: 0,
            underfillPercentage: 0,
            warnings: [],
        };
    }
    // Try to find package with ≤5% overfill
    for (const pkg of sortedPackages) {
        if (pkg.packageSize >= requiredQuantity) {
            const overfill = ((pkg.packageSize - requiredQuantity) / requiredQuantity) * 100;
            if (overfill <= 5) {
                return {
                    recommendedPackages: [pkg],
                    totalQuantity: pkg.packageSize,
                    overfillPercentage: overfill,
                    underfillPercentage: 0,
                    warnings: [],
                };
            }
        }
    }
    // Find best single package (minimum overfill)
    const bestSingle = sortedPackages
        .filter(p => p.packageSize >= requiredQuantity)
        .reduce((best, current) => {
        if (!best)
            return current;
        const currentOverfill = current.packageSize - requiredQuantity;
        const bestOverfill = best.packageSize - requiredQuantity;
        return currentOverfill < bestOverfill ? current : best;
    }, null);
    if (bestSingle) {
        const overfill = ((bestSingle.packageSize - requiredQuantity) / requiredQuantity) * 100;
        return {
            recommendedPackages: [bestSingle],
            totalQuantity: bestSingle.packageSize,
            overfillPercentage: overfill,
            underfillPercentage: 0,
            warnings: overfill > 10 ? [`Overfill exceeds 10% (${overfill.toFixed(1)}%)`] : [],
        };
    }
    // No single package works - would need combination logic (future PR)
    return {
        recommendedPackages: [],
        totalQuantity: 0,
        overfillPercentage: 0,
        underfillPercentage: 0,
        warnings: ["No suitable package found. Multi-package combinations not yet implemented."],
    };
}
/**
 * Calculate overfill percentage
 *
 * @param dispensed - Quantity being dispensed
 * @param required - Quantity required
 * @returns Overfill percentage
 */
function calculateOverfill(dispensed, required) {
    if (required <= 0) {
        throw new Error("Required quantity must be positive");
    }
    if (dispensed < required) {
        return 0; // No overfill if underfilled
    }
    return ((dispensed - required) / required) * 100;
}
/**
 * Calculate underfill percentage
 *
 * @param dispensed - Quantity being dispensed
 * @param required - Quantity required
 * @returns Underfill percentage
 */
function calculateUnderfill(dispensed, required) {
    if (required <= 0) {
        throw new Error("Required quantity must be positive");
    }
    if (dispensed >= required) {
        return 0; // No underfill if overfilled or exact
    }
    return ((required - dispensed) / required) * 100;
}
