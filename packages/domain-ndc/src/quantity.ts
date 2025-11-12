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
export function calculateTotalQuantity(prescription: {
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
}): number {
  const { dosePerAdministration, frequencyPerDay, daysSupply } = prescription;
  
  // Validate inputs
  if (dosePerAdministration <= 0 || frequencyPerDay <= 0 || daysSupply <= 0) {
    throw new Error("All prescription values must be positive numbers");
  }
  
  if (daysSupply > 365) {
    throw new Error("Days' supply cannot exceed 365 days");
  }
  
  // Calculate total quantity
  const totalQuantity = dosePerAdministration * frequencyPerDay * daysSupply;
  
  // Round up to nearest whole unit for solids
  return Math.ceil(totalQuantity);
}

/**
 * Parse structured SIG input (MVP scope)
 * 
 * @param sig - Structured SIG object
 * @returns Parsed dose and frequency
 */
export function parseStructuredSIG(sig: {
  dose: number;
  frequency: number;
  unit: string;
}): {
  dosePerAdministration: number;
  frequencyPerDay: number;
  unit: string;
} {
  return {
    dosePerAdministration: sig.dose,
    frequencyPerDay: sig.frequency,
    unit: sig.unit.toUpperCase(),
  };
}

