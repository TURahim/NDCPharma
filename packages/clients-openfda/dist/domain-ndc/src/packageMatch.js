"use strict";
/**
 * Package Selection and Matching Utilities
 * Implements MVP-safe package selection logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseBestPackage = chooseBestPackage;
exports.calculateFillPrecision = calculateFillPrecision;
exports.selectLiquidPackages = selectLiquidPackages;
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
/**
 * Select liquid packages for mL-based medications
 * Similar to chooseBestPackage but optimized for liquid volumes
 *
 * @param packages - Array of liquid medication packages (ML or L units)
 * @param requiredML - Total mL needed
 * @returns Best package selection with metadata
 */
function selectLiquidPackages(packages, requiredML) {
    const warnings = [];
    if (packages.length === 0) {
        throw new Error('No liquid packages available for selection');
    }
    // Normalize all packages to mL
    const normalizedPackages = packages.map(pkg => {
        let quantityML = pkg.packageSize.quantity;
        const unit = pkg.packageSize.unit.toUpperCase();
        // Convert liters to milliliters
        if (unit === 'L' || unit === 'LITER' || unit === 'LITERS') {
            quantityML = pkg.packageSize.quantity * 1000;
        }
        return {
            ...pkg,
            normalizedQuantityML: quantityML,
        };
    });
    // Sort by normalized quantity ascending
    const sortedPackages = [...normalizedPackages].sort((a, b) => a.normalizedQuantityML - b.normalizedQuantityML);
    // Strategy 1: Find exact match (within 1 mL tolerance for rounding)
    const exactMatch = sortedPackages.find(pkg => Math.abs(pkg.normalizedQuantityML - requiredML) < 1);
    if (exactMatch) {
        return {
            selected: exactMatch,
            overfillPercentage: 0,
            underfillPercentage: 0,
            warnings: [],
            explanation: `Exact match: ${exactMatch.packageSize.quantity} ${exactMatch.packageSize.unit} bottle meets requirement`,
        };
    }
    // Strategy 2: Find smallest package with minimal overfill (within 10%)
    const minimalOverfillPackage = sortedPackages.find(pkg => {
        const overfill = pkg.normalizedQuantityML - requiredML;
        const overfillPct = (overfill / requiredML) * 100;
        return overfill > 0 && overfillPct <= 10;
    });
    if (minimalOverfillPackage) {
        const overfill = minimalOverfillPackage.normalizedQuantityML - requiredML;
        const overfillPct = (overfill / requiredML) * 100;
        return {
            selected: minimalOverfillPackage,
            overfillPercentage: overfillPct,
            underfillPercentage: 0,
            warnings,
            explanation: `Selected ${minimalOverfillPackage.packageSize.quantity} ${minimalOverfillPackage.packageSize.unit} bottle ` +
                `(${overfillPct.toFixed(1)}% overfill, within acceptable range)`,
        };
    }
    // Strategy 3: Find any package that meets requirement
    const adequatePackage = sortedPackages.find(pkg => pkg.normalizedQuantityML >= requiredML);
    if (adequatePackage) {
        const overfill = adequatePackage.normalizedQuantityML - requiredML;
        const overfillPct = (overfill / requiredML) * 100;
        if (overfillPct > 20) {
            warnings.push(`Significant overfill: ${overfillPct.toFixed(1)}% (${overfill.toFixed(1)} mL extra). ` +
                `Patient will have leftover medication. Consider discussing with prescriber.`);
        }
        return {
            selected: adequatePackage,
            overfillPercentage: overfillPct,
            underfillPercentage: 0,
            warnings,
            explanation: `Selected ${adequatePackage.packageSize.quantity} ${adequatePackage.packageSize.unit} bottle ` +
                `(smallest available that meets ${requiredML.toFixed(1)} mL requirement)`,
        };
    }
    // Strategy 4: No single package large enough - select largest and warn
    const largestPackage = sortedPackages[sortedPackages.length - 1];
    const underfill = requiredML - largestPackage.normalizedQuantityML;
    const underfillPct = (underfill / requiredML) * 100;
    warnings.push(`No single bottle meets required volume. Largest available is ${largestPackage.packageSize.quantity} ${largestPackage.packageSize.unit}. ` +
        `Underfill: ${underfillPct.toFixed(1)}% (${underfill.toFixed(1)} mL short). ` +
        `May require multiple bottles or patient will need early refill.`);
    return {
        selected: largestPackage,
        overfillPercentage: 0,
        underfillPercentage: underfillPct,
        warnings,
        explanation: `Selected largest available bottle: ${largestPackage.packageSize.quantity} ${largestPackage.packageSize.unit} ` +
            `(underfills requirement of ${requiredML.toFixed(1)} mL)`,
    };
}
