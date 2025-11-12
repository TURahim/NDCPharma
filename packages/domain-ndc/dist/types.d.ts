/**
 * Domain types for NDC business logic
 */
export interface Prescription {
    drugName: string;
    rxcui?: string;
    sig: string;
    daysSupply: number;
    dosageForm?: string;
    strength?: string;
}
export interface Package {
    ndc: string;
    packageSize: number;
    unit: string;
    dosageForm: string;
    isActive: boolean;
}
export interface MatchResult {
    recommendedPackages: Package[];
    totalQuantity: number;
    overfillPercentage: number;
    underfillPercentage: number;
    warnings: string[];
}
