/**
 * Quantity Calculation Logic
 * Pure functions for calculating required medication quantities
 * MVP: Solids only (tablets, capsules)
 */
/**
 * Calculate total quantity needed based on prescription
 * Formula: dose × frequency × days' supply
 *
 * MVP: Structured input only, defer free-text SIG parsing
 *
 * @param prescription - Prescription details
 * @returns Total quantity needed
 */
export declare function calculateTotalQuantity(prescription: {
    /**
     * Dose per administration (e.g., 2 tablets)
     */
    dosePerAdministration: number;
    /**
     * Frequency per day (e.g., 2 for twice daily)
     */
    frequencyPerDay: number;
    /**
     * Days' supply
     */
    daysSupply: number;
}): number;
/**
 * Parse structured SIG input (MVP scope)
 *
 * @param sig - Structured SIG object
 * @returns Parsed dose and frequency
 */
export declare function parseStructuredSIG(sig: {
    dose: number;
    frequency: number;
    unit: string;
}): {
    dosePerAdministration: number;
    frequencyPerDay: number;
    unit: string;
};
