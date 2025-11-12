/**
 * FDA Data Mapper
 * Transforms FDA API responses to internal domain models
 */

import { logger } from '@core-guardrails';
import type {
  FDANDCResult,
  FDAPackaging,
  NDCPackage,
  PackageSize,
  ActiveIngredient,
  MarketingStatus,
  NDCDetails,
} from './fdaTypes';

/**
 * Map FDA NDC result to internal NDC package model
 * @param fdaResult FDA API result
 * @returns Normalized NDC package
 */
export function mapFDAResultToNDCPackage(fdaResult: FDANDCResult): NDCPackage[] {
  const packages: NDCPackage[] = [];

  // Process each package in the FDA result
  for (const packaging of fdaResult.packaging || []) {
    try {
      const ndcPackage: NDCPackage = {
        ndc: normalizeNDC(packaging.package_ndc),
        productNdc: fdaResult.product_ndc,
        genericName: fdaResult.generic_name,
        brandName: fdaResult.brand_name || fdaResult.brand_name_base,
        dosageForm: normalizeDosageForm(fdaResult.dosage_form),
        route: fdaResult.route || [],
        packageSize: parsePackageSize(packaging.description),
        activeIngredients: mapActiveIngredients(fdaResult.active_ingredients),
        marketingStatus: parseMarketingStatus(packaging),
        labeler: fdaResult.labeler_name,
        rxcui: extractRxCUI(fdaResult.openfda),
        listingExpirationDate: parseFDADate(fdaResult.listing_expiration_date),
      };

      packages.push(ndcPackage);
    } catch (error) {
      logger.warn(`Failed to map FDA package: ${packaging.package_ndc}`, {
        error: error as Error,
        packageNdc: packaging.package_ndc,
        productNdc: fdaResult.product_ndc,
      });
    }
  }

  return packages;
}

/**
 * Map FDA result to detailed NDC information
 * @param fdaResult FDA API result
 * @returns NDC details with extended information
 */
export function mapFDAResultToNDCDetails(fdaResult: FDANDCResult): NDCDetails | null {
  try {
    // Get the first package as the primary package
    const primaryPackaging = fdaResult.packaging?.[0];
    if (!primaryPackaging) {
      logger.warn('FDA result has no packaging information', {
        productNdc: fdaResult.product_ndc,
      });
      return null;
    }

    const allPackages = (fdaResult.packaging || []).map((pkg) => 
      parsePackageSize(pkg.description)
    );

    const details: NDCDetails = {
      ndc: normalizeNDC(primaryPackaging.package_ndc),
      productNdc: fdaResult.product_ndc,
      genericName: fdaResult.generic_name,
      brandName: fdaResult.brand_name || fdaResult.brand_name_base,
      dosageForm: normalizeDosageForm(fdaResult.dosage_form),
      route: fdaResult.route || [],
      packageSize: parsePackageSize(primaryPackaging.description),
      activeIngredients: mapActiveIngredients(fdaResult.active_ingredients),
      marketingStatus: parseMarketingStatus(primaryPackaging),
      labeler: fdaResult.labeler_name,
      rxcui: extractRxCUI(fdaResult.openfda),
      listingExpirationDate: parseFDADate(fdaResult.listing_expiration_date),
      productType: fdaResult.product_type,
      marketingCategory: fdaResult.marketing_category,
      applicationNumber: fdaResult.openfda?.application_number?.[0],
      allPackages,
    };

    return details;
  } catch (error) {
    logger.error('Failed to map FDA result to NDC details', error as Error, {
      productNdc: fdaResult.product_ndc,
    });
    return null;
  }
}

/**
 * Parse package size from FDA description
 * Examples:
 * - "100 TABLET in 1 BOTTLE" → {quantity: 100, unit: "TABLET"}
 * - "30 mL in 1 BOTTLE" → {quantity: 30, unit: "ML"}
 * - "1 KIT" → {quantity: 1, unit: "KIT"}
 * - "2.5 mL in 1 VIAL" → {quantity: 2.5, unit: "ML"}
 * 
 * @param description Package description from FDA
 * @returns Parsed package size
 */
