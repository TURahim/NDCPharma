"use strict";
/**
 * OpenFDA Client Package
 * Public API for FDA NDC Directory integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateNDCDetailsCache = exports.invalidateNDCLookupCache = exports.initFDACache = exports.cachedFdaClient = exports.CachedFDAClient = exports.sortByPackageSize = exports.filterActivePackages = exports.filterByDosageForm = exports.fdaClient = exports.FDAClient = void 0;
const fdaService_1 = require("./internal/fdaService");
const fdaMapper_1 = require("./internal/fdaMapper");
const _domain_ndc_1 = require("@domain-ndc");
/**
 * FDA Client
 * Public façade for FDA NDC Directory API
 */
class FDAClient {
    constructor(config) {
        this.service = config ? new fdaService_1.FDAService(config) : fdaService_1.fdaService;
    }
    /**
     * Get NDC packages by RxCUI
     * Returns all NDC packages associated with a given RxCUI
     *
     * @param rxcui RxNorm Concept Unique Identifier
     * @param options Search options (limit, skip, activeOnly, dosageForm)
     * @returns Array of NDC packages
     *
     * @example
     * ```typescript
     * const packages = await fdaClient.getNDCsByRxCUI('104377', {
     *   activeOnly: true,
     *   dosageForm: 'TABLET'
     * });
     * ```
     */
    async getNDCsByRxCUI(rxcui, options = {}) {
        const response = await this.service.searchByRxCUI(rxcui, {
            limit: options.limit,
            skip: options.skip,
        });
        if (!response.results || response.results.length === 0) {
            return [];
        }
        // Map all FDA results to NDC packages
        let packages = [];
        for (const result of response.results) {
            const mapped = (0, fdaMapper_1.mapFDAResultToNDCPackage)(result);
            packages.push(...mapped);
        }
        // Apply filters
        if (options.activeOnly) {
            packages = (0, fdaMapper_1.filterActivePackages)(packages);
        }
        if (options.dosageForm) {
            packages = (0, fdaMapper_1.filterByDosageForm)(packages, options.dosageForm);
        }
        return (0, fdaMapper_1.sortByPackageSize)(packages);
    }
    /**
     * Get NDC details by package NDC
     * Returns detailed information for a specific NDC package
     *
     * @param packageNdc Package NDC (11-digit format)
     * @returns NDC details or null if not found
     *
     * @example
     * ```typescript
     * const details = await fdaClient.getNDCDetails('00071-0156-23');
     * if (details) {
     *   console.log(`${details.genericName} - ${details.packageSize.quantity} ${details.packageSize.unit}`);
     * }
     * ```
     */
    async getNDCDetails(packageNdc) {
        // Validate NDC format
        const validation = (0, _domain_ndc_1.validateNDCFormat)(packageNdc);
        if (!validation.isValid || !validation.normalizedNdc) {
            throw new Error(`Invalid NDC format: ${validation.errors.join(', ')}`);
        }
        const response = await this.service.searchByPackageNDC(validation.normalizedNdc);
        if (!response.results || response.results.length === 0) {
            return null;
        }
        // Return details from the first result
        return (0, fdaMapper_1.mapFDAResultToNDCDetails)(response.results[0]);
    }
    /**
     * Validate NDC code
     * Checks both format and FDA database status
     *
     * @param ndc NDC code to validate
     * @returns Validation result with status
     *
     * @example
     * ```typescript
     * const validation = await fdaClient.validateNDC('00071-0156-23');
     * if (validation.isValid && validation.isActive) {
     *   console.log('NDC is valid and active');
     * } else {
     *   console.log('Errors:', validation.errors);
     *   console.log('Warnings:', validation.warnings);
     * }
     * ```
     */
    async validateNDC(ndc) {
        // First validate format
        const formatValidation = (0, _domain_ndc_1.validateNDCFormat)(ndc);
        if (!formatValidation.isValid) {
            return formatValidation;
        }
        // Try to get details from FDA
        try {
            const details = await this.getNDCDetails(ndc);
            if (!details) {
                return {
                    ...formatValidation,
                    warnings: [...formatValidation.warnings, 'NDC not found in FDA database'],
                };
            }
            // Validate with marketing status
            return (0, _domain_ndc_1.validateNDCWithStatus)(ndc, details.marketingStatus);
        }
        catch (error) {
            // If FDA lookup fails, return format validation only
            return {
                ...formatValidation,
                warnings: [
                    ...formatValidation.warnings,
                    'Unable to verify NDC status in FDA database',
                ],
            };
        }
    }
    /**
     * Search NDCs by generic name
     * Returns all NDC packages for drugs with the given generic name
     *
     * @param genericName Generic drug name
     * @param options Search options
     * @returns Array of NDC packages
     *
     * @example
     * ```typescript
     * const packages = await fdaClient.searchByGenericName('lisinopril', {
     *   activeOnly: true,
     *   limit: 50
     * });
     * ```
     */
    async searchByGenericName(genericName, options = {}) {
        const response = await this.service.searchByGenericName(genericName, {
            limit: options.limit,
            skip: options.skip,
        });
        if (!response.results || response.results.length === 0) {
            return [];
        }
        // Map all FDA results to NDC packages
        let packages = [];
        for (const result of response.results) {
            const mapped = (0, fdaMapper_1.mapFDAResultToNDCPackage)(result);
            packages.push(...mapped);
        }
        // Apply filters
        if (options.activeOnly) {
            packages = (0, fdaMapper_1.filterActivePackages)(packages);
        }
        if (options.dosageForm) {
            packages = (0, fdaMapper_1.filterByDosageForm)(packages, options.dosageForm);
        }
        return (0, fdaMapper_1.sortByPackageSize)(packages);
    }
    /**
     * Get available dosage forms for a drug
     * Returns unique dosage forms for all packages of a given RxCUI
     *
     * @param rxcui RxNorm Concept Unique Identifier
     * @returns Array of dosage forms
     *
     * @example
     * ```typescript
     * const forms = await fdaClient.getDosageForms('104377');
     * console.log('Available forms:', forms); // ['TABLET', 'CAPSULE']
     * ```
     */
    async getDosageForms(rxcui) {
        const packages = await this.getNDCsByRxCUI(rxcui, { activeOnly: true });
        const forms = new Set();
        for (const pkg of packages) {
            forms.add(pkg.dosageForm);
        }
        return Array.from(forms).sort();
    }
    /**
     * Get package sizes for a specific dosage form
     * Returns available package sizes grouped by dosage form
     *
     * @param rxcui RxNorm Concept Unique Identifier
     * @param dosageForm Dosage form to filter by
     * @returns Array of package sizes
     *
     * @example
     * ```typescript
     * const sizes = await fdaClient.getPackageSizes('104377', 'TABLET');
     * console.log('Available sizes:', sizes); // [30, 60, 90, 100]
     * ```
     */
    async getPackageSizes(rxcui, dosageForm) {
        let packages = await this.getNDCsByRxCUI(rxcui, { activeOnly: true });
        if (dosageForm) {
            packages = (0, fdaMapper_1.filterByDosageForm)(packages, dosageForm);
        }
        const sizes = new Set();
        for (const pkg of packages) {
            sizes.add(pkg.packageSize.quantity);
        }
        return Array.from(sizes).sort((a, b) => a - b);
    }
    /**
     * Get NDC packages by batch list of NDC codes
     * Returns detailed package information for each NDC
     *
     * @param ndcList Array of NDC codes
     * @param options Search options (activeOnly, dosageForm)
     * @returns Array of NDC packages
     *
     * @example
     * ```typescript
     * const ndcs = ['00071-0156-23', '00071-0156-34'];
     * const packages = await fdaClient.getPackagesByNdcList(ndcs, { activeOnly: true });
     * ```
     */
    async getPackagesByNdcList(ndcList, options = {}) {
        if (!ndcList || ndcList.length === 0) {
            return [];
        }
        const allPackages = [];
        // Fetch details for each NDC
        for (const ndc of ndcList) {
            try {
                const details = await this.getNDCDetails(ndc);
                if (details) {
                    // Convert NDCDetails to NDCPackage format
                    const pkg = {
                        ndc: details.ndc,
                        packageSize: details.packageSize,
                        dosageForm: details.dosageForm,
                        marketingStatus: details.marketingStatus,
                        labelerName: details.labelerName,
                        productNdc: details.productNdc,
                        genericName: details.genericName,
                        brandName: details.brandName,
                        activeIngredients: details.activeIngredients,
                    };
                    allPackages.push(pkg);
                }
            }
            catch (error) {
                // Skip NDCs that fail to fetch (may be invalid or not in FDA database)
                continue;
            }
        }
        // Apply filters
        let packages = allPackages;
        if (options.activeOnly) {
            packages = (0, fdaMapper_1.filterActivePackages)(packages);
        }
        if (options.dosageForm) {
            packages = (0, fdaMapper_1.filterByDosageForm)(packages, options.dosageForm);
        }
        return (0, fdaMapper_1.sortByPackageSize)(packages);
    }
}
exports.FDAClient = FDAClient;
// Export singleton instance
exports.fdaClient = new FDAClient();
// Export utility functions
var fdaMapper_2 = require("./internal/fdaMapper");
Object.defineProperty(exports, "filterByDosageForm", { enumerable: true, get: function () { return fdaMapper_2.filterByDosageForm; } });
Object.defineProperty(exports, "filterActivePackages", { enumerable: true, get: function () { return fdaMapper_2.filterActivePackages; } });
Object.defineProperty(exports, "sortByPackageSize", { enumerable: true, get: function () { return fdaMapper_2.sortByPackageSize; } });
// Export cached client (requires Firestore initialization)
var cachedClient_1 = require("./cachedClient");
Object.defineProperty(exports, "CachedFDAClient", { enumerable: true, get: function () { return cachedClient_1.CachedFDAClient; } });
Object.defineProperty(exports, "cachedFdaClient", { enumerable: true, get: function () { return cachedClient_1.cachedFdaClient; } });
Object.defineProperty(exports, "initFDACache", { enumerable: true, get: function () { return cachedClient_1.initFDACache; } });
Object.defineProperty(exports, "invalidateNDCLookupCache", { enumerable: true, get: function () { return cachedClient_1.invalidateNDCLookupCache; } });
Object.defineProperty(exports, "invalidateNDCDetailsCache", { enumerable: true, get: function () { return cachedClient_1.invalidateNDCDetailsCache; } });
