/**
 * Quantity Calculation Utilities
 * Handles total quantity computation with unit conversions
 */
export interface SIGInput {
    dose: number;
    frequency: number;
    unit: string;
}
export interface DrugStrength {
    strength?: string;
    dosageForm?: string;
}
export interface QuantityResult {
    totalQuantity: number;
    warnings: string[];
    details?: {
        method: 'direct' | 'strength_conversion' | 'concentration_conversion';
        calculation: string;
    };
}
/**
 * Compute total quantity needed for prescription
 * @param sig - Prescription SIG (dose, frequency, unit)
 * @param drugStrength - Drug strength information
 * @param daysSupply - Number of days supply
 * @returns Quantity result with warnings
 */
export declare function computeTotalQuantity(sig: SIGInput, drugStrength: DrugStrength, daysSupply: number): QuantityResult;