export function parsePackageSize(description: string): PackageSize {
  // Normalize description: uppercase and trim
  const normalized = description.toUpperCase().trim();

  // Pattern 1: "100 TABLET in 1 BOTTLE" or "30 mL in 1 BOTTLE"
  const pattern1 = /^(\d+(?:\.\d+)?)\s+([A-Z]+)\s+in\s+\d+/i;
  const match1 = normalized.match(pattern1);
  
  if (match1) {
    return {
      quantity: parseFloat(match1[1]),
      unit: normalizeUnit(match1[2]),
      description,
    };
  }

  // Pattern 2: "1 KIT" or "100 TABLET"
  const pattern2 = /^(\d+(?:\.\d+)?)\s+([A-Z]+)$/i;
  const match2 = normalized.match(pattern2);
  
  if (match2) {
    return {
      quantity: parseFloat(match2[1]),
      unit: normalizeUnit(match2[2]),
      description,
    };
  }

  // Pattern 3: Extract first number and last word as fallback
  const numberMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  const unitMatch = normalized.match(/\b([A-Z]+)\b(?!.*\b[A-Z]+\b)/i);
  
  if (numberMatch && unitMatch) {
    return {
      quantity: parseFloat(numberMatch[1]),
      unit: normalizeUnit(unitMatch[1]),
      description,
    };
  }

  // Default: Unable to parse
  logger.warn(`Unable to parse package size: "${description}"`);
  return {
    quantity: 1,
    unit: 'UNKNOWN',
    description,
  };
}

/**
 * Normalize unit strings to standard format
 * @param unit Raw unit string
 * @returns Normalized unit
 */
export function normalizeUnit(unit: string): string {
  const normalized = unit.toUpperCase().trim();
  
  // Common unit mappings
  const unitMappings: Record<string, string> = {
    'TABLET': 'TABLET',
    'TABLETS': 'TABLET',
    'CAPSULE': 'CAPSULE',
    'CAPSULES': 'CAPSULE',
    'ML': 'ML',
    'MILLILITER': 'ML',
    'MILLILITERS': 'ML',
    'L': 'L',
    'LITER': 'L',
    'LITERS': 'L',
    'GM': 'GM',
    'GRAM': 'GM',
    'GRAMS': 'GM',
    'MG': 'MG',
    'MILLIGRAM': 'MG',
    'MILLIGRAMS': 'MG',
    'MCG': 'MCG',
    'MICROGRAM': 'MCG',
    'MICROGRAMS': 'MCG',
    'UNIT': 'UNIT',
    'UNITS': 'UNIT',
    'KIT': 'KIT',
    'KITS': 'KIT',
    'PATCH': 'PATCH',
    'PATCHES': 'PATCH',
    'VIAL': 'VIAL',
    'VIALS': 'VIAL',
    'BOTTLE': 'BOTTLE',
    'BOTTLES': 'BOTTLE',
    'BLISTER': 'BLISTER',
    'BLISTERS': 'BLISTER',
    'SYRINGE': 'SYRINGE',
    'SYRINGES': 'SYRINGE',
    'INHALER': 'INHALER',
    'INHALERS': 'INHALER',
    'SUPPOSITORY': 'SUPPOSITORY',
    'SUPPOSITORIES': 'SUPPOSITORY',
  };

  return unitMappings[normalized] || normalized;
}

/**
 * Normalize NDC to 11-digit format with dashes (XXXXX-XXXX-XX)
 * @param ndc Raw NDC string
 * @returns Normalized NDC
 */
export function normalizeNDC(ndc: string): string {
  // Remove all non-numeric characters
  const digits = ndc.replace(/\D/g, '');

  // Ensure 11 digits (pad with leading zeros if necessary)
  const padded = digits.padStart(11, '0');

  // Format as XXXXX-XXXX-XX
  return `${padded.slice(0, 5)}-${padded.slice(5, 9)}-${padded.slice(9, 11)}`;
}

