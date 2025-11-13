/**
 * Package Selection and Matching Utilities
 * Implements MVP-safe package selection logic
 */
export interface PackageCandidate {
    ndc: string;
    packageSize: {
        quantity: number;
        unit: string;
    };
    dosageForm: string;
    marketingStatus: string;
    isActive: boolean;
    labelerName?: string;
}
export interface PackageSelection {
    selected: PackageCandidate;
    overfillPercentage: number;
    underfillPercentage: number;
    warnings: string[];
    explanation: string;
}
/**
 * Choose the best package for the required quantity
 * MVP approach: Single package only, minimal overfill
 *
 * @param packages - Array of available packages (should be pre-filtered for active status)
 * @param requiredQuantity - Total quantity needed
 * @returns Best package selection with metadata
 */
export declare function chooseBestPackage(packages: PackageCandidate[], requiredQuantity: number): PackageSelection;
/**
 * Calculate overfill/underfill percentages for a single package
 */
export declare function calculateFillPrecision(packageQuantity: number, requiredQuantity: number): {
    overfillPercentage: number;
    underfillPercentage: number;
    fillPrecision: 'exact' | 'overfill' | 'underfill';
};
