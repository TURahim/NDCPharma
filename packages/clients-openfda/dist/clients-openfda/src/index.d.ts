/**
 * OpenFDA Client Package
 * Public API for FDA NDC Directory integration
 */
import type { NDCPackage, NDCDetails, NDCValidationResult, FDAServiceConfig } from './internal/fdaTypes';
/**
 * FDA Client
 * Public façade for FDA NDC Directory API
 */
export declare class FDAClient {
    private service;
    constructor(config?: FDAServiceConfig);
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
    getNDCsByRxCUI(rxcui: string, options?: {
        limit?: number;
        skip?: number;
        activeOnly?: boolean;
        dosageForm?: string;
    }): Promise<NDCPackage[]>;
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
    getNDCDetails(packageNdc: string): Promise<NDCDetails | null>;
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
    validateNDC(ndc: string): Promise<NDCValidationResult>;
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
    searchByGenericName(genericName: string, options?: {
        limit?: number;
        skip?: number;
        activeOnly?: boolean;
        dosageForm?: string;
    }): Promise<NDCPackage[]>;
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
    getDosageForms(rxcui: string): Promise<string[]>;
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
    getPackageSizes(rxcui: string, dosageForm?: string): Promise<number[]>;
}
export declare const fdaClient: FDAClient;
export type { NDCPackage, NDCDetails, NDCValidationResult, FDAServiceConfig, PackageSize, ActiveIngredient, MarketingStatus, } from './internal/fdaTypes';
export { filterByDosageForm, filterActivePackages, sortByPackageSize, } from './internal/fdaMapper';
export { CachedFDAClient, cachedFdaClient, initFDACache, invalidateNDCLookupCache, invalidateNDCDetailsCache, } from './cachedClient';