/**
 * Normalize dosage form to standard format
 * @param dosageForm Raw dosage form string
 * @returns Normalized dosage form
 */
export function normalizeDosageForm(dosageForm: string): string {
  return dosageForm.toUpperCase().trim();
}

/**
 * Map FDA active ingredients to internal model
 * @param ingredients FDA active ingredients
 * @returns Normalized active ingredients
 */
export function mapActiveIngredients(
  ingredients: Array<{ name: string; strength: string }>
): ActiveIngredient[] {
  return ingredients.map((ing) => ({
    name: ing.name,
    strength: ing.strength,
  }));
}

/**
 * Parse marketing status from FDA packaging
 * @param packaging FDA packaging information
 * @returns Marketing status
 */
export function parseMarketingStatus(packaging: FDAPackaging): MarketingStatus {
  const hasStartDate = !!packaging.marketing_start_date;
  const hasEndDate = !!packaging.marketing_end_date;

  const startDate = parseFDADate(packaging.marketing_start_date);
  const endDate = parseFDADate(packaging.marketing_end_date);

  // Determine status
  let status: 'active' | 'discontinued' | 'expired' | 'unknown';
  let isActive: boolean;

  if (hasEndDate) {
    status = 'discontinued';
    isActive = false;
  } else if (hasStartDate) {
    status = 'active';
    isActive = true;
  } else {
    status = 'unknown';
    isActive = false;
  }

  return {
    isActive,
    startDate,
    endDate,
    status,
  };
}

/**
 * Parse FDA date (YYYYMMDD) to ISO 8601 format
 * @param fdaDate FDA date string (YYYYMMDD)
 * @returns ISO 8601 date string or undefined
 */
export function parseFDADate(fdaDate?: string): string | undefined {
  if (!fdaDate || fdaDate.length !== 8) {
    return undefined;
  }

  const year = fdaDate.slice(0, 4);
  const month = fdaDate.slice(4, 6);
  const day = fdaDate.slice(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Extract RxCUI from OpenFDA metadata
 * @param openfda OpenFDA metadata
 * @returns First RxCUI or undefined
 */
export function extractRxCUI(openfda: any): string | undefined {
  return openfda?.rxcui?.[0];
}

/**
 * Filter NDC packages by dosage form
 * @param packages Array of NDC packages
 * @param dosageForm Desired dosage form (e.g., "TABLET", "CAPSULE")
 * @returns Filtered packages
 */
export function filterByDosageForm(
  packages: NDCPackage[],
  dosageForm: string
): NDCPackage[] {
  const normalizedForm = normalizeDosageForm(dosageForm);
  return packages.filter((pkg) => pkg.dosageForm === normalizedForm);
}

/**
 * Filter NDC packages by active status
 * @param packages Array of NDC packages
 * @returns Only active packages
 */
export function filterActivePackages(packages: NDCPackage[]): NDCPackage[] {
  return packages.filter((pkg) => pkg.marketingStatus.isActive);
}

/**
 * Sort NDC packages by package size (ascending)
 * @param packages Array of NDC packages
 * @returns Sorted packages
 */
export function sortByPackageSize(packages: NDCPackage[]): NDCPackage[] {
  return [...packages].sort((a, b) => a.packageSize.quantity - b.packageSize.quantity);
}

/**
 * Group NDC packages by dosage form
 * @param packages Array of NDC packages
 * @returns Map of dosage form to packages
 */
export function groupByDosageForm(
  packages: NDCPackage[]
): Map<string, NDCPackage[]> {
  const grouped = new Map<string, NDCPackage[]>();

  for (const pkg of packages) {
    const form = pkg.dosageForm;
    if (!grouped.has(form)) {
      grouped.set(form, []);
    }
    grouped.get(form)!.push(pkg);
  }

  return grouped;
}

