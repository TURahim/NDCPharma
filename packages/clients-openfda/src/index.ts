/**
 * OpenFDA Client Package
 * Public API for FDA NDC Directory integration
 */

import { fdaService, FDAService } from './internal/fdaService';
import { 
  mapFDAResultToNDCPackage, 
  mapFDAResultToNDCDetails,
  filterByDosageForm,
  filterActivePackages,
  sortByPackageSize,
} from './internal/fdaMapper';
import { validateNDCFormat, validateNDCWithStatus } from '@domain-ndc';
import type { 
  NDCPackage, 
  NDCDetails, 
  NDCValidationResult,
  FDAServiceConfig,
} from './internal/fdaTypes';

/**
 * FDA Client
 * Public façade for FDA NDC Directory API
 */
export class FDAClient {
  private service: FDAService;

  constructor(config?: FDAServiceConfig) {
    this.service = config ? new FDAService(config) : fdaService;
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
  async getNDCsByRxCUI(
    rxcui: string,
    options: {
      limit?: number;
      skip?: number;
      activeOnly?: boolean;
      dosageForm?: string;
    } = {}
  ): Promise<NDCPackage[]> {
    const response = await this.service.searchByRxCUI(rxcui, {
      limit: options.limit,
      skip: options.skip,
    });

    if (!response.results || response.results.length === 0) {
      return [];
    }

    // Map all FDA results to NDC packages
    let packages: NDCPackage[] = [];
    for (const result of response.results) {
      const mapped = mapFDAResultToNDCPackage(result);
      packages.push(...mapped);
    }

    // Apply filters
    if (options.activeOnly) {
      packages = filterActivePackages(packages);
    }

    if (options.dosageForm) {
      packages = filterByDosageForm(packages, options.dosageForm);
    }

    return sortByPackageSize(packages);
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
  async getNDCDetails(packageNdc: string): Promise<NDCDetails | null> {
    // Validate NDC format
    const validation = validateNDCFormat(packageNdc);
    if (!validation.isValid || !validation.normalizedNdc) {
      throw new Error(`Invalid NDC format: ${validation.errors.join(', ')}`);
    }

    const response = await this.service.searchByPackageNDC(validation.normalizedNdc);

    if (!response.results || response.results.length === 0) {
      return null;
    }

    // Return details from the first result
    return mapFDAResultToNDCDetails(response.results[0]);
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
  async validateNDC(ndc: string): Promise<NDCValidationResult> {
    // First validate format
    const formatValidation = validateNDCFormat(ndc);
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
      return validateNDCWithStatus(ndc, details.marketingStatus);
    } catch (error) {
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
  async searchByGenericName(
    genericName: string,
    options: {
      limit?: number;
      skip?: number;
      activeOnly?: boolean;
      dosageForm?: string;
    } = {}
  ): Promise<NDCPackage[]> {
    const response = await this.service.searchByGenericName(genericName, {
      limit: options.limit,
      skip: options.skip,
    });

    if (!response.results || response.results.length === 0) {
      return [];
    }

    // Map all FDA results to NDC packages
    let packages: NDCPackage[] = [];
    for (const result of response.results) {
      const mapped = mapFDAResultToNDCPackage(result);
      packages.push(...mapped);
    }

    // Apply filters
    if (options.activeOnly) {
      packages = filterActivePackages(packages);
    }

    if (options.dosageForm) {
      packages = filterByDosageForm(packages, options.dosageForm);
    }

    return sortByPackageSize(packages);
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
  async getDosageForms(rxcui: string): Promise<string[]> {
    const packages = await this.getNDCsByRxCUI(rxcui, { activeOnly: true });
    const forms = new Set<string>();
    
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
  async getPackageSizes(rxcui: string, dosageForm?: string): Promise<number[]> {
    let packages = await this.getNDCsByRxCUI(rxcui, { activeOnly: true });
    
    if (dosageForm) {
      packages = filterByDosageForm(packages, dosageForm);
    }
    
    const sizes = new Set<number>();
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
  async getPackagesByNdcList(
    ndcList: string[],
    options: {
      activeOnly?: boolean;
      dosageForm?: string;
    } = {}
  ): Promise<NDCPackage[]> {
    if (!ndcList || ndcList.length === 0) {
      return [];
    }

    const allPackages: NDCPackage[] = [];

    // Fetch details for each NDC
    for (const ndc of ndcList) {
      try {
        const details = await this.getNDCDetails(ndc);
        if (details) {
          // Convert NDCDetails to NDCPackage format
          const pkg: NDCPackage = {
            ndc: details.ndc,
            packageSize: details.packageSize,
            dosageForm: details.dosageForm,
            marketingStatus: details.marketingStatus,
            productNdc: details.productNdc,
            genericName: details.genericName,
            brandName: details.brandName,
            activeIngredients: details.activeIngredients,
          };
          allPackages.push(pkg);
        }
      } catch (error) {
        // Skip NDCs that fail to fetch (may be invalid or not in FDA database)
        continue;
      }
    }

    // Apply filters
    let packages = allPackages;
    
    if (options.activeOnly) {
      packages = filterActivePackages(packages);
    }

    if (options.dosageForm) {
      packages = filterByDosageForm(packages, options.dosageForm);
    }

    return sortByPackageSize(packages);
  }
}

// Export singleton instance
export const fdaClient = new FDAClient();

// Export types for external use
export type {
  NDCPackage,
  NDCDetails,
  NDCValidationResult,
  FDAServiceConfig,
  PackageSize,
  ActiveIngredient,
  MarketingStatus,
} from './internal/fdaTypes';

// Export utility functions
export {
  filterByDosageForm,
  filterActivePackages,
  sortByPackageSize,
} from './internal/fdaMapper';

// Export cached client (requires Firestore initialization)
export {
  CachedFDAClient,
  cachedFdaClient,
  initFDACache,
  invalidateNDCLookupCache,
  invalidateNDCDetailsCache,
} from './cachedClient';
