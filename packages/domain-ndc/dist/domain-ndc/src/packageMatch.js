"use strict";
/**
 * Package Selection and Matching Utilities
 * Implements MVP-safe package selection logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseBestPackage = chooseBestPackage;
exports.calculateFillPrecision = calculateFillPrecision;
/**
 * Choose the best package for the required quantity
 * MVP approach: Single package only, minimal overfill
 *
 * @param packages - Array of available packages (should be pre-filtered for active status)
 * @param requiredQuantity - Total quantity needed
 * @returns Best package selection with metadata
 */
function chooseBestPackage(packages, requiredQuantity) {
    const warnings = [];
    if (packages.length === 0) {
        throw new Error('No packages available for selection');
    }
    // Sort packages by size ascending
    const sortedPackages = [...packages].sort((a, b) => a.packageSize.quantity - b.packageSize.quantity);
    // Strategy 1: Find exact match
    const exactMatch = sortedPackages.find(pkg => pkg.packageSize.quantity === requiredQuantity);
    if (exactMatch) {
        return {
            selected: exactMatch,
            overfillPercentage: 0,
            underfillPercentage: 0,
            warnings: [],
            explanation: `Exact match: ${exactMatch.packageSize.quantity} ${exactMatch.packageSize.unit} package meets requirement perfectly`,
        };
    }
    // Strategy 2: Find smallest package that meets or exceeds requirement
    const adequatePackage = sortedPackages.find(pkg => pkg.packageSize.quantity >= requiredQuantity);
    if (adequatePackage) {
        const overfill = adequatePackage.packageSize.quantity - requiredQuantity;
        const overfillPct = (overfill / requiredQuantity) * 100;
        if (overfillPct > 20) {
            warnings.push(`Significant overfill: ${overfillPct.toFixed(1)}% (${overfill} extra ${adequatePackage.packageSize.unit}). ` +
                `Patient will have leftover medication. Consider discussing with prescriber.`);
        }
        return {
            selected: adequatePackage,
            overfillPercentage: overfillPct,
            underfillPercentage: 0,
            warnings,
            explanation: `Selected ${adequatePackage.packageSize.quantity} ${adequatePackage.packageSize.unit} package ` +
                `(smallest available that meets ${requiredQuantity} ${adequatePackage.packageSize.unit} requirement)`,
        };
    }
    // Strategy 3: No package large enough - select largest available
    const largestPackage = sortedPackages[sortedPackages.length - 1];
    const underfill = requiredQuantity - largestPackage.packageSize.quantity;
    const underfillPct = (underfill / requiredQuantity) * 100;
    warnings.push(`No package meets required quantity. Largest available is ${largestPackage.packageSize.quantity} ${largestPackage.packageSize.unit}. ` +
        `Underfill: ${underfillPct.toFixed(1)}% (${underfill} ${largestPackage.packageSize.unit} short). ` +
        `Patient will need early refill.`);
    return {
        selected: largestPackage,
        overfillPercentage: 0,
        underfillPercentage: underfillPct,
        warnings,
        explanation: `Selected largest available package: ${largestPackage.packageSize.quantity} ${largestPackage.packageSize.unit} ` +
            `(underfills requirement of ${requiredQuantity} ${largestPackage.packageSize.unit})`,
    };
}
/**
 * Calculate overfill/underfill percentages for a single package
 */
function calculateFillPrecision(packageQuantity, requiredQuantity) {
    if (packageQuantity === requiredQuantity) {
        return {
            overfillPercentage: 0,
            underfillPercentage: 0,
            fillPrecision: 'exact',
        };
    }
    if (packageQuantity > requiredQuantity) {
        const overfill = ((packageQuantity - requiredQuantity) / requiredQuantity) * 100;
        return {
            overfillPercentage: overfill,
            underfillPercentage: 0,
            fillPrecision: 'overfill',
        };
    }
    const underfill = ((requiredQuantity - packageQuantity) / requiredQuantity) * 100;
    return {
        overfillPercentage: 0,
        underfillPercentage: underfill,
        fillPrecision: 'underfill',
    };
}
