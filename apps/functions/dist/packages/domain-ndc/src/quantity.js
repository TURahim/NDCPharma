"use strict";
/**
 * Quantity Calculation Logic
 * Pure functions for calculating required medication quantities
 * MVP: Solids only (tablets, capsules)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTotalQuantity = calculateTotalQuantity;
exports.parseStructuredSIG = parseStructuredSIG;
/**
 * Calculate total quantity needed based on prescription
 * Formula: dose × frequency × days' supply
 *
 * MVP: Structured input only, defer free-text SIG parsing
 *
 * @param prescription - Prescription details
 * @returns Total quantity needed
 */
function calculateTotalQuantity(prescription) {
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
function parseStructuredSIG(sig) {
    return {
        dosePerAdministration: sig.dose,
        frequencyPerDay: sig.frequency,
        unit: sig.unit.toUpperCase(),
    };
}
//# sourceMappingURL=quantity.js.map