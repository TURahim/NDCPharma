"use strict";
/**
 * Quantity Calculation Utilities
 * Handles total quantity computation with unit conversions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTotalQuantity = computeTotalQuantity;
/**
 * Parse strength string to extract numeric value and unit
 * Examples: "500 MG", "10 MG/ML", "250 MG/5ML"
 */
function parseStrength(strengthStr) {
    if (!strengthStr)
        return null;
    // Handle "X MG/Y ML" format (concentration)
    const concentrationMatch = strengthStr.match(/(\d+\.?\d*)\s*(\w+)\s*\/\s*(\d+\.?\d*)\s*(\w+)/i);
    if (concentrationMatch) {
        const [, value, unit, perValue, perUnit] = concentrationMatch;
        return {
            value: parseFloat(value) / parseFloat(perValue),
            unit: unit.toUpperCase(),
            perUnit: perUnit.toUpperCase(),
        };
    }
    // Handle "X MG" format (simple strength)
    const simpleMatch = strengthStr.match(/(\d+\.?\d*)\s*(\w+)/i);
    if (simpleMatch) {
        const [, value, unit] = simpleMatch;
        return {
            value: parseFloat(value),
            unit: unit.toUpperCase(),
        };
    }
    return null;
}
/**
 * Normalize unit strings for comparison
 */
function normalizeUnit(unit) {
    const normalized = unit.toLowerCase().trim();
    // Handle common variations
    const unitMap = {
        'tab': 'tablet',
        'tabs': 'tablet',
        'tablet': 'tablet',
        'tablets': 'tablet',
        'cap': 'capsule',
        'caps': 'capsule',
        'capsule': 'capsule',
        'capsules': 'capsule',
        'ml': 'ml',
        'milliliter': 'ml',
        'milliliters': 'ml',
        'mg': 'mg',
        'milligram': 'mg',
        'milligrams': 'mg',
    };
    return unitMap[normalized] || normalized;
}
/**
 * Compute total quantity needed for prescription
 * @param sig - Prescription SIG (dose, frequency, unit)
 * @param drugStrength - Drug strength information
 * @param daysSupply - Number of days supply
 * @returns Quantity result with warnings
 */
function computeTotalQuantity(sig, drugStrength, daysSupply) {
    const warnings = [];
    const sigUnit = normalizeUnit(sig.unit);
    const strength = parseStrength(drugStrength.strength || '');
    // Case 1: Direct calculation (tablet/capsule units)
    if (sigUnit === 'tablet' || sigUnit === 'capsule') {
        const totalQuantity = sig.dose * sig.frequency * daysSupply;
        return {
            totalQuantity,
            warnings,
            details: {
                method: 'direct',
                calculation: `${sig.dose} × ${sig.frequency} × ${daysSupply} = ${totalQuantity} ${sig.unit}`,
            },
        };
    }
    // Case 2: Liquid (mL)
    if (sigUnit === 'ml') {
        const totalQuantity = sig.dose * sig.frequency * daysSupply;
        if (!strength) {
            warnings.push('Drug strength not available. Calculated volume only.');
        }
        return {
            totalQuantity,
            warnings,
            details: {
                method: 'direct',
                calculation: `${sig.dose} mL × ${sig.frequency} × ${daysSupply} = ${totalQuantity} mL`,
            },
        };
    }
    // Case 3: mg dosing with tablet/capsule form
    if (sigUnit === 'mg' && strength) {
        if (strength.unit === 'MG') {
            // Calculate tablets needed
            const tabletsPerDose = sig.dose / strength.value;
            const totalTablets = tabletsPerDose * sig.frequency * daysSupply;
            if (tabletsPerDose !== Math.floor(tabletsPerDose)) {
                warnings.push(`Dose (${sig.dose} mg) requires ${tabletsPerDose.toFixed(2)} tablets per dose. ` +
                    `This may not be practical. Verify prescription.`);
            }
            return {
                totalQuantity: Math.ceil(totalTablets),
                warnings,
                details: {
                    method: 'strength_conversion',
                    calculation: `${sig.dose} mg ÷ ${strength.value} mg/tablet × ${sig.frequency} × ${daysSupply} = ${Math.ceil(totalTablets)} tablets`,
                },
            };
        }
        if (strength.perUnit === 'ML') {
            // mg/mL concentration - calculate mL needed
            const mlPerDose = sig.dose / strength.value;
            const totalML = mlPerDose * sig.frequency * daysSupply;
            return {
                totalQuantity: totalML,
                warnings,
                details: {
                    method: 'concentration_conversion',
                    calculation: `${sig.dose} mg ÷ ${strength.value} mg/mL × ${sig.frequency} × ${daysSupply} = ${totalML} mL`,
                },
            };
        }
    }
    // Case 4: Unit mismatch - fall back to direct calculation with warning
    const totalQuantity = sig.dose * sig.frequency * daysSupply;
    warnings.push(`Unit mismatch: prescription in "${sig.unit}" but drug strength is "${drugStrength.strength || 'unknown'}". ` +
        `Using direct calculation. Verify quantity with prescriber.`);
    return {
        totalQuantity,
        warnings,
        details: {
            method: 'direct',
            calculation: `${sig.dose} × ${sig.frequency} × ${daysSupply} = ${totalQuantity} (with unit mismatch warning)`,
        },
    };
}
