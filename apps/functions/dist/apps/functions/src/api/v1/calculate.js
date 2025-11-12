"use strict";
/**
 * Main Calculator Endpoint
 * Orchestrates all services to deliver NDC calculation results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHandler = calculateHandler;
const _clients_rxnorm_1 = require("@clients-rxnorm");
const _clients_openfda_1 = require("@clients-openfda");
const _core_guardrails_1 = require("@core-guardrails");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'CalculateEndpoint' });
/**
 * POST /api/v1/calculate
 * Main calculation endpoint
 */
async function calculateHandler(req, res) {
    const startTime = Date.now();
    const request = req.body;
    const explanations = [];
    const warnings = [];
    const excluded = [];
    try {
        logger.info('Starting NDC calculation', {
            drug: request.drug,
            daysSupply: request.daysSupply,
        });
        // ==========================================
        // STEP 1: Normalize drug name to RxCUI
        // ==========================================
        let rxcui;
        let drugName;
        let dosageForm;
        let strength;
        if (request.drug.rxcui) {
            // RxCUI provided, use directly
            rxcui = request.drug.rxcui;
            logger.debug('Using provided RxCUI', { rxcui });
            explanations.push({
                step: 'normalization',
                description: `Using provided RxCUI: ${rxcui}`,
                details: { source: 'user_provided' },
            });
        }
        else if (request.drug.name) {
            // Normalize drug name to RxCUI
            logger.debug('Normalizing drug name', { drugName: request.drug.name });
            const normalizationResult = await (0, _clients_rxnorm_1.nameToRxCui)(request.drug.name);
            if (!normalizationResult.rxcui) {
                throw new Error(`Drug not found: ${request.drug.name}`);
            }
            rxcui = normalizationResult.rxcui;
            drugName = normalizationResult.name;
            dosageForm = normalizationResult.dosageForm;
            strength = normalizationResult.strength;
            logger.info('Drug normalized successfully', {
                originalName: request.drug.name,
                normalizedName: drugName,
                rxcui,
                confidence: normalizationResult.confidence,
            });
            explanations.push({
                step: 'normalization',
                description: `Normalized "${request.drug.name}" to RxCUI ${rxcui} (${drugName})`,
                details: {
                    confidence: normalizationResult.confidence,
                    dosageForm,
                    strength,
                },
            });
            if (normalizationResult.confidence < 0.8) {
                warnings.push(`Drug name confidence is ${(normalizationResult.confidence * 100).toFixed(0)}%. ` +
                    `Please verify: ${drugName}`);
            }
        }
        else {
            throw new Error('Either drug name or RxCUI must be provided');
        }
        // ==========================================
        // STEP 2: Fetch NDC packages from FDA
        // ==========================================
        logger.debug('Fetching NDC packages from FDA', { rxcui });
        const allPackages = await _clients_openfda_1.fdaClient.getNDCsByRxCUI(rxcui, { limit: 100 });
        if (!allPackages || allPackages.length === 0) {
            throw new Error(`No NDC packages found for RxCUI: ${rxcui}`);
        }
        logger.info('Retrieved NDC packages from FDA', {
            rxcui,
            totalPackages: allPackages.length,
        });
        explanations.push({
            step: 'fetch_ndcs',
            description: `Retrieved ${allPackages.length} NDC packages from FDA database`,
            details: {
                rxcui,
                source: 'openFDA',
            },
        });
        // Filter active packages
        const activePackages = allPackages.filter((pkg) => pkg.marketingStatus === 'ACTIVE');
        const inactiveCount = allPackages.length - activePackages.length;
        if (inactiveCount > 0) {
            explanations.push({
                step: 'filter_active',
                description: `Filtered out ${inactiveCount} inactive/discontinued packages`,
                details: { activeCount: activePackages.length },
            });
            // Track excluded NDCs
            allPackages
                .filter((pkg) => pkg.marketingStatus !== 'ACTIVE')
                .forEach((pkg) => {
                excluded.push({
                    ndc: pkg.ndc,
                    reason: `Inactive or discontinued (status: ${String(pkg.marketingStatus)})`,
                    marketingStatus: String(pkg.marketingStatus),
                });
            });
        }
        if (activePackages.length === 0) {
            throw new Error('No active NDC packages available for this drug');
        }
        // Filter by dosage form if specified
        let filteredPackages = activePackages;
        if (dosageForm && request.sig.unit) {
            const normalizedUnit = request.sig.unit.toUpperCase();
            filteredPackages = activePackages.filter(pkg => pkg.dosageForm.toUpperCase() === normalizedUnit ||
                pkg.packageSize.unit.toUpperCase() === normalizedUnit);
            if (filteredPackages.length > 0) {
                explanations.push({
                    step: 'filter_dosage_form',
                    description: `Filtered to ${filteredPackages.length} packages matching dosage form: ${normalizedUnit}`,
                });
            }
            else {
                // If no exact match, use all active packages
                filteredPackages = activePackages;
                warnings.push(`No packages found matching dosage form "${request.sig.unit}". ` +
                    `Showing all available dosage forms.`);
            }
        }
        // Sort by package size for better recommendations
        const sortedPackages = [...filteredPackages].sort((a, b) => (a.packageSize?.quantity || 0) - (b.packageSize?.quantity || 0));
        // ==========================================
        // STEP 3: Calculate total quantity needed
        // ==========================================
        const totalQuantity = request.sig.dose * request.sig.frequency * request.daysSupply;
        logger.info('Calculated total quantity', {
            dose: request.sig.dose,
            frequency: request.sig.frequency,
            daysSupply: request.daysSupply,
            totalQuantity,
        });
        explanations.push({
            step: 'calculation',
            description: `Calculated total quantity: ${totalQuantity} ${request.sig.unit}`,
            details: {
                formula: `${request.sig.dose} ${request.sig.unit} × ${request.sig.frequency} times/day × ${request.daysSupply} days`,
                result: totalQuantity,
            },
        });
        // ==========================================
        // STEP 4: Select optimal package(s)
        // ==========================================
        let recommendedPackages = [];
        let overfillPercentage = 0;
        let underfillPercentage = 0;
        // Simple package selection algorithm (can be enhanced with AI)
        let remainingQuantity = totalQuantity;
        const selectedPackages = [];
        // Try to find exact match first
        const exactMatch = sortedPackages.find((pkg) => pkg.packageSize.quantity === totalQuantity);
        if (exactMatch) {
            selectedPackages.push(exactMatch);
            remainingQuantity = 0;
            explanations.push({
                step: 'package_selection',
                description: `Found exact match: ${exactMatch.packageSize.quantity} ${exactMatch.packageSize.unit} package`,
                details: { ndc: exactMatch.ndc },
            });
        }
        else {
            // Use largest packages that don't exceed total by more than 20%
            const sortedDesc = [...sortedPackages].sort((a, b) => b.packageSize.quantity - a.packageSize.quantity);
            for (const pkg of sortedDesc) {
                if (remainingQuantity <= 0)
                    break;
                // Add package if it helps fulfill the prescription
                if (pkg.packageSize.quantity <= remainingQuantity * 1.2) {
                    selectedPackages.push(pkg);
                    remainingQuantity -= pkg.packageSize.quantity;
                }
            }
            // If still not enough, add smallest package to fulfill
            if (remainingQuantity > 0) {
                const smallestPackage = sortedPackages[0];
                if (smallestPackage) {
                    selectedPackages.push(smallestPackage);
                    remainingQuantity -= smallestPackage.packageSize.quantity;
                }
            }
            explanations.push({
                step: 'package_selection',
                description: `Selected ${selectedPackages.length} package(s) to fulfill prescription`,
                details: {
                    packages: selectedPackages.map((p) => ({
                        ndc: p.ndc,
                        size: p.packageSize.quantity,
                    })),
                },
            });
        }
        // Calculate total dispensed quantity
        const totalDispensed = selectedPackages.reduce((sum, pkg) => sum + pkg.packageSize.quantity, 0);
        // Calculate overfill/underfill
        if (totalDispensed > totalQuantity) {
            overfillPercentage = ((totalDispensed - totalQuantity) / totalQuantity) * 100;
        }
        else if (totalDispensed < totalQuantity) {
            underfillPercentage = ((totalQuantity - totalDispensed) / totalQuantity) * 100;
        }
        // Add warnings for significant over/underfill
        if (overfillPercentage > 10) {
            warnings.push(`Overfill of ${overfillPercentage.toFixed(1)}% (dispensing ${totalDispensed} vs ${totalQuantity} needed)`);
        }
        if (underfillPercentage > 5) {
            warnings.push(`Underfill of ${underfillPercentage.toFixed(1)}% (dispensing ${totalDispensed} vs ${totalQuantity} needed)`);
        }
        // Format recommendations
        recommendedPackages = selectedPackages.map((pkg) => ({
            ndc: pkg.ndc,
            packageSize: pkg.packageSize.quantity,
            unit: pkg.packageSize.unit,
            dosageForm: pkg.dosageForm,
            marketingStatus: String(pkg.marketingStatus),
            isActive: pkg.marketingStatus === 'ACTIVE',
        }));
        // ==========================================
        // STEP 5: Format and return response
        // ==========================================
        const executionTime = Date.now() - startTime;
        logger.info('Calculation completed successfully', {
            rxcui,
            totalQuantity,
            recommendedPackages: recommendedPackages.length,
            executionTime,
        });
        const response = {
            success: true,
            data: {
                drug: {
                    rxcui,
                    name: drugName,
                    dosageForm,
                    strength,
                },
                totalQuantity,
                recommendedPackages,
                overfillPercentage: parseFloat(overfillPercentage.toFixed(2)),
                underfillPercentage: parseFloat(underfillPercentage.toFixed(2)),
                warnings,
                excluded: excluded.length > 0 ? excluded : undefined,
                explanations,
            },
        };
        res.status(200).json(response);
    }
    catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('Calculation failed', error, {
            request,
            executionTime,
        });
        const response = {
            success: false,
            error: {
                code: error.code || 'CALCULATION_ERROR',
                message: error.message || 'Failed to calculate NDC packages',
                details: { executionTime },
            },
        };
        res.status(500).json(response);
    }
}
//# sourceMappingURL=calculate.js.map