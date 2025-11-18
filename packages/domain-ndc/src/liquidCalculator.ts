/**
 * Liquid Medication Calculator
 * Calculates total liquid volume needed based on prescribed dose and concentration
 */

import type { LiquidCalculationInput, LiquidCalculationResult, Concentration } from './types';

/**
 * Calculate total liquid quantity needed for prescription
 * 
 * @param input - Calculation input with dose, frequency, days supply, and concentration
 * @returns Calculation result with mL amounts and formula
 * 
 * @example
 * ```typescript
 * const result = calculateLiquidQuantity({
 *   prescribedDoseMg: 400,
 *   frequency: 3,
 *   daysSupply: 7,
 *   concentration: { value: 250, unit: 'MG', perValue: 5, perUnit: 'ML', ratio: 50, rawString: '250 MG/5 ML' }
 * });
 * // Result: { totalML: 168, mLPerDose: 8, mLPerDay: 24, formula: "8 mL/dose × 3 doses/day × 7 days = 168 mL" }
 * ```
 */
export function calculateLiquidQuantity(input: LiquidCalculationInput): LiquidCalculationResult {
  const warnings: string[] = [];
  
  // Validate inputs
  if (input.prescribedDoseMg <= 0) {
    throw new Error('Prescribed dose must be greater than zero');
  }
  if (input.frequency <= 0) {
    throw new Error('Frequency must be greater than zero');
  }
  if (input.daysSupply <= 0) {
    throw new Error('Days supply must be greater than zero');
  }
  
  // Calculate mL per dose
  const mLPerDose = convertMgToML(input.prescribedDoseMg, input.concentration);
  
  // Calculate mL per day
  const mLPerDay = mLPerDose * input.frequency;
  
  // Calculate total mL
  const totalML = mLPerDay * input.daysSupply;
  
  // Generate formula
  const formula = generateLiquidFormula(mLPerDose, input.frequency, input.daysSupply, totalML);
  
  // Validate dose and volume
  const doseWarnings = validateLiquidDose(input.prescribedDoseMg, input.concentration, mLPerDose);
  warnings.push(...doseWarnings);
  
  const volumeWarnings = validateLiquidVolume(totalML);
  warnings.push(...volumeWarnings);
  
  return {
    prescribedDoseMg: input.prescribedDoseMg,
    concentration: input.concentration,
    mLPerDose: Math.round(mLPerDose * 100) / 100, // Round to 2 decimal places
    mLPerDay: Math.round(mLPerDay * 100) / 100,
    totalML: Math.round(totalML * 100) / 100,
    formula,
    warnings,
    isValid: warnings.length === 0,
  };
}

/**
 * Convert mg dose to mL volume using concentration
 * 
 * @param doseMg - Dose in milligrams
 * @param concentration - Medication concentration
 * @returns Volume in milliliters
 * 
 * @example
 * ```typescript
 * // For 250 MG/5 ML concentration (50 mg/mL ratio)
 * convertMgToML(400, concentration); // Returns 8 mL
 * ```
 */
export function convertMgToML(doseMg: number, concentration: Concentration): number {
  if (concentration.ratio === 0) {
    throw new Error('Concentration ratio cannot be zero');
  }
  
  // Formula: mL = doseMg ÷ (mg/mL ratio)
  const mL = doseMg / concentration.ratio;
  
  return mL;
}

/**
 * Validate liquid dose against concentration
 * 
 * @param doseMg - Dose in milligrams
 * @param concentration - Medication concentration
 * @param mLPerDose - Calculated mL per dose
 * @returns Array of warning messages
 */
export function validateLiquidDose(
  doseMg: number,
  concentration: Concentration,
  mLPerDose: number
): string[] {
  const warnings: string[] = [];
  
  // Check if dose is too small
  if (doseMg < concentration.ratio) {
    warnings.push(
      `Dose (${doseMg} mg) is smaller than the concentration ratio (${concentration.ratio} mg/mL). ` +
      `This may result in very small volumes that are difficult to measure.`
    );
  }
  
  // Check if dose doesn't align well with concentration
  const remainder = doseMg % concentration.value;
  if (remainder !== 0 && remainder / concentration.value > 0.1) {
    warnings.push(
      `Dose (${doseMg} mg) doesn't align well with the concentration (${concentration.rawString}). ` +
      `This may result in fractional mL amounts. Verify with prescriber.`
    );
  }
  
  // Check if dose is unusually large
  if (doseMg > concentration.ratio * 10) {
    warnings.push(
      `Dose (${doseMg} mg) is very large relative to the concentration. ` +
      `This results in ${mLPerDose.toFixed(2)} mL per dose. Verify with prescriber.`
    );
  }
  
  // Check if mL per dose is too large
  if (mLPerDose > 50) {
    warnings.push(
      `Volume per dose (${mLPerDose.toFixed(2)} mL) is unusually large. ` +
      `This may be difficult for the patient to administer. Verify with prescriber.`
    );
  }
  
  // Check if mL per dose is too small
  if (mLPerDose < 0.1) {
    warnings.push(
      `Volume per dose (${mLPerDose.toFixed(2)} mL) is very small and may be difficult to measure accurately. ` +
      `Consider alternative concentration or dosage form.`
    );
  }
  
  return warnings;
}

/**
 * Generate human-readable formula string
 * 
 * @param mLPerDose - Milliliters per dose
 * @param frequency - Doses per day
 * @param daysSupply - Days supply
 * @param totalML - Total milliliters
 * @returns Formula string
 * 
 * @example
 * ```typescript
 * generateLiquidFormula(8, 3, 7, 168);
 * // Returns: "8 mL/dose × 3 doses/day × 7 days = 168 mL"
 * ```
 */
export function generateLiquidFormula(
  mLPerDose: number,
  frequency: number,
  daysSupply: number,
  totalML: number
): string {
  const mLPerDoseStr = (Math.round(mLPerDose * 100) / 100).toString();
  const frequencyStr = frequency === 1 ? '1 dose/day' : `${frequency} doses/day`;
  const daysStr = daysSupply === 1 ? '1 day' : `${daysSupply} days`;
  const totalMLStr = (Math.round(totalML * 100) / 100).toString();
  
  return `${mLPerDoseStr} mL/dose × ${frequencyStr} × ${daysStr} = ${totalMLStr} mL`;
}

/**
 * Check if total liquid volume is reasonable
 * 
 * @param totalML - Total milliliters
 * @returns Array of warning messages
 */
export function validateLiquidVolume(totalML: number): string[] {
  const warnings: string[] = [];
  
  // Check if volume is unusually large
  if (totalML > 1000) {
    warnings.push(
      `Total volume (${totalML.toFixed(2)} mL) exceeds 1 liter. ` +
      `This is unusually large for a liquid medication. Verify prescription.`
    );
  }
  
  // Check if volume is unusually small
  if (totalML < 5) {
    warnings.push(
      `Total volume (${totalML.toFixed(2)} mL) is very small. ` +
      `This may not be practical for dispensing. Verify prescription.`
    );
  }
  
  return warnings;
}

/**
 * Check if total volume is within reasonable range
 * 
 * @param totalML - Total milliliters
 * @returns True if volume is reasonable (5-1000 mL)
 */
export function isReasonableLiquidVolume(totalML: number): boolean {
  return totalML >= 5 && totalML <= 1000;
}

